#!/usr/bin/env python3
"""SHIPDESK + LabelOnZeWay hosted-origin POS80C gateway.

Allows only explicitly configured hosted origins (plus its same-origin local site),
forwards ESC/POS bytes to a private/local TCP printer, and can serve the local
copy of both web apps for the dependable iPhone/iPad direct-print route.
No third-party Python packages are required.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import ipaddress
import json
import mimetypes
import os
from pathlib import Path
import socket
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

VERSION = "2.0"
IDENTITY = "SHIPDESK + LabelOnZeWay POS80C Gateway"
MAX_BODY = 64 * 1024 * 1024
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG = SCRIPT_DIR / "gateway-config.json"
PLACEHOLDER_WORDS = ("USERNAME", "REPOSITORY", "YOUR-")


def clean_origin(value: str) -> str:
    value = str(value or "").strip().rstrip("/")
    try:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return ""
        port = f":{parsed.port}" if parsed.port else ""
        host = parsed.hostname.lower()
        if ":" in host and not host.startswith("["):
            host = f"[{host}]"
        return f"{parsed.scheme.lower()}://{host}{port}"
    except (ValueError, TypeError):
        return ""


def placeholder(value: str) -> bool:
    upper = str(value or "").upper()
    return any(word in upper for word in PLACEHOLDER_WORDS)


def load_config(path: Path) -> dict:
    config = {
        "allowed_origins": [],
        "pages_url": "https://USERNAME.github.io/REPOSITORY/",
        "host": "0.0.0.0",
        "port": 8765,
        "web_root": "..",
        "open_browser": True,
    }
    if path.is_file():
        try:
            loaded = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(loaded, dict):
                raise ValueError("the JSON root must be an object")
            config.update(loaded)
        except Exception as exc:
            raise SystemExit(f"Cannot read {path}: {exc}") from exc
    return config


def resolve_private(host: str, port: int) -> tuple[str, int]:
    host = str(host or "").strip()
    if not host or len(host) > 253:
        raise ValueError("Enter the printer IP address")
    if not 1 <= int(port) <= 65535:
        raise ValueError("Printer port must be between 1 and 65535")
    try:
        infos = socket.getaddrinfo(host, int(port), type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Cannot resolve printer address: {host}") from exc
    for info in infos:
        raw = info[4][0].split("%", 1)[0]
        try:
            ip = ipaddress.ip_address(raw)
        except ValueError:
            continue
        if ip.is_private or ip.is_link_local or ip.is_loopback:
            return host, int(port)
    raise ValueError("For safety, the gateway only connects to private/local printer addresses")


def lan_addresses() -> list[str]:
    found: set[str] = set()
    for target in (("8.8.8.8", 80), ("1.1.1.1", 80)):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.connect(target)
                ip = sock.getsockname()[0]
                if ip and not ip.startswith("127."):
                    found.add(ip)
        except OSError:
            pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip and not ip.startswith("127."):
                found.add(ip)
    except OSError:
        pass
    return sorted(found)


def send_to_printer(host: str, port: int, payload: bytes) -> None:
    host, port = resolve_private(host, port)
    with socket.create_connection((host, port), timeout=5) as sock:
        sock.settimeout(30)
        sock.sendall(payload)
        try:
            sock.shutdown(socket.SHUT_WR)
        except OSError:
            pass


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class GatewayHandler(BaseHTTPRequestHandler):
    server_version = "SHIPDESKLabelOnZeWayGateway/" + VERSION

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))
        sys.stdout.flush()

    @property
    def settings(self) -> dict:
        return self.server.settings  # type: ignore[attr-defined]

    def request_origin(self) -> str:
        return clean_origin(self.headers.get("Origin", ""))

    def same_gateway_origin(self, origin: str) -> bool:
        host = str(self.headers.get("Host", "")).strip()
        if not host:
            return False
        return origin == clean_origin("http://" + host)

    def origin_allowed(self) -> bool:
        raw = self.headers.get("Origin")
        if not raw or raw == "null":
            return True
        origin = self.request_origin()
        return bool(origin and (origin in self.settings["allowed_origins"] or self.same_gateway_origin(origin)))

    def cors(self) -> None:
        origin = self.request_origin()
        self.send_header("Access-Control-Allow-Origin", origin if origin else "null")
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store")

    def json_response(self, status: int, data: dict, include_cors: bool = True) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        if include_cors and self.origin_allowed():
            self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def reject_origin(self) -> None:
        self.json_response(
            403,
            {"ok": False, "error": "Origin not allowed. Run configure_gateway.py or edit gateway-config.json."},
            include_cors=False,
        )

    def do_OPTIONS(self) -> None:  # noqa: N802
        if not self.origin_allowed():
            self.reject_origin()
            return
        self.send_response(204)
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def health(self, parsed) -> None:
        query = parse_qs(parsed.query)
        host = (query.get("host") or [""])[0]
        raw_port = (query.get("port") or ["9100"])[0]
        printer_ok = None
        printer_error = ""
        if host:
            try:
                host, port = resolve_private(host, int(raw_port))
                with socket.create_connection((host, port), timeout=2):
                    pass
                printer_ok = True
            except Exception as exc:
                printer_ok = False
                printer_error = str(exc)
        self.json_response(
            200,
            {
                "ok": True,
                "bridge": "SHIPDESK POS80C",
                "gateway": "LabelOnZeWay Wi-Fi Gateway",
                "identity": IDENTITY,
                "version": VERSION,
                "printer_ok": printer_ok,
                "printer_error": printer_error,
                "allowed_origins": sorted(self.settings["allowed_origins"]),
            },
        )

    def static_file(self, parsed) -> None:
        root: Path = self.settings["web_root"]
        rel = unquote(parsed.path).lstrip("/") or "index.html"
        candidate = (root / rel).resolve()
        try:
            candidate.relative_to(root)
        except ValueError:
            self.send_error(403)
            return
        if candidate.is_dir():
            candidate = candidate / "index.html"
        if not candidate.is_file() or candidate.name.startswith("."):
            self.send_error(404)
            return
        try:
            body = candidate.read_bytes()
        except OSError:
            self.send_error(500)
            return
        mime = mimetypes.guess_type(str(candidate))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", mime + ("; charset=utf-8" if mime.startswith("text/") else ""))
        self.send_header("X-Content-Type-Options", "nosniff")
        if candidate.name in {"index.html", "service-worker.js", "manifest.webmanifest"}:
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=86400")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path in {"/api/health", "/health"}:
            if not self.origin_allowed():
                self.reject_origin()
                return
            self.health(parsed)
            return
        self.static_file(parsed)

    def do_POST(self) -> None:  # noqa: N802
        if not self.origin_allowed():
            self.reject_origin()
            return
        if urlparse(self.path).path not in {"/api/print", "/print"}:
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
            self.json_response(
                200,
                {"ok": True, "bytes_sent": len(payload), "labels": int(request.get("labels", 0) or 0)},
            )
            print(f"Sent {len(payload):,} bytes to {host}:{port}")
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            self.json_response(400, {"ok": False, "error": str(exc)})
        except (OSError, TimeoutError) as exc:
            self.json_response(502, {"ok": False, "error": f"Printer connection failed: {exc}"})
        except Exception as exc:
            self.json_response(500, {"ok": False, "error": f"Gateway error: {exc}"})


def main() -> None:
    parser = argparse.ArgumentParser(description=IDENTITY)
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="JSON configuration file")
    parser.add_argument("--host", help="Bind host (default from config)")
    parser.add_argument("--port", type=int, help="Bind port (default from config)")
    parser.add_argument("--allow-origin", action="append", default=[], help="Additional exact hosted origin")
    parser.add_argument("--web-root", help="Folder containing the static site")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser")
    args = parser.parse_args()

    config_path = Path(args.config).expanduser().resolve()
    config = load_config(config_path)
    host = args.host or str(config.get("host", "0.0.0.0"))
    port = args.port or int(config.get("port", 8765))
    if not 1 <= port <= 65535:
        raise SystemExit("Port must be between 1 and 65535")

    raw_origins = list(config.get("allowed_origins") or []) + list(args.allow_origin)
    raw_origins += [item for item in os.environ.get("POS80C_ALLOWED_ORIGINS", "").split(",") if item.strip()]
    allowed = {clean_origin(item) for item in raw_origins if clean_origin(item) and not placeholder(item)}

    root_value = args.web_root or str(config.get("web_root", ".."))
    root = Path(root_value).expanduser()
    if not root.is_absolute():
        root = config_path.parent / root
    root = root.resolve()
    if not root.is_dir():
        print(f"Warning: web root does not exist: {root}")

    settings = {"allowed_origins": allowed, "web_root": root}
    try:
        server = ReusableThreadingHTTPServer((host, port), GatewayHandler)
    except OSError as exc:
        raise SystemExit(f"Cannot start gateway on {host}:{port}: {exc}") from exc
    server.settings = settings  # type: ignore[attr-defined]

    pages_url = str(config.get("pages_url", "")).strip()
    local_url = f"http://127.0.0.1:{port}/"
    print("\n" + IDENTITY + f" v{VERSION}")
    print("=" * 55)
    print(f"Desktop local site: {local_url}")
    for address in lan_addresses():
        print(f"Phone local site:   http://{address}:{port}/")
        print(f"  LabelOnZeWay:     http://{address}:{port}/labelonzeway/")
    if allowed:
        print("Allowed hosted origin(s): " + ", ".join(sorted(allowed)))
    else:
        print("Hosted direct printing is OFF until gateway-config.json is configured.")
    print("Keep this window open while using direct POS80C printing.")
    print("Press Control-C to stop.\n")

    if bool(config.get("open_browser", True)) and not args.no_browser:
        target = pages_url if pages_url and not placeholder(pages_url) else local_url
        threading.Thread(target=lambda: (time.sleep(0.8), webbrowser.open(target)), daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping gateway…")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
