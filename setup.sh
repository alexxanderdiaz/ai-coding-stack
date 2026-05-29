#!/usr/bin/env bash
# ai-coding-stack — bootstrap (ensures Node) then runs the setup menu.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
have(){ command -v "$1" >/dev/null 2>&1; }
if ! have node; then
  echo "Installing Node.js..."
  if [ "$(uname -s)" = "Darwin" ]; then have brew && brew install node; else
    if have apt-get; then sudo apt-get update -y && sudo apt-get install -y nodejs;
    elif have dnf; then sudo dnf install -y nodejs;
    elif have pacman; then sudo pacman -Sy --noconfirm nodejs; fi
  fi
fi
have node || { echo "Node.js required. Install it and re-run."; exit 1; }
exec node "$HERE/setup.js" "$@"
