#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/labelonzeway-cloud-relay
SERVICE=/etc/systemd/system/labelonzeway-cloud-relay.service
ENV_FILE=/etc/labelonzeway-cloud-relay.env
CONFIG_FILE=$APP_DIR/cloud-print-relay.json

if [ "${EUID}" -ne 0 ]; then
  echo "Run with sudo: sudo bash install-oracle-linux.sh"
  exit 1
fi

mkdir -p "$APP_DIR"
install -m 0755 labelonzeway_cloud_relay.py "$APP_DIR/labelonzeway_cloud_relay.py"
if [ ! -f "$CONFIG_FILE" ]; then
  install -m 0600 cloud-print-relay.example.json "$CONFIG_FILE"
fi
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOF'
LABELONZEWAY_CLOUD_PASSWORD=CHANGE-ME
EOF
  chmod 600 "$ENV_FILE"
fi

cat > "$SERVICE" <<EOF
[Unit]
Description=LabelOnZeWay Cloud Print Relay
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
EnvironmentFile=$ENV_FILE
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/python3 $APP_DIR/labelonzeway_cloud_relay.py --config $CONFIG_FILE
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable labelonzeway-cloud-relay.service

echo
printf '%s\n' "Installed. Before starting:" \
  "1) Edit $CONFIG_FILE" \
  "2) Edit $ENV_FILE and set the Supabase password" \
  "3) sudo systemctl start labelonzeway-cloud-relay" \
  "4) sudo systemctl status labelonzeway-cloud-relay" \
  "5) sudo journalctl -u labelonzeway-cloud-relay -f"
