#!/usr/bin/env python3
"""One-time placeholder replacement for the hosted POS80C gateway."""

import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
PATH = HERE / "gateway-config.json"
SLUG = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$")


def ask(label: str) -> str:
    while True:
        value = input(label).strip()
        if SLUG.fullmatch(value):
            return value
        print("Use only GitHub name characters: letters, numbers, dot, underscore, or hyphen.")


print("SHIPDESK + LabelOnZeWay — GitHub Pages gateway setup")
print("This stores only your public GitHub Pages address; it does not ask for a password or token.\n")
username = ask("GitHub username: ")
repository = ask("Public repository name: ")
config = json.loads(PATH.read_text(encoding="utf-8")) if PATH.is_file() else {}
config.update({
    "allowed_origins": [f"https://{username}.github.io"],
    "pages_url": f"https://{username}.github.io/{repository}/",
    "host": config.get("host", "0.0.0.0"),
    "port": config.get("port", 8765),
    "web_root": config.get("web_root", ".."),
    "open_browser": config.get("open_browser", True),
})
PATH.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
print(f"\nConfigured: https://{username}.github.io/{repository}/")
print("You can now start the POS80C gateway.")
