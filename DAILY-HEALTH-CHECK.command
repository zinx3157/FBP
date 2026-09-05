#!/bin/bash
set -u
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$BASE_DIR/gateway-config.json"
FAILED=0
echo "LabelOnZeWay V2.0.0 — Daily Health Check"
echo "========================================="
if curl -fsS --max-time 3 http://127.0.0.1:8765/health >/dev/null; then echo "[PASS] Gateway"; else echo "[FAIL] Gateway"; FAILED=1; fi
IP="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("printer_ip","192.168.100.73"))' "$CONFIG" 2>/dev/null || echo 192.168.100.73)"
PORT="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("printer_port",9100))' "$CONFIG" 2>/dev/null || echo 9100)"
if nc -z -w 3 "$IP" "$PORT" >/dev/null 2>&1; then echo "[PASS] POS80C $IP:$PORT"; else echo "[FAIL] POS80C $IP:$PORT"; FAILED=1; fi
if grep -q "Cloud Print signed in as" "$HOME/Library/Logs/LabelOnZeWay-CloudPrint.log" 2>/dev/null; then echo "[PASS] Cloud agent sign-in recorded"; else echo "[WARN] No Cloud sign-in in current log"; fi
if grep -q "Cloud Print completed" "$HOME/Library/Logs/LabelOnZeWay-CloudPrint.log" 2>/dev/null; then echo "[PASS] Completed print recorded"; else echo "[INFO] No completed print in current log"; fi
if [ "$FAILED" -eq 0 ]; then echo "DAILY HEALTH: PASS"; else echo "DAILY HEALTH: ATTENTION REQUIRED"; fi
exit "$FAILED"
