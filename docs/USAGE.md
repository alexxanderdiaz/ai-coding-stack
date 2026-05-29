# Usage

## Install the tools (new machine)
```bash
git clone https://github.com/alexxanderdiaz/ai-coding-stack.git
cd ai-coding-stack && ./setup.sh        # → 1) Install tools
```
Windows: `powershell -ExecutionPolicy Bypass -File .\setup.ps1`. Then authenticate:
`claude` → `/login` · `codex login` · Antigravity → sign in with Google.

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

## From inside a tool (skill)
Install the trigger once:
```bash
cp -r skills/project-init ~/.codex/skills/          # Codex
cp -r skills/project-init ~/.gemini/skills/         # Antigravity
```
Then in the tool's chat: **"project-init"** or "set up this project" → the agent runs it.

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
