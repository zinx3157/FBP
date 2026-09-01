#!/bin/bash
set -u
cd "$(dirname "$0")" || exit 1
clear
printf '%s\n' "SHIPDESK + LabelOnZeWay — Hosted POS80C Gateway"
printf '%s\n' "================================================="
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required. Install it from https://www.python.org/downloads/"
  read -r -p "Press Return to close…"
  exit 1
fi
if grep -q 'USERNAME.github.io' gateway-config.json 2>/dev/null; then
  echo "One-time GitHub Pages address setup:"
  python3 configure_gateway.py || { read -r -p "Press Return to close…"; exit 1; }
  echo
fi
python3 -u hosted_pos80c_gateway.py
status=$?
echo
printf 'Gateway stopped (status %s).\n' "$status"
read -r -p "Press Return to close…"
exit "$status"
