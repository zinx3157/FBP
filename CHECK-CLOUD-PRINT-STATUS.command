#!/bin/bash
set -u
LABEL="com.labelonzeway.cloudprint"
clear
echo "LabelOnZeWay — Cloud Print Status"
echo "================================="
echo
if launchctl print "gui/$UID/$LABEL" >/dev/null 2>&1; then
  echo "Auto-start agent: RUNNING"
else
  echo "Auto-start agent: NOT RUNNING"
fi
echo -n "Gateway health: "
curl -fsS --max-time 3 http://127.0.0.1:8765/health || echo "OFFLINE"
echo
echo "Recent log:"
tail -n 12 "$HOME/Library/Logs/LabelOnZeWay-CloudPrint.log" 2>/dev/null || echo "No log yet."
echo
read -r -p "Press Return to close…"
