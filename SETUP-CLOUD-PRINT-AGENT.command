#!/bin/bash
set -u
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$BASE_DIR/cloud-print-agent.json"
echo "LabelOnZeWay v154 — Cloud Print Agent Setup"
echo "============================================"
echo
read -r -p "Cloud staff email: " EMAIL
read -r -p "Workspace UUID: " WORKSPACE_ID
read -r -s -p "Cloud staff password (saved in macOS Keychain): " PASSWORD
echo
if [ -z "$EMAIL" ] || [ -z "$WORKSPACE_ID" ] || [ -z "$PASSWORD" ]; then
  echo "Setup cancelled: every value is required."
  exit 2
fi
/usr/bin/security add-generic-password -U -s "LabelOnZeWayCloudPrint" -a "$EMAIL" -w "$PASSWORD" >/dev/null
/usr/bin/sed -e "s/PASTE-YOUR-WORKSPACE-UUID-HERE/$WORKSPACE_ID/" -e "s/YOUR-CLOUD-STAFF-EMAIL/$EMAIL/" \
  "$BASE_DIR/cloud-print-agent.example.json" > "$CONFIG"
/bin/chmod 600 "$CONFIG"
echo
echo "Cloud Print Agent configured."
echo "Run START-LOCAL-PRODUCTION-AND-PRINT.command and keep its window open."
read -r -p "Press Return to close."
