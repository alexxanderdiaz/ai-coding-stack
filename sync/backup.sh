#!/usr/bin/env bash
# Back up YOUR AI-tool configs (shareable parts) to your own destination.
# Configure via env:
#   AICS_DEST=/path/to/your/dotfiles-repo     # a local dir / git repo, OR
#   AICS_RCLONE=myremote:ai-config            # an rclone remote (you set it up)
# Secrets are excluded (auth/credentials/.env). Review before committing/pushing.
set -euo pipefail
TMP="$(mktemp -d)"; OUT="$TMP/ai-config-$(date +%Y%m%d-%H%M%S).tgz"
tar -czf "$OUT" \
  --exclude='*.credentials*' --exclude='auth.json' --exclude='.env*' \
  --exclude='*token*' --exclude='*secret*' --exclude='sessions' \
  --exclude='*/logs*' --exclude='*/cache' \
  -C "$HOME" \
  $( [ -d "$HOME/.claude" ] && echo .claude/settings.json .claude/agents .claude/rules ) \
  $( [ -d "$HOME/.codex" ] && echo .codex/AGENTS.md .codex/config.toml ) 2>/dev/null || true
if [ -n "${AICS_RCLONE:-}" ]; then rclone copy "$OUT" "$AICS_RCLONE/" && echo "Uploaded to $AICS_RCLONE";
elif [ -n "${AICS_DEST:-}" ]; then mkdir -p "$AICS_DEST" && cp "$OUT" "$AICS_DEST/" && echo "Copied to $AICS_DEST";
else echo "Set AICS_DEST or AICS_RCLONE. Archive at: $OUT"; exit 0; fi
rm -rf "$TMP"
