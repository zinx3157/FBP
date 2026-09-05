#!/bin/bash
set -euo pipefail
FBP_DIR="$HOME/Documents/GitHub/FBP"
LATEST="$(find "$HOME/Downloads" -maxdepth 1 -type d -name 'LabelOnZeWay-Before-V2.0.0-*' -print | sort | tail -1)"
if [ -z "$LATEST" ] || [ ! -d "$LATEST/labelonzeway" ]; then
  echo "No V2.0.0 rollback backup was found in Downloads."; exit 2
fi
echo "Rollback source: $LATEST"
read -r -p "Type ROLLBACK to restore the previous web app: " ANSWER
[ "$ANSWER" = "ROLLBACK" ] || { echo "Cancelled."; exit 0; }
ditto "$LATEST/labelonzeway" "$FBP_DIR/labelonzeway"
echo "ROLLBACK: PASS"
