<div align="center">

# 🧩 ai-coding-stack

**A portable toolkit for AI coding tools — install them, and scaffold any project with cross-tool context + session continuity. Windows · Linux · macOS.**

Works with **Claude Code · Codex · Antigravity** (and any tool that reads `AGENTS.md`).

![Platform](https://img.shields.io/badge/OS-Windows%20%7C%20Linux%20%7C%20macOS-blue)
![Core](https://img.shields.io/badge/core-Node.js-green)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/alexxanderdiaz/ai-coding-stack/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/ai-coding-stack)

</div>

---

## What it does

1. **Installs the tools** — detects and installs the GUI + CLI of Claude Code, Codex, and Antigravity if missing (winget on Windows, brew/npm on macOS/Linux). You authenticate each with your own account.
2. **Scaffolds projects** (`project-init`) — auto-detects your stack and writes a lean, best-practice context file set so any AI coding tool understands your project from the first prompt:
   - `AGENTS.md` — **single source of truth**, cross-tool (Codex, Antigravity, Cursor).
   - `CLAUDE.md` — short pointer to AGENTS.md (Claude Code).
   - `GEMINI.md` — Antigravity-specific overrides (pointer to AGENTS.md).
   - `STATE.md` — a **session-continuity log**.
3. **Keeps continuity** — type `catchup` to resume exactly where you left off (any tool), `wrapup` to save state before closing. A Claude Stop hook also snapshots git into `STATE.md`.

No personal config, no accounts baked in. You bring your own.

---

## Quickstart

```bash
# Linux / macOS
git clone https://github.com/alexxanderdiaz/ai-coding-stack.git
cd ai-coding-stack && ./setup.sh        # menu: install tools / scaffold / both
```
```powershell
# Windows
git clone https://github.com/alexxanderdiaz/ai-coding-stack.git
cd ai-coding-stack
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

Direct, no menu:
```bash
node setup.js --tools          # install/verify the AI coding tools
node setup.js --init --about "REST API for recurring billing"   # scaffold cwd
node setup.js --all            # both
```

Then authenticate (your accounts):
- **Claude Code:** `claude` → `/login`
- **Codex:** `codex login`
- **Antigravity:** open the app → sign in with Google

---

## project-init in detail

```bash
node project-init.js . --about "what the project is"
```
Auto-detects `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` / `pom.xml` … → real `build`/`test`/`lint` commands. Writes the four files with lean, agents.md-2026 best-practice sections: **Goal · Commands · Structure · Non-obvious patterns · Permissions/boundaries · Conventions · Commits/PR · Continuity**. The agent fills *Structure* and *Non-obvious patterns* by inspecting the repo.

### Use it from inside a tool (skill)
Copy `skills/project-init/` into your tool's skills dir, then just say `project-init` / "set up this project" in the chat:
- **Codex:** `~/.codex/skills/project-init/`
- **Antigravity:** `~/.gemini/skills/project-init/`
- **Claude Code:** use `node project-init.js .`, or wire it as a skill in `~/.claude/skills/`.

---

## Demo

![ai-coding-stack project-init demo](docs/demo.gif)

```text
# next day, in any tool — resume exactly where you left off:
> catchup
  → reads STATE.md + git log → "Last session: added auth middleware. Next: wire Stripe webhooks."
```

## Optional: back up your own config

`sync/backup.sh` archives the shareable parts of **your** `~/.claude` / `~/.codex` (secrets excluded) to a destination you choose — no personal paths baked in:
```bash
AICS_DEST=~/my-dotfiles ./sync/backup.sh      # to a local dir / git repo
AICS_RCLONE=myremote:ai-config ./sync/backup.sh   # to your own rclone remote
./sync/restore.sh ai-config-YYYYMMDD.tgz
```

## Components

| File | Role |
|------|------|
| `setup.js` · `setup.sh` · `setup.ps1` | Menu / bootstrap |
| `ensure-tools.js` | Detect + install each tool's GUI & CLI |
| `project-init.js` | Cross-tool project scaffolder |
| `lib/detect-stack.js` | Stack + real commands detection |
| `hooks/state-snapshot.js` | Claude Stop hook → git snapshot in STATE.md |
| `skills/project-init/` | In-tool `project-init` trigger (Codex/Antigravity) |

---

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how it fits together (with diagrams)
- [docs/USAGE.md](docs/USAGE.md) — end-to-end examples
- [docs/PROJECT-INIT.md](docs/PROJECT-INIT.md) — the generated files + best practices

## Releasing

Publishing is automated via **npm Trusted Publishing** (OIDC + provenance, no tokens):
1. One-time on npmjs.com: package → **Settings → Trusted Publishing** → add publisher
   (owner `alexxanderdiaz`, repo `ai-coding-stack`, workflow `release.yml`).
2. Then: `npm version patch && git push --follow-tags` → the `release.yml` workflow
   runs the smoke tests and publishes with a verified provenance badge.

## License

[MIT](LICENSE) © 2026 Alexander Diaz.
