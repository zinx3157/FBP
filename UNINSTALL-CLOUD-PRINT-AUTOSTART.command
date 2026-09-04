#!/bin/bash
set -u
LABEL="com.labelonzeway.cloudprint"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
if [ -f "$PLIST" ]; then mv "$PLIST" "$HOME/.Trash/$LABEL.plist"; fi
echo "Cloud Print auto-start removed. Your cloud credentials and application data were not deleted."
read -r -p "Press Return to close…"
