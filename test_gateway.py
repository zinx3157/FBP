#!/usr/bin/env python3
"""Self-contained integration test for the hosted POS80C gateway."""

import base64
import http.client
import json
from pathlib import Path
import socket
import subprocess
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
GATEWAY = ROOT / "docs" / "downloads" / "hosted_pos80c_gateway.py"


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def request(port, method, path, body=None, origin=None, headers=None):
    request_headers = dict(headers or {})
    if origin:
        request_headers["Origin"] = origin
    if body is not None:
        body = json.dumps(body).encode()
        request_headers.update({"Content-Type": "application/json", "Content-Length": str(len(body))})
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
    connection.request(method, path, body=body, headers=request_headers)
    response = connection.getresponse()
    result = response.status, dict(response.getheaders()), response.read()
    connection.close()
    return result


def main():
    printer_port, gateway_port = free_port(), free_port()
    captured = []

    def mock_printer():
        with socket.socket() as server:
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.bind(("127.0.0.1", printer_port))
            server.listen(1)
            connection, _ = server.accept()
            with connection:
                while True:
                    block = connection.recv(4096)
                    if not block:
                        break
                    captured.append(block)

    thread = threading.Thread(target=mock_printer, daemon=True)
    thread.start()
    process = subprocess.Popen(
        [
            "python3", "-u", str(GATEWAY), "--host", "127.0.0.1", "--port", str(gateway_port),
            "--allow-origin", "https://owner.github.io", "--web-root", str(ROOT / "docs"), "--no-browser",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        for _ in range(60):
            try:
                if request(gateway_port, "GET", "/health")[0] == 200:
                    break
            except OSError:
                time.sleep(0.05)
        else:
            raise RuntimeError("gateway did not start")

        allowed = request(gateway_port, "GET", "/api/health", origin="https://owner.github.io")
        local = request(gateway_port, "GET", "/api/health", origin=f"http://127.0.0.1:{gateway_port}")
        denied = request(gateway_port, "GET", "/api/health", origin="http://192.168.1.44:9999")
        options = request(
            gateway_port, "OPTIONS", "/api/print", origin="https://owner.github.io",
            headers={"Access-Control-Request-Method": "POST", "Access-Control-Request-Private-Network": "true"},
        )
        payload = b"\x1b@TEST\x1dVB\x00"
        printed = request(
            gateway_port,
            "POST",
            "/api/print",
            {
                "printer_ip": "127.0.0.1", "printer_port": printer_port,
                "data": base64.b64encode(payload).decode(), "labels": 1,
            },
            "https://owner.github.io",
        )
        thread.join(2)
        static = request(gateway_port, "GET", "/labelonzeway/")
        health = json.loads(allowed[2])
        print_data = json.loads(printed[2])

        result = {
            "health": allowed[0] == 200 and health.get("identity") == "SHIPDESK + LabelOnZeWay POS80C Gateway",
            "hosted_origin": allowed[1].get("Access-Control-Allow-Origin") == "https://owner.github.io",
            "same_gateway_origin": local[0] == 200,
            "other_private_origin_denied": denied[0] == 403 and not denied[1].get("Access-Control-Allow-Origin"),
            "private_network_preflight": options[0] == 204 and options[1].get("Access-Control-Allow-Private-Network") == "true",
            "print_forwarding": printed[0] == 200 and print_data.get("bytes_sent") == len(payload) and b"".join(captured) == payload,
            "local_labelonzeway": static[0] == 200 and b"LabelOnZeWay" in static[2],
        }
        print(json.dumps(result, indent=2))
        if not all(result.values()):
            raise SystemExit(1)
    finally:
        process.terminate()
        try:
            process.wait(2)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    main()
