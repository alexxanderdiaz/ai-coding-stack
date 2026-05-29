#!/usr/bin/env bash
# Restore an ai-config archive into $HOME. Usage: ./sync/restore.sh <archive.tgz>
set -euo pipefail
A="${1:?usage: restore.sh <archive.tgz>}"
tar -xzf "$A" -C "$HOME"
echo "Restored. Review changes; re-authenticate tools as needed."
