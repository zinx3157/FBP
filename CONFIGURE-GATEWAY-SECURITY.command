#!/bin/bash
set -euo pipefail
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$BASE_DIR/gateway-security.json"
PRINTER_CONFIG="$BASE_DIR/gateway-config.json"
SECRET="$(openssl rand -hex 24)"
PRINTER_IP="192.168.100.73"
PRINTER_PORT="9100"
if [ -f "$PRINTER_CONFIG" ]; then
  PRINTER_IP="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("printer_ip","192.168.100.73"))' "$PRINTER_CONFIG" 2>/dev/null || echo 192.168.100.73)"
  PRINTER_PORT="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("printer_port",9100))' "$PRINTER_CONFIG" 2>/dev/null || echo 9100)"
fi
python3 - "$CONFIG" "$PRINTER_IP" "$PRINTER_PORT" "$SECRET" <<'PY'
import json, os, sys, tempfile
path, ip, port, secret = sys.argv[1:]
data = {}
try:
    with open(path, encoding="utf-8") as source:
        data = json.load(source)
except (OSError, ValueError):
    pass
data.update(gateway_secret=secret)
fd, temporary = tempfile.mkstemp(prefix="gateway-config-", suffix=".json", dir=os.path.dirname(path))
with os.fdopen(fd, "w", encoding="utf-8") as target:
    json.dump(data, target, indent=2)
    target.write("\n")
os.chmod(temporary, 0o600)
os.replace(temporary, path)
PY
echo
echo "GATEWAY SECURITY: PASS"
echo "Authorized POS80C: $PRINTER_IP:$PRINTER_PORT"
echo "Pairing key (enter once in LabelOnZeWay > More > Profile Settings):"
echo "$SECRET"
echo
read -r -p "Press Return after saving the key securely…"
