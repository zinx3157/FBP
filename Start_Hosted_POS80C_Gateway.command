#!/bin/bash
set -u
SERVICE_DIR="$(cd "$(dirname "$0")" && pwd)"
REQUIRED_IP="192.168.100.14"
PORT="8765"
clear
echo "LabelOnZeWay v154 — Local + Cloud Print Bridge"
echo "===================================================="
echo
if ! /sbin/ifconfig | grep -Eq "inet[[:space:]]+$REQUIRED_IP([[:space:]]|$)"; then
  echo "STOP: this Mac does not currently own $REQUIRED_IP."
  echo
  echo "Set the Mac Wi-Fi IPv4 address to $REQUIRED_IP, then run this launcher again."
  echo "The iPhone URL cannot work while the Mac has a different IP address."
  echo
  echo "Press Return to close."
  read -r
  exit 2
fi
echo "Mac IP verified: $REQUIRED_IP"
echo "iPhone app: http://$REQUIRED_IP:$PORT/labelonzeway/"
echo "Gateway health: http://$REQUIRED_IP:$PORT/health"
echo
echo "Keep this Terminal window open while using the app or printing."
if [ -f "$SERVICE_DIR/cloud-print-agent.json" ]; then
  echo "Cloud Print agent: configured"
else
  echo "Cloud Print agent: NOT CONFIGURED — run SETUP-CLOUD-PRINT-AGENT.command once"
fi
echo "Press Control-C to stop the service."
echo
cd "$SERVICE_DIR" || exit 1
python3 "$SERVICE_DIR/labelonzeway_local_service.py" "$PORT"
STATUS=$?
echo
echo "Local production and print bridge stopped."
echo "Press Return to close."
read -r
exit "$STATUS"
