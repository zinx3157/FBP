#!/bin/bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE="$BASE_DIR/labelonzeway_local_service.py"
CONFIG="$BASE_DIR/cloud-print-agent.json"
LABEL="com.labelonzeway.cloudprint"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs"
PYTHON="$(command -v python3 || true)"

clear
echo "LabelOnZeWay v154 — Install Cloud Print Auto-Start"
echo "=================================================="
echo
if [ -z "$PYTHON" ] || [ ! -f "$SERVICE" ] || [ ! -f "$CONFIG" ]; then
  echo "STOP: Python, labelonzeway_local_service.py, or cloud-print-agent.json is missing."
  echo "Run SETUP-CLOUD-PRINT-AGENT.command first."
  read -r -p "Press Return to close…"
  exit 2
fi

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$PYTHON</string><string>$SERVICE</string><string>8765</string></array>
  <key>WorkingDirectory</key><string>$BASE_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/LabelOnZeWay-CloudPrint.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/LabelOnZeWay-CloudPrint-error.log</string>
</dict></plist>
EOF
plutil -lint "$PLIST" >/dev/null

launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
OLD_PID="$(lsof -tiTCP:8765 -sTCP:LISTEN 2>/dev/null | head -1 || true)"
if [ -n "$OLD_PID" ]; then kill "$OLD_PID" 2>/dev/null || true; sleep 1; fi
launchctl bootstrap "gui/$UID" "$PLIST"
launchctl kickstart -k "gui/$UID/$LABEL"
sleep 2

echo "AUTO-START INSTALLATION: PASS"
echo "The Mac agent now starts automatically after you sign in to this Mac."
echo "No Terminal window needs to remain open."
echo
echo "Status: launchctl print gui/$UID/$LABEL"
echo "Health: http://127.0.0.1:8765/health"
echo "Log: $LOG_DIR/LabelOnZeWay-CloudPrint.log"
read -r -p "Press Return to close…"
