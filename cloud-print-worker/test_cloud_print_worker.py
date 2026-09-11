import base64
import socket
import threading
import unittest
from unittest.mock import patch

import labelonzeway_cloud_print_worker as cpw


class TcpSink:
    def __init__(self):
        self.data = bytearray()
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server.bind(("127.0.0.1", 0))
        self.host, self.port = self.server.getsockname()
        self.server.listen(1)
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()

    def run(self):
        conn, _ = self.server.accept()
        with conn:
            while True:
                chunk = conn.recv(65536)
                if not chunk:
                    break
                self.data.extend(chunk)
        self.server.close()


class FakeWorker(cpw.CloudPrintWorker):
    def __init__(self, job, host, port):
        super().__init__({
            "supabase_url": "https://example.supabase.co",
            "supabase_anon_key": "anon",
            "workspace_id": "00000000-0000-0000-0000-000000000001",
            "email": "worker@example.com",
            "printer_ip": host,
            "printer_port": port,
        })
        self.job = job
        self.calls = []

    def claim(self):
        job, self.job = self.job, None
        return job

    def rpc(self, name, payload):
        self.calls.append((name, payload))
        return []


class CloudPrintTests(unittest.TestCase):
    def test_escpos_bytes_reach_tcp_printer_and_state_order_is_safe(self):
        sink = TcpSink()
        payload = b"\x1b@LabelOnZeWay\nTEST\n\x1dV\x00"
        job = {
            "id": "job-1",
            "payload_base64": base64.b64encode(payload).decode(),
            "printer_ip": sink.host,
            "printer_port": sink.port,
        }
        worker = FakeWorker(job, sink.host, sink.port)
        self.assertTrue(worker.process_one())
        sink.thread.join(2)
        self.assertEqual(bytes(sink.data), payload)
        self.assertEqual(worker.calls[0][0], "mark_cloud_print_sending")
        self.assertEqual(worker.calls[1][0], "complete_cloud_print_job")

    def test_invalid_base64_is_failed_not_sent(self):
        job = {"id": "job-bad", "payload_base64": "%%%", "printer_ip": "127.0.0.1", "printer_port": 9100}
        worker = FakeWorker(job, "127.0.0.1", 9100)
        self.assertTrue(worker.process_one())
        self.assertEqual(worker.calls[-1][0], "fail_cloud_print_job")
        self.assertFalse(any(name == "mark_cloud_print_sending" for name, _ in worker.calls))

    def test_wrong_printer_target_is_rejected(self):
        with self.assertRaises(ValueError):
            cpw._validate_printer("127.0.0.2", 9100, "127.0.0.1", 9100)

    def test_oversize_and_empty_payload_are_rejected(self):
        with self.assertRaises(ValueError):
            cpw.send_to_printer("127.0.0.1", 9100, b"", "127.0.0.1", 9100)

    def test_401_causes_one_reauthentication_attempt(self):
        config = {
            "supabase_url": "https://example.supabase.co", "supabase_anon_key": "anon",
            "workspace_id": "w", "email": "e@example.com", "printer_ip": "127.0.0.1", "printer_port": 9100
        }
        worker = cpw.CloudPrintWorker(config)
        worker.access_token = "old"
        responses = [RuntimeError("HTTP 401: expired"), []]
        with patch.object(cpw, "_json_request", side_effect=responses) as req, patch.object(worker, "login", side_effect=lambda: setattr(worker, "access_token", "new")):
            out = worker.rpc("x", {})
            self.assertEqual(out, [])
            self.assertEqual(req.call_count, 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
