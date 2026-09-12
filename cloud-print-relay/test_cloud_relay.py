import base64
import unittest
from unittest.mock import patch
import labelonzeway_cloud_relay as relay


class RelayTests(unittest.TestCase):
    def config(self):
        return {
            "supabase_url": "https://example.supabase.co",
            "supabase_anon_key": "anon",
            "workspace_id": "workspace",
            "email": "printer@example.com",
            "target_host": "203.0.113.9",
            "target_port": 49173,
        }

    def test_private_destination_rejected(self):
        with self.assertRaises(ValueError):
            relay.validate_destination("127.0.0.1", 49173, "127.0.0.1", 49173)

    def test_wrong_destination_rejected(self):
        with self.assertRaises(ValueError):
            relay.validate_destination("8.8.8.8", 49173, "1.1.1.1", 49173)

    def test_state_order_before_network_send(self):
        worker = relay.Relay(self.config())
        payload = b"ESC/POS"
        worker.claim = lambda: {"id": "job-1", "payload_base64": base64.b64encode(payload).decode()}
        calls = []
        worker.rpc = lambda name, data: calls.append(name)
        with patch.object(relay, "send_tcp", lambda *args, **kwargs: calls.append("send")):
            self.assertTrue(worker.process_one())
        self.assertEqual(calls, ["mark_cloud_print_sending", "send", "complete_cloud_print_job"])

    def test_invalid_base64_never_transmits(self):
        worker = relay.Relay(self.config())
        worker.claim = lambda: {"id": "job-2", "payload_base64": "%%%"}
        calls = []
        worker.rpc = lambda name, data: calls.append(name)
        with patch.object(relay, "send_tcp", side_effect=AssertionError("must not send")):
            self.assertTrue(worker.process_one())
        self.assertEqual(calls, ["fail_cloud_print_job"])

    def test_empty_payload_rejected(self):
        with patch.object(relay, "validate_destination", return_value=("203.0.113.9", 49173)):
            with self.assertRaises(ValueError):
                relay.send_tcp("203.0.113.9", 49173, b"", "203.0.113.9", 49173)


if __name__ == "__main__":
    unittest.main(verbosity=2)
