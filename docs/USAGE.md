# Usage

## Install the tools (new machine)
```bash
git clone https://github.com/alexxanderdiaz/ai-coding-stack.git
cd ai-coding-stack && ./setup.sh        # → 1) Install tools
```
Windows: `powershell -ExecutionPolicy Bypass -File .\setup.ps1`. Then authenticate:
`claude` → `/login` · `codex login` · Antigravity → sign in with Google.

Install only a subset of tools:
```bash
node setup.js --tools claude,codex      # install/verify only Claude Code + Codex
```
Interactively, the menu asks **"Which tools?"** after you pick an action:
```text
Which tools? (comma list, or 'all')
  1) Claude Code   2) Codex   3) Antigravity
  e.g. "1,3" or "all"
```
Windows:
```powershell
.\setup.ps1 -Tools claude,codex
```

Check only (install nothing):
```bash
node ensure-tools.js all --check
```

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
