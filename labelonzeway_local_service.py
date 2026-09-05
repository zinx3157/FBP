#!/usr/bin/env python3
"""LabelOnZeWay Wi-Fi Gateway.

Hosts the LabelOnZeWay mobile web app on the local network and forwards
ESC/POS bytes to a private-network thermal printer. Uses only Python's
standard library; no vendor driver or Python package is required.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import ipaddress
import json
import mimetypes
import os
import socket
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

GATEWAY_HOST = "0.0.0.0"
GATEWAY_PORT = 8765
MAX_BODY = 16 * 1024 * 1024
VERSION = "V2.0.1"
APP_DIR = Path(__file__).resolve().parent / "labelonzeway"
TRACKING_FILE = Path(__file__).resolve().parent / "tracking-public.json"
SYNC_CONFIG_FILE = APP_DIR / "sync-config.json"
CLOUD_AGENT_CONFIG_FILE = Path(__file__).resolve().parent / "cloud-print-agent.json"
TRACKING_LOCK = threading.Lock()
GATEWAY_CONFIG_FILE = Path(__file__).resolve().parent / "gateway-config.json"
GATEWAY_SECURITY_FILE = Path(__file__).resolve().parent / "gateway-security.json"


def gateway_config() -> dict:
    try:
        value = json.loads(GATEWAY_CONFIG_FILE.read_text(encoding="utf-8"))
        value = value if isinstance(value, dict) else {}
    except (OSError, ValueError, TypeError):
        value = {}
    try:
        secure = json.loads(GATEWAY_SECURITY_FILE.read_text(encoding="utf-8"))
        if isinstance(secure, dict):
            value.update(secure)
    except (OSError, ValueError, TypeError):
        pass
    return value


def allowed_printer() -> tuple[str, int]:
    config = gateway_config()
    return (str(config.get("printer_ip", "192.168.100.73")).strip(),
            int(config.get("printer_port", 9100)))

mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("application/javascript", ".js")


def resolved_private(host: str, port: int) -> tuple[str, int]:
    host = (host or "").strip()
    if not host or len(host) > 253:
        raise ValueError("Enter the printer IP address")
    if not 1 <= int(port) <= 65535:
        raise ValueError("Printer port must be between 1 and 65535")
    configured_host, configured_port = allowed_printer()
    if host != configured_host or int(port) != configured_port:
        raise ValueError(f"Printer target is not authorized; configured target is {configured_host}:{configured_port}")
    try:
        infos = socket.getaddrinfo(host, int(port), type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Cannot resolve printer address: {host}") from exc
    for info in infos:
        address = info[4][0].split("%", 1)[0]
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:
            continue
        if ip.is_private or ip.is_link_local or ip.is_loopback:
            return host, int(port)
    raise ValueError("For safety, the gateway only connects to private/local printer addresses")


def send_to_printer(host: str, port: int, payload: bytes) -> None:
    host, port = resolved_private(host, port)
    with socket.create_connection((host, port), timeout=5) as sock:
        sock.settimeout(30)
        sock.sendall(payload)
        try:
            sock.shutdown(socket.SHUT_WR)
        except OSError:
            pass


def json_request(url: str, method: str = "GET", headers: dict | None = None,
                 payload: dict | None = None, timeout: int = 20):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request_headers = {"Content-Type": "application/json"}
    request_headers.update(headers or {})
    request = Request(url, data=body, headers=request_headers, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {exc.code}: {detail[:500]}") from exc
    except URLError as exc:
        raise RuntimeError(f"Cloud connection failed: {exc.reason}") from exc


class CloudPrintAgent:
    """Authenticated Supabase queue consumer; no service-role secret is used."""

    def __init__(self, config: dict, sync_config: dict):
        self.workspace_id = str(config.get("workspace_id", "")).strip()
        self.email = str(config.get("email", "")).strip()
        self.default_ip = str(config.get("printer_ip", "192.168.100.73")).strip()
        self.default_port = int(config.get("printer_port", 9100))
        self.poll_seconds = max(1, min(30, int(config.get("poll_seconds", 2))))
        self.url = str(sync_config.get("supabaseUrl", "")).rstrip("/")
        self.anon_key = str(sync_config.get("supabaseAnonKey", ""))
        self.access_token = ""
        self.stop_event = threading.Event()
        if not self.workspace_id or not self.email or not self.url or not self.anon_key:
            raise ValueError("Cloud Print configuration is incomplete")

    def password(self) -> str:
        result = subprocess.run(
            ["/usr/bin/security", "find-generic-password", "-s", "LabelOnZeWayCloudPrint",
             "-a", self.email, "-w"], capture_output=True, text=True, timeout=10, check=False)
        if result.returncode != 0 or not result.stdout.strip():
            raise RuntimeError("Cloud password is missing from macOS Keychain; run SETUP-CLOUD-PRINT-AGENT.command")
        return result.stdout.strip()

    def login(self) -> None:
        result = json_request(
            self.url + "/auth/v1/token?grant_type=password", "POST",
            {"apikey": self.anon_key}, {"email": self.email, "password": self.password()})
        self.access_token = str((result or {}).get("access_token", ""))
        if not self.access_token:
            raise RuntimeError("Cloud sign-in did not return an access token")
        print(f"Cloud Print signed in as {self.email}")

    def headers(self, prefer: str = "return=representation") -> dict:
        if not self.access_token:
            self.login()
        return {"apikey": self.anon_key, "Authorization": "Bearer " + self.access_token,
                "Prefer": prefer}

    def rpc(self, name: str, payload: dict):
        try:
            return json_request(self.url + "/rest/v1/rpc/" + name, "POST", self.headers(), payload)
        except RuntimeError as exc:
            if "HTTP 401" not in str(exc):
                raise
            self.access_token = ""
            return json_request(self.url + "/rest/v1/rpc/" + name, "POST", self.headers(), payload)

    def update_job(self, job_id: str, values: dict) -> None:
        values["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        json_request(self.url + "/rest/v1/cloud_print_jobs?id=eq." + job_id, "PATCH",
                     self.headers("return=minimal"), values)

    def claim(self):
        rows = self.rpc("claim_cloud_print_job", {"p_workspace_id": self.workspace_id}) or []
        return rows[0] if isinstance(rows, list) and rows else None

    def run(self) -> None:
        print("Cloud Print agent starting…")
        while not self.stop_event.is_set():
            try:
                if not self.access_token:
                    self.login()
                    self.rpc("requeue_stale_cloud_print_jobs", {"p_workspace_id": self.workspace_id})
                    self.rpc("purge_old_cloud_print_jobs", {"p_workspace_id": self.workspace_id})
                job = self.claim()
                if not job:
                    self.stop_event.wait(self.poll_seconds)
                    continue
                job_id = str(job["id"])
                try:
                    payload = base64.b64decode(str(job.get("payload_base64", "")), validate=True)
                    if not payload or len(payload) > MAX_BODY:
                        raise ValueError("Empty or oversized cloud print payload")
                    host = str(job.get("printer_ip") or self.default_ip)
                    port = int(job.get("printer_port") or self.default_port)
                    # Move to a non-retryable state before bytes leave this Mac. If the
                    # final cloud update fails, an operator sees "uncertain" instead of
                    # the agent printing the same physical label again.
                    self.rpc("mark_cloud_print_sending", {"p_job_id": job_id})
                    send_to_printer(host, port, payload)
                    self.rpc("complete_cloud_print_job", {"p_job_id": job_id, "p_error": ""})
                    print(f"Cloud Print completed {job_id}: {len(payload):,} bytes to {host}:{port}")
                except Exception as exc:
                    try:
                        self.rpc("fail_cloud_print_job", {"p_job_id": job_id, "p_error": str(exc)[:1000]})
                    except Exception:
                        pass
                    print(f"Cloud Print failed {job_id}: {exc}")
            except Exception as exc:
                print(f"Cloud Print paused: {exc}")
                self.access_token = ""
                self.stop_event.wait(10)

    def stop(self) -> None:
        self.stop_event.set()


def start_cloud_print_agent():
    if not CLOUD_AGENT_CONFIG_FILE.is_file():
        print("Cloud Print agent: not configured (run SETUP-CLOUD-PRINT-AGENT.command)")
        return None, None
    try:
        config = json.loads(CLOUD_AGENT_CONFIG_FILE.read_text(encoding="utf-8"))
        sync_config = json.loads(SYNC_CONFIG_FILE.read_text(encoding="utf-8"))
        agent = CloudPrintAgent(config, sync_config)
        thread = threading.Thread(target=agent.run, name="cloud-print-agent", daemon=True)
        thread.start()
        return agent, thread
    except Exception as exc:
        print(f"Cloud Print agent could not start: {exc}")
        return None, None


def read_tracking_records() -> list[dict]:
    with TRACKING_LOCK:
        try:
            data = json.loads(TRACKING_FILE.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            return []
    return data if isinstance(data, list) else []


def write_tracking_records(records: list[dict]) -> None:
    payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
    temporary = TRACKING_FILE.with_suffix(".json.tmp")
    with TRACKING_LOCK:
        temporary.write_text(payload, encoding="utf-8")
        os.replace(temporary, TRACKING_FILE)


def local_ipv4_addresses() -> list[str]:
    found: set[str] = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127."):
                found.add(ip)
    except OSError:
        pass
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            if not ip.startswith("127."):
                found.add(ip)
    except OSError:
        pass
    return sorted(found)


class GatewayHandler(BaseHTTPRequestHandler):
    server_version = "LabelOnZeWayGateway/" + VERSION

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))
        sys.stdout.flush()

    def origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        if not origin or origin == "null":
            return True
        try:
            parsed = urlparse(origin)
            host = parsed.hostname or ""
            if host in {"localhost", "127.0.0.1", "::1"}:
                return True
            for info in socket.getaddrinfo(host, None):
                raw = info[4][0].split("%", 1)[0]
                ip = ipaddress.ip_address(raw)
                if ip.is_private or ip.is_link_local or ip.is_loopback:
                    return True
        except Exception:
            return False
        return False

    def authorized(self) -> bool:
        secret = str(gateway_config().get("gateway_secret", "")).strip()
        if not secret:
            return False
        supplied = str(self.headers.get("X-LabelOnZeWay-Key", "")).strip()
        return hmac.compare_digest(supplied, secret)

    def cors(self) -> None:
        origin = self.headers.get("Origin")
        self.send_header("Access-Control-Allow-Origin", origin if origin else "*")
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-LabelOnZeWay-Key")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def json_response(self, status: int, data: dict) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        if self.origin_allowed():
            self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        if not self.origin_allowed():
            self.json_response(403, {"ok": False, "error": "Origin not allowed"})
            return
        self.send_response(204)
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def health(self, parsed) -> None:
        query = parse_qs(parsed.query)
        host = (query.get("host") or [""])[0]
        port_raw = (query.get("port") or ["9100"])[0]
        printer_ok = None
        printer_error = ""
        if host:
            try:
                host, port = resolved_private(host, int(port_raw))
                with socket.create_connection((host, port), timeout=2):
                    pass
                printer_ok = True
            except Exception as exc:
                printer_ok = False
                printer_error = str(exc)
        self.json_response(200, {
            "ok": True,
            "gateway": "LabelOnZeWay Wi-Fi Gateway",
            "version": VERSION,
            "printer_ok": printer_ok,
            "printer_error": printer_error,
        })

    def static_file(self, parsed) -> None:
        request_path = unquote(parsed.path)
        if request_path in {"/labelonzeway", "/labelonzeway/"}:
            rel = "index.html"
        elif request_path.startswith("/labelonzeway/"):
            rel = request_path[len("/labelonzeway/"):]
        else:
            rel = request_path.lstrip("/") or "index.html"
        candidate = (APP_DIR / rel).resolve()
        try:
            candidate.relative_to(APP_DIR)
        except ValueError:
            self.send_error(403)
            return
        if candidate.is_dir():
            candidate = candidate / "index.html"
        if not candidate.is_file() or candidate.name.startswith(".") or candidate.suffix in {".py", ".command", ".txt", ".zip"}:
            self.send_error(404)
            return
        body = candidate.read_bytes()
        content_type = mimetypes.guess_type(str(candidate))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type + ("; charset=utf-8" if content_type.startswith("text/") or content_type in {"application/javascript", "application/manifest+json"} else ""))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        if candidate.name in {"index.html", "service-worker.js", "manifest.webmanifest"}:
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self.send_response(302)
            self.send_header("Location", "/labelonzeway/")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if parsed.path in {"/api/health", "/health"}:
            if not self.origin_allowed():
                self.json_response(403, {"ok": False, "error": "Origin not allowed"})
                return
            self.health(parsed)
            return
        if parsed.path in {"/api/tracking", "/tracking-api"}:
            token = (parse_qs(parsed.query).get("token") or [""])[0].strip()
            if not token or len(token) > 200:
                self.json_response(400, {"ok": False, "error": "Tracking token is required"})
                return
            record = next((row for row in read_tracking_records() if row.get("token") == token), None)
            if not record:
                self.json_response(404, {"ok": False, "error": "Tracking link not found"})
                return
            self.json_response(200, {"ok": True, "parcel": record.get("public", {})})
            return
        self.static_file(parsed)

    def do_POST(self) -> None:  # noqa: N802
        if not self.origin_allowed():
            self.json_response(403, {"ok": False, "error": "Origin not allowed"})
            return
        request_path = urlparse(self.path).path
        if not self.authorized():
            self.json_response(401, {"ok": False, "error": "Gateway pairing key required"})
            return
        if request_path == "/api/tracking/sync":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 4 * 1024 * 1024:
                    raise ValueError("Invalid or oversized tracking payload")
                request = json.loads(self.rfile.read(length).decode("utf-8"))
                records = request.get("records")
                if not isinstance(records, list) or len(records) > 10000:
                    raise ValueError("Tracking records are invalid")
                clean = []
                allowed = {"orderNumber", "status", "milestone", "deliveryProcessDate", "lastUpdate", "podAvailable"}
                seen = set()
                for row in records:
                    token = str((row or {}).get("token", "")).strip()
                    public = (row or {}).get("public")
                    if not token or len(token) > 200 or token in seen or not isinstance(public, dict):
                        raise ValueError("Tracking record is invalid")
                    seen.add(token)
                    clean.append({"token": token, "public": {key: public.get(key) for key in allowed}})
                write_tracking_records(clean)
                self.json_response(200, {"ok": True, "records": len(clean)})
            except (ValueError, TypeError, json.JSONDecodeError) as exc:
                self.json_response(400, {"ok": False, "error": str(exc)})
            except OSError as exc:
                self.json_response(500, {"ok": False, "error": f"Tracking storage failed: {exc}"})
            return
        if request_path not in {"/api/print", "/print"}:
            self.json_response(404, {"ok": False, "error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                raise ValueError("Invalid or oversized print request")
            request = json.loads(self.rfile.read(length).decode("utf-8"))
            host = str(request.get("printer_ip", ""))
            port = int(request.get("printer_port", 9100))
            encoded = request.get("data", "")
            if not isinstance(encoded, str):
                raise ValueError("Invalid ESC/POS payload")
            try:
                payload = base64.b64decode(encoded, validate=True)
            except (binascii.Error, ValueError) as exc:
                raise ValueError("Invalid base64 print data") from exc
            if not payload or len(payload) > MAX_BODY:
                raise ValueError("Empty or oversized ESC/POS payload")
            send_to_printer(host, port, payload)
            self.json_response(200, {
                "ok": True,
                "bytes_sent": len(payload),
                "labels": int(request.get("labels", 0) or 0),
            })
            print(f"Sent {len(payload):,} bytes to {host}:{port}")
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            self.json_response(400, {"ok": False, "error": str(exc)})
        except (OSError, TimeoutError) as exc:
            self.json_response(502, {"ok": False, "error": f"Printer connection failed: {exc}"})
        except Exception as exc:
            self.json_response(500, {"ok": False, "error": f"Gateway error: {exc}"})


def main() -> None:
    port = GATEWAY_PORT
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    server = ThreadingHTTPServer((GATEWAY_HOST, port), GatewayHandler)
    cloud_agent, cloud_thread = start_cloud_print_agent()
    print("\nLabelOnZeWay Wi-Fi Gateway is running")
    print("======================================")
    print(f"On this computer: http://127.0.0.1:{port}/")
    addresses = local_ipv4_addresses()
    for ip in addresses:
        print(f"On Android/iPhone: http://{ip}:{port}/")
    if not addresses:
        print("Could not detect the LAN address. Check this computer's Wi-Fi network details.")
    print("\nOpen the mobile URL on a phone connected to the same Wi-Fi.")
    print("Keep this window open for direct POS80C printing.")
    print("Press Control-C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping LabelOnZeWay Gateway…")
    finally:
        if cloud_agent:
            cloud_agent.stop()
        if cloud_thread:
            cloud_thread.join(timeout=3)
        server.server_close()


if __name__ == "__main__":
    main()
