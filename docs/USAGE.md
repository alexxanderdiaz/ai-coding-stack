# Usage

## Install the tools (new machine)
```bash
git clone https://github.com/alexxanderdiaz/ai-coding-stack.git
cd ai-coding-stack && ./setup.sh        # → 1) Install tools
```
Windows: `powershell -ExecutionPolicy Bypass -File .\setup.ps1`.

`node setup.js` (no flags) runs a **first-run wizard**:
1. **Detect** → shows which tools are already installed (`✓`) vs missing.
2. **Select** → arrow-key list, all preselected (space toggles). It installs the missing ones *and* applies config to the ones already installed.
3. **Prerequisite bootstrap** → installs Node.js/npm if missing (apt/dnf/pacman/zypper/apk · Homebrew · winget). Skip with `--no-deps`.
4. **Install + configure** → installs each missing tool, then writes the ready-to-use **Context7 MCP** config for opencode/Cursor/Windsurf (Claude gets a `claude mcp add` one-liner; set `CONTEXT7_API_KEY` in your env so it resolves). Tools with no auto-installer on your OS (GUI IDEs on Linux) print a download URL.
5. **Existing config** → if a selected tool already has MCP servers, the wizard asks once: **merge** (keep yours, add Context7) or **fresh + backup** (`.bak` then clean write).
6. **Authenticate** (your own accounts) — printed at the end.

> Per-project context (`AGENTS.md`…) is a **separate later step**: `node setup.js --init`.

Non-interactive (same install+configure, no prompts):
```bash
node setup.js --tools all                        # set up all 6 tools (install + Context7 MCP)
node setup.js --tools claude,codex,opencode      # only these
node setup.js --tools all --fresh                # fresh+backup existing MCP config
node setup.js --tools all --no-deps              # don't auto-install Node.js/Homebrew
node ensure-tools.js all --check                 # detect only, install nothing
```
The interactive wizard uses an **arrow-key menu** (↑/↓ to move, space to toggle, enter to confirm); on a non-TTY shell it falls back to a numbered prompt.

Windows: `.\setup.ps1 -Tools claude,codex`.

## Scaffold a project
```bash
cd my-project
node /path/to/ai-coding-stack/project-init.js . --about "What this project is"
```
Writes `AGENTS.md` + `CLAUDE.md` + `GEMINI.md` + `STATE.md` with detected stack and real commands. Open the folder in any tool — each reads its file.

Add `--with-experts` to also print best-fit skills/agents for the detected stack plus the install/preview command:
```bash
node /path/to/ai-coding-stack/project-init.js . --about "..." --with-experts
```

## From inside a tool (skill)
Install the trigger once:
```bash
cp -r skills/project-init ~/.codex/skills/          # Codex
cp -r skills/project-init ~/.gemini/skills/         # Antigravity
```
Then in the tool's chat: **"project-init"** or "set up this project" → the agent runs it.

## Install experts (skills & agents)

`install-experts.js` renders best-fit skills/agents to each tool's native format and writes them in. Quality-first, three layers + refresh. **Writes require `--yes`** — without it (or with `--dry-run`) you only get a preview. Installs are recorded in `.aics-experts.json` (provenance) at the project root. **Codex installs to GLOBAL `~/.codex` — it affects every project on the machine.**

### Layer 1 — bundled catalog (offline)
```bash
node install-experts.js . --tools claude,codex --experts code-reviewer,api-backend-pro --dry-run
node install-experts.js . --tools claude,codex --experts code-reviewer,api-backend-pro --yes
```

### Layer 2 — live trusted sources (3 available)
**Trusted sources** (curated, permissive-licensed, safely scanned):
1. `wshobson-agents` — 83 plugins (backend, frontend, data, DevOps, security, code review)
2. `obra-superpowers-skills` — community skills (TDD, debugging, collaboration, architecture)
3. `sickn33-antigravity-awesome-skills` — 1.5k+ SKILL.md library (data-ai, azure, RAG, ML; cherry-pick by tag)

```bash
node lib/fetch-source.js wshobson-agents                       # clone (pinned) → prints {path, ref}
node lib/scan-source.js <path> claude-plugin-marketplace       # list installable skills/agents
node install-experts.js . --tools claude --source-id wshobson-agents \
  --source-path <path> --layout claude-plugin-marketplace --ref <ref> --pick <name> --dry-run
# review the proposal, then re-run with --yes:
node install-experts.js . --tools claude --source-id wshobson-agents \
  --source-path <path> --layout claude-plugin-marketplace --ref <ref> --pick <name> --yes
```

### Layer 3 — generate (only for gaps)
```bash
# the agent authors a canonical spec (frontmatter id/kind/description + body) to /tmp/spec.md, then:
node install-experts.js . --tools claude --generate --spec-file /tmp/spec.md --dry-run
node install-experts.js . --tools claude --generate --spec-file /tmp/spec.md --yes
```

### Refresh installed experts
```bash
node install-experts.js . --update --dry-run    # preview re-fetched latest
node install-experts.js . --update --yes         # apply (generated entries are skipped)
```

## Continuity between sessions/tools
```text
# end of session (any tool):
wrapup           # agent updates STATE.md (Claude also snapshots git via Stop hook)

# next day, in the same or another tool:
catchup          # reads STATE.md + git → resumes where you left off
```

## Enable the Claude Stop hook (optional, auto-snapshot)
Add to `~/.claude/settings.json`:
```json
{ "hooks": { "Stop": [ { "hooks": [ { "type": "command",
  "command": "node \"/ABSOLUTE/PATH/ai-coding-stack/hooks/state-snapshot.js\"" } ] } ] } }
```
It refreshes a git snapshot block in `STATE.md` at session end (idempotent; no-op outside a project with STATE.md + git).

## Propagate Context7 MCP to all tools

If you're using Context7 for library docs, set the API key in your environment and propagate it to each tool's native MCP config:
```bash
export CONTEXT7_API_KEY="<your-key>"
node lib/propagate-mcp.js all        # opencode + Cursor + Windsurf
node lib/propagate-mcp.js opencode,cursor  # subset
```

The key is read from the environment and written with each tool's native env-interpolation syntax (no plaintext storage). *(Claude Code registers Context7 separately via `claude mcp add`.)*
