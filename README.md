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
node setup.js --tools claude,codex   # install only a subset
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

## Expert discovery (skills & agents)

`project-init` can suggest and install best-fit **skills and agents** for your stack
and purpose, rendered to each tool's native format:

```bash
node project-init.js . --about "REST API for billing" --with-experts   # prints suggestions
node install-experts.js . --tools claude,codex --experts api-backend-pro,code-reviewer --dry-run
node install-experts.js . --tools claude,codex --experts api-backend-pro,code-reviewer --yes
```

- Experts come from a **bundled, vetted catalog** (`catalog/`) — offline, no third-party code.
- Rendered per tool: Claude `.claude/agents/*.md`, Codex `~/.codex/agents/*.toml`,
  Antigravity `.agent/workflows/*.md`; skills go to each tool's `skills/` dir.
- **Claude/Antigravity install project-local; Codex installs globally (`~/.codex`, affects all projects).**
- **Writes require `--yes`** (the installer previews otherwise); `--dry-run` previews, `--force` overwrites.
- Always review generated files before relying on them.

### Live discovery from trusted collections
Beyond the bundled catalog, `project-init` can pull best-fit skills/agents from a
curated allowlist of popular collections (`catalog/sources.json`) — fetched, pinned,
and installed only where relevant:
```bash
node lib/fetch-source.js wshobson-agents          # clone (pinned) -> {path, ref}
node lib/scan-source.js <path> claude-plugin-marketplace   # list what's inside
node install-experts.js . --tools claude,codex --source-id wshobson-agents \
  --source-path <path> --layout claude-plugin-marketplace --ref <ref> --pick code-reviewer --dry-run
node install-experts.js . --update --dry-run        # refresh installed experts
```
- Sources are an **allowlist** (host-checked HTTPS, `--depth 1`, SHA-pinned, symlinks rejected, **never executed**; permissive license only).
- Installs are recorded in `.aics-experts.json` (provenance); `--update` re-fetches latest with a preview and `--yes` gate.
- Fresh at install; nothing auto-updates silently.

**Three layers (quality-first):** 1) bundled catalog (offline) -> 2) live trusted sources (above) -> 3) **generate** a bespoke skill/agent only for gaps:
```bash
# the agent authors a spec to /tmp/spec.md, then:
node install-experts.js . --tools claude,codex --generate --spec-file /tmp/spec.md --dry-run
```
Generated experts are recorded as `source: "generated"` and skipped by `--update`.

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

## Optional: Context7 docs MCP

[Context7](https://context7.com) injects version-accurate library docs into the agent's context (Next.js, React, Tailwind, etc.), cutting hallucinated/deprecated APIs. It's a hosted MCP server — **bring your own key** (free at context7.com); nothing is stored in this repo.

```bash
# get a key at https://context7.com, then register the MCP (key stays local):
claude mcp add --transport http --scope user context7 \
  https://mcp.context7.com/mcp --header "CONTEXT7_API_KEY: <your-key>"
```

Keep the key in your environment (`CONTEXT7_API_KEY`) or a gitignored file — never commit it.

## Components

| File | Role |
|------|------|
| `setup.js` · `setup.sh` · `setup.ps1` | Menu / bootstrap |
| `ensure-tools.js` | Detect + install each tool's GUI & CLI |
| `project-init.js` | Cross-tool project scaffolder |
| `lib/detect-stack.js` | Stack + real commands detection |
| `hooks/state-snapshot.js` | Claude Stop hook → git snapshot in STATE.md |
| `skills/project-init/` | In-tool `project-init` trigger (Codex/Antigravity) |
| `catalog/` | Vetted expert catalog + canonical specs |
| `lib/match-experts.js` | Stack + purpose → expert shortlist |
| `lib/render-expert.js` | Spec → per-tool native format |
| `install-experts.js` | Install rendered experts into selected tools |
| `catalog/sources.json` | Trusted-source allowlist for live discovery |
| `lib/fetch-source.js` | Clone (pinned) + host allowlist + symlink reject |
| `lib/scan-source.js` | Enumerate skills/agents in a fetched source |

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
