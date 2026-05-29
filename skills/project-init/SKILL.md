---
name: project-init
description: Scaffold the current project for the best AI-coding-agent experience. Use when the user says "project-init", "set up this project", "initialize this project", or opens a new project. Detects the stack, writes AGENTS.md (+ GEMINI.md for Antigravity) with real commands and a STATE.md continuity log; if relevant skills/agents are missing, discovers good ones online (with approval).
allowed-tools: Bash(node:*), Bash(ls:*), Bash(cat:*), Bash(gh search:*)
---

# project-init

Configure the current project directory. `AGENTS.md` is the cross-tool context file (read by Codex, Antigravity, Cursor); `GEMINI.md` holds Antigravity-specific overrides.

## Flow

1. **Confirm the dir.** It's the project cwd. If it's `~` or a tool config dir, WARN before continuing.

2. **Ask what the project is about** (what it is, goal, preferred stack) — highest-value context, especially for new empty folders. Pass it to `--about`.

3. **Generate** by running the bundled script:
   ```
   node "<this-skill-dir>/project-init.js" . --about "<what it is>"          # Codex
   node "<this-skill-dir>/project-init.js" . --gemini --about "<what it is>" # Antigravity (also writes GEMINI.md)
   ```
   It detects language/frameworks/real commands and writes `AGENTS.md` (+ `GEMINI.md`) and `STATE.md`. Keeps existing files unless `--force`.

4. **Fill the high-value sections** (best practice): the files ship with placeholders for **Structure** and **Non-obvious patterns**. Inspect the repo and fill them — structure high-level; patterns ONLY the counterintuitive (one real example > three paragraphs); pair prohibitions with alternatives. Keep each file <150 lines.

5. **Discovery (optional):** if the stack is unrecognized or relevant skills/agents are missing, search online (`gh search`, marketplaces, web), **propose** the best options, and install only what the user approves. Never install third-party code without approval.

6. **Report** the detected stack, commands, and what landed in the files.

## Continuity
- **"catchup"** → read STATE.md + git log/status → summarize and propose next step.
- **"wrapup"** → update STATE.md fully before closing.
