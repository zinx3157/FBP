#!/usr/bin/env python3
"""LabelOnZeWay Render cloud print relay.

Consumes authenticated Supabase cloud_print_jobs and forwards ESC/POS bytes to
one configured public TCP endpoint. Exposes /health and a non-printing
/diagnostics TCP reachability check on Render's PORT.
"""
from __future__ import annotations

import base64
import ipaddress
import json
import os
import socket
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

VERSION = "1.2.2"
MAX_PAYLOAD = 16 * 1024 * 1024


def _json_request(url, method="GET", headers=None, payload=None, timeout=20):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    hdrs = {"Content-Type": "application/json"}
    hdrs.update(headers or {})
    req = Request(url, data=body, headers=hdrs, method=method)
    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {exc.code}: {detail[:500]}") from exc
    except URLError as exc:
        raise RuntimeError(f"Cloud connection failed: {exc.reason}") from exc


def get_egress_ip(timeout=5):
    req = Request("https://api.ipify.org?format=json", headers={"User-Agent": "LabelOnZeWay-Relay"})
    try:
        with urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return str(data.get("ip", ""))
    except Exception as exc:
        return f"unavailable: {exc}"


def validate_destination(host, port, allowed_host, allowed_port):
    if str(host).strip() != str(allowed_host).strip() or int(port) != int(allowed_port):
        raise ValueError(f"Destination not authorized; expected {allowed_host}:{allowed_port}")
    if not 1 <= int(port) <= 65535:
        raise ValueError("Port out of range")
    infos = socket.getaddrinfo(host, int(port), type=socket.SOCK_STREAM)
    resolved = []
    for info in infos:
        ip = ipaddress.ip_address(info[4][0].split("%", 1)[0])
        resolved.append(ip)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_unspecified:
            raise ValueError(f"Destination resolved to non-public address: {ip}")
    if not resolved:
        raise ValueError("Destination did not resolve")
    return str(host), int(port)


def test_tcp(host, port, allowed_host, allowed_port, timeout=7):
    host, port = validate_destination(host, port, allowed_host, allowed_port)
    started = time.time()
    with socket.create_connection((host, port), timeout=timeout):
        pass
    return int((time.time() - started) * 1000)


def send_tcp(host, port, payload, allowed_host, allowed_port, connect_timeout=7, send_timeout=30):
    host, port = validate_destination(host, port, allowed_host, allowed_port)
    if not payload or len(payload) > MAX_PAYLOAD:
        raise ValueError("Empty or oversized print payload")
    with socket.create_connection((host, port), timeout=connect_timeout) as sock:
        sock.settimeout(send_timeout)
        sock.sendall(payload)
        try:
            sock.shutdown(socket.SHUT_WR)
        except OSError:
            pass


class Relay:
    def __init__(self):
        self.url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        self.anon_key = os.environ.get("SUPABASE_ANON_KEY", "")
        self.workspace_id = os.environ.get("WORKSPACE_ID", "").strip()
        self.email = os.environ.get("SUPABASE_EMAIL", "").strip()
        self.password_value = os.environ.get("SUPABASE_PASSWORD", "")
        self.target_host = os.environ.get("PRINTER_HOST", "").strip()
        self.target_port = int(os.environ.get("PRINTER_PORT", "49173"))
        self.poll_seconds = max(1, min(30, int(os.environ.get("POLL_SECONDS", "2"))))
        self.access_token = ""
        self.stop_event = threading.Event()
        self.last_error = ""
        self.last_job = ""
        self.started_at = time.time()
        if not all([self.url, self.anon_key, self.workspace_id, self.email, self.password_value, self.target_host]):
            raise ValueError("Missing required Render environment variables")

    def login(self):
        result = _json_request(self.url + "/auth/v1/token?grant_type=password", "POST",
                               {"apikey": self.anon_key},
                               {"email": self.email, "password": self.password_value}) or {}
        self.access_token = str(result.get("access_token", ""))
        if not self.access_token:
            raise RuntimeError("Supabase sign-in returned no access token")

    def headers(self):
        if not self.access_token:
            self.login()
        return {"apikey": self.anon_key, "Authorization": "Bearer " + self.access_token,
                "Content-Type": "application/json"}

    def rpc(self, name, payload):
        try:
            return _json_request(self.url + "/rest/v1/rpc/" + name, "POST", self.headers(), payload)
        except RuntimeError as exc:
            if "HTTP 401" not in str(exc):
                raise
            self.access_token = ""
            return _json_request(self.url + "/rest/v1/rpc/" + name, "POST", self.headers(), payload)

    def claim(self):
        rows = self.rpc("claim_cloud_print_job", {"p_workspace_id": self.workspace_id}) or []
        return rows[0] if isinstance(rows, list) and rows else None

    def process_one(self):
        job = self.claim()
        if not job:
            return False
        job_id = str(job["id"])
        self.last_job = job_id
        try:
            payload = base64.b64decode(str(job.get("payload_base64", "")), validate=True)
            self.rpc("mark_cloud_print_sending", {"p_job_id": job_id})
            send_tcp(self.target_host, self.target_port, payload, self.target_host, self.target_port)
            self.rpc("complete_cloud_print_job", {"p_job_id": job_id, "p_error": ""})
            self.last_error = ""
            print(f"PRINTED {job_id} ({len(payload)} bytes -> {self.target_host}:{self.target_port})", flush=True)
        except Exception as exc:
            self.last_error = str(exc)[:1000]
            try:
                self.rpc("fail_cloud_print_job", {"p_job_id": job_id, "p_error": self.last_error})
            except Exception:
                pass
            print(f"FAILED {job_id}: {exc}", file=sys.stderr, flush=True)
        return True

    def run(self):
        while not self.stop_event.is_set():
            try:
                if not self.access_token:
                    self.login()
                    self.rpc("requeue_stale_cloud_print_jobs", {"p_workspace_id": self.workspace_id})
                    self.rpc("purge_old_cloud_print_jobs", {"p_workspace_id": self.workspace_id})
                had_job = self.process_one()
                if not had_job:
                    self.stop_event.wait(self.poll_seconds)
            except Exception as exc:
                self.last_error = str(exc)[:1000]
                print(f"RELAY PAUSED: {exc}", file=sys.stderr, flush=True)
                self.access_token = ""
                self.stop_event.wait(10)


relay = None


class HealthHandler(BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get("Origin", "")
        allowed = origin if origin in {
            "https://zinx3157.github.io",
            "http://127.0.0.1:4173",
            "http://localhost:4173",
            "http://127.0.0.1:8765",
            "http://localhost:8765",
        } else "https://zinx3157.github.io"
        self.send_header("Access-Control-Allow-Origin", allowed)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Accept")

    def _write_json(self, status_code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self._cors()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/health"):
            self._write_json(200, {
                "service": "labelonzeway-cloud-print",
                "version": VERSION,
                "status": "ok" if relay and not relay.last_error else "degraded",
                "supabase_authenticated": bool(relay and relay.access_token),
                "last_job": relay.last_job if relay else "",
                "last_error": relay.last_error if relay else "starting",
                "uptime_seconds": int(time.time() - relay.started_at) if relay else 0,
            })
            return
        if path == "/diagnostics":
            if not relay:
                self._write_json(503, {"status": "starting", "tcp_reachable": False})
                return
            egress_ip = get_egress_ip()
            try:
                latency_ms = test_tcp(relay.target_host, relay.target_port,
                                      relay.target_host, relay.target_port)
                self._write_json(200, {
                    "service": "labelonzeway-cloud-print",
                    "version": VERSION,
                    "status": "ok",
                    "supabase_authenticated": bool(relay.access_token),
                    "render_egress_ip": egress_ip,
                    "printer_target": f"{relay.target_host}:{relay.target_port}",
                    "tcp_reachable": True,
                    "connect_ms": latency_ms,
                    "note": "TCP connect only; no print bytes sent",
                })
            except Exception as exc:
                self._write_json(503, {
                    "service": "labelonzeway-cloud-print",
                    "version": VERSION,
                    "status": "degraded",
                    "supabase_authenticated": bool(relay.access_token),
                    "render_egress_ip": egress_ip,
                    "printer_target": f"{relay.target_host}:{relay.target_port}",
                    "tcp_reachable": False,
                    "error": str(exc)[:500],
                    "note": "TCP connect only; no print bytes sent",
                })
            return
        self._write_json(404, {"status": "not_found"})

    def log_message(self, fmt, *args):
        return


def main():
    global relay
    relay = Relay()
    worker = threading.Thread(target=relay.run, name="cloud-print-relay", daemon=True)
    worker.start()
    port = int(os.environ.get("PORT", "10000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), HealthHandler)
    print(f"LabelOnZeWay relay {VERSION} listening on :{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        relay.stop_event.set()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
