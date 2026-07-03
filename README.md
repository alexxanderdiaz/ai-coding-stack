<div align="center">

# 🧩 ai-coding-stack

**A portable toolkit for AI coding tools — install them, and scaffold any project with cross-tool context + session continuity. Windows · Linux · macOS.**

Works with **Claude Code · Codex · Antigravity · opencode · Cursor · Windsurf** (and any tool that reads `AGENTS.md`).

![Platform](https://img.shields.io/badge/OS-Windows%20%7C%20Linux%20%7C%20macOS-blue)
![Core](https://img.shields.io/badge/core-Node.js-green)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/alexxanderdiaz/ai-coding-stack/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/ai-coding-stack)

</div>

---

## What it does

1. **Sets up the tools (first-run wizard)** — `node setup.js` detects which of Claude Code, Codex, Antigravity, opencode, Cursor, Windsurf are installed, then in one step **installs the missing ones and applies the ready-to-use config** (Context7 MCP) to every selected tool — new *and* already-installed. Missing package managers (Node.js/Homebrew) are bootstrapped automatically. If a tool already has MCP config, the wizard asks once: **merge** (keep yours, add Context7) or **fresh + backup** (`.bak`). You authenticate each with your own account afterwards.
2. **Scaffolds projects** (`project-init`, a separate later step) — auto-detects your stack and writes a lean, best-practice context file set so any AI coding tool understands your project from the first prompt:
   - `AGENTS.md` — **single source of truth**, cross-tool (Codex, Antigravity, Cursor, opencode, Windsurf).
   - `CLAUDE.md` — short pointer to AGENTS.md (Claude Code).
   - `GEMINI.md` — Antigravity-specific overrides (pointer to AGENTS.md).
   - `STATE.md` — a **session-continuity log**.
3. **Keeps continuity** — type `catchup` to resume exactly where you left off (any tool), `wrapup` to save state before closing. A Claude Stop hook also snapshots git into `STATE.md`.

No personal config, no accounts baked in. You bring your own.

---

## Prerequisites

- **Git** — required to clone this repo and used by expert discovery (`project-init`). Install it first: `winget install Git.Git` (Windows) · `brew install git` (macOS) · `sudo apt install git` / your distro (Linux).
- **Node.js ≥ 18** — the toolkit runs on Node. `setup.js` will **auto-install Node.js/npm** if missing (apt/dnf/pacman/zypper/apk on Linux, Homebrew on macOS, winget on Windows) — pass `--no-deps` to skip that bootstrap.
- A platform package manager for installing the agents:
  - **Windows** — `winget` (built-in on Win10/11; else install *App Installer*).
  - **macOS** — [Homebrew](https://brew.sh) (setup prints the one-line installer if missing).
  - **Linux** — your distro's package manager for CLIs. **GUI IDEs (Cursor, Windsurf, Antigravity) have no Linux auto-installer** — setup prints the download URL to install them manually.

What gets installed per OS:

| Tool | Type | Windows | macOS | Linux |
|------|------|---------|-------|-------|
| Claude Code | CLI + app | winget | npm + cask | npm (CLI only) |
| Codex | CLI | winget | npm | npm |
| opencode | CLI | npm | npm | npm |
| Antigravity | IDE | winget | cask | manual |
| Cursor | IDE | winget | cask | manual |
| Windsurf | IDE | winget | cask | manual |

---

## Quickstart

### Option A — npm (no clone)
Run the wizard straight from npm:
```bash
npx ai-coding-stack            # runs the first-run wizard
```
Or install globally to get the `ai-coding-stack` (wizard) and `aics-init` (scaffold) commands anywhere:
```bash
npm install -g ai-coding-stack
ai-coding-stack                # wizard: detect → install + configure
aics-init --about "REST API for recurring billing"   # scaffold the current folder
```

### Option B — git clone
```bash
# Linux / macOS
git clone https://github.com/alexxanderdiaz/ai-coding-stack.git
cd ai-coding-stack && ./setup.sh
```
```powershell
# Windows
git clone https://github.com/alexxanderdiaz/ai-coding-stack.git
cd ai-coding-stack
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

### Non-interactive (either install method)
```bash
ai-coding-stack --tools all                    # install + configure all tools (no prompts)
ai-coding-stack --tools claude,codex,opencode  # a subset
ai-coding-stack --tools all --fresh            # fresh+backup existing MCP config
ai-coding-stack --tools all --no-deps          # skip Node/Homebrew bootstrap
aics-init --about "REST API for recurring billing"   # scaffold cwd (or: node setup.js --init)
```
> With a git clone, use `node setup.js …` / `node project-init.js …` instead of the global commands.

Then authenticate (your accounts):
- **Claude Code:** `claude` → `/login`
- **Codex:** `codex login`
- **opencode:** `opencode login`
- **Cursor:** open the app → sign in
- **Windsurf:** open the app → sign in
- **Antigravity:** open the app → sign in with Google

---

## The setup wizard, screen by screen

Run `ai-coding-stack` (or `npx ai-coding-stack` / `node setup.js`) with no flags:

**1. Detection** — lists every tool and whether it's already installed:
```
Detected on this machine:
  ✓ Claude Code
  · Codex            (not installed)
  ✓ opencode
  · Cursor           (not installed)
  ...
```

**2. Tool selection** (arrow-key, all preselected):
```
Set up which tools? (installs missing + configures all selected)
 ❯ ◉ All tools
   ◉ Claude Code   installed — add config
   ◉ Codex         install + config
   ◉ opencode      installed — add config
   ...
 ↑/↓ move · space toggle · enter confirm
```
- **All tools** row toggles everything. `space` toggles one; `enter` confirms.
- Selecting a tool that's already installed = just add config (no reinstall); a missing one = install + config.
- Non-TTY (pipes/CI): falls back to a numbered prompt (`0`=all, comma list, or Enter).

**3. Prerequisite bootstrap** — installs Node.js/npm if missing (skip with `--no-deps`).

**4. Install + configure**, per selected tool:
- installs the CLI/GUI (or prints a download URL where there's no auto-installer),
- writes **Context7 MCP** config (opencode/Cursor/Windsurf; Claude gets a `claude mcp add` one-liner),
- installs the **`project-init` command** into the tool (Claude/opencode/Codex/Antigravity).

**5. Existing config** — only if a selected tool already has MCP servers:
```
Existing MCP config found for: opencode — how to add Context7?
 ❯ Merge          keep your servers, add Context7 (non-destructive)
   Fresh + backup back up to .bak, then write a clean config
```

**6. Auth notes** — how to sign in to each selected tool.

**7. Scaffold now?** — optional (default **No**):
```
Scaffold the current folder as a project now?  (/path/to/cwd)
 ❯ No    all set — say "project-init" in a tool later, or `node setup.js --init`
   Yes   run project-init here now (AGENTS.md + experts)
```
Either way you finish with **✓ Setup complete** — tools are installed/configured and `project-init` is available inside them.

---

## project-init in detail

**Run it once, from any one tool — it configures all of them in a single pass** (`AGENTS.md`
+ `CLAUDE.md` + experts to `.claude`/`.opencode`/`~/.codex`). Don't re-run it per tool.
The prerequisite is that the tools are **installed** (`node ensure-tools.js all --check`), not
authenticated — auth is only needed to *use* an agent later, not to scaffold.

```bash
node project-init.js . --about "what the project is"
```
Auto-detects the stack — `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` / `pom.xml` / Gradle / Docker, plus **Terraform** (`*.tf`), **Azure Bicep** (`*.bicep`), **Shell** (`*.sh`), and **Azure CLI / azd** (`azure.yaml` / `.azure/`) — → real `build`/`test`/`lint` commands (e.g. `terraform init/validate/fmt/plan`, `az bicep build/lint`, `shellcheck`). Writes the four files with lean, agents.md-2026 best-practice sections: **Goal · Commands · Structure · Non-obvious patterns · Permissions/boundaries · Conventions · Commits/PR · Continuity**. The agent fills *Structure* and *Non-obvious patterns* by inspecting the repo.

### Use it from inside a tool (skill)
The setup wizard **already installs `project-init` as a command** into each compatible tool's global skills dir (Claude `~/.claude/skills/`, opencode `~/.config/opencode/skills/`, Codex `~/.codex/skills/`, Antigravity `~/.gemini/skills/`). So just open the tool in a project folder and say **“project-init”** / “set up this project” — it scaffolds `AGENTS.md` and downloads/configures the experts that project needs. (Cursor/Windsurf use per-project rules, no global command — run `node setup.js --init` there.)

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
  A project's `.codex/` therefore stays (almost) empty by design — the installer leaves a
  `.codex/README.md` pointer so that's not mistaken for a failed install. The `.aics-experts.json`
  manifest records which experts went to codex.
- **Writes require `--yes`** (the installer previews otherwise); `--dry-run` previews, `--force` overwrites.
- Always review generated files before relying on them.

**See what's available / installed:**
```bash
node install-experts.js . --list                 # catalog + trusted sources + installed in this project
node install-experts.js . --list --installed     # only experts in .aics-experts.json
node install-experts.js . --list --sources       # only the trusted-source allowlist
```

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
# get a key at https://context7.com, then set it in your environment:
export CONTEXT7_API_KEY="<your-key>"

# propagate Context7 MCP to opencode / Cursor / Windsurf:
node lib/propagate-mcp.js all
# or subset:
node lib/propagate-mcp.js opencode,cursor
```

The key is read from your environment and written using each tool's native env-interpolation syntax (no plaintext API keys on disk). *(Claude Code registers Context7 separately via `claude mcp add` — see install.js / the section above.)*

## Components

| File | Role |
|------|------|
| `setup.js` · `setup.sh` · `setup.ps1` | First-run wizard / bootstrap |
| `ensure-tools.js` | Detect + install each tool's GUI & CLI (+ Node/brew prereq bootstrap) |
| `lib/tui.js` | Zero-dep arrow-key menu (numbered fallback on non-TTY) |
| `project-init.js` | Cross-tool project scaffolder |
| `lib/detect-stack.js` | Stack + real commands detection |
| `lib/propagate-mcp.js` | Write Context7 MCP into each tool's config (env-interpolated) |
| `hooks/state-snapshot.js` | Claude Stop hook → git snapshot in STATE.md |
| `skills/project-init/` | In-tool `project-init` command (installed into tools by setup) |
| `catalog/` | Vetted expert catalog + canonical specs |
| `lib/match-experts.js` | Stack + purpose → expert shortlist |
| `lib/render-expert.js` | Spec → per-tool native format |
| `install-experts.js` | Install rendered experts into selected tools (`--list` overviews catalog/sources/installed) |
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
