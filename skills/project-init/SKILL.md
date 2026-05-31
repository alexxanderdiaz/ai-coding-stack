---
name: project-init
description: Scaffold the current project for the best AI-coding-agent experience. Use when the user says "project-init", "set up this project", "initialize this project", or opens a new project. Detects the stack, writes AGENTS.md (cross-tool source) + CLAUDE.md (pointer for Claude Code) (+ GEMINI.md for Antigravity) with real commands and a STATE.md continuity log; if relevant skills/agents are missing, discovers good ones online (with approval).
allowed-tools: Bash(node:*), Bash(ls:*), Bash(cat:*), Bash(git:*), Bash(gh:*)
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

5. **Discover experts (approval-gated) — three layers, quality-first:**
   Detect installed tools first: `node "<repo>/ensure-tools.js" all --check`.

   **Layer 1 — bundled catalog (offline, instant):** for common roles, install vetted experts: `node "<repo>/install-experts.js" . --tools <detected> --experts <ids> --dry-run` then `--yes`.

   **Layer 2 — live trusted sources (preferred for known needs):**
   - Trusted sources are in `<repo>/catalog/sources.json` (allowlist, each with a `license`). Pick the sources whose `tags` fit the role/`--about`.
   - Fetch (cached, pinned): `node "<repo>/lib/fetch-source.js" <sourceId>` → prints `{path, ref}`.
   - List inside: `node "<repo>/lib/scan-source.js" <path> <layout>`.
   - **Choose only what's relevant to THIS project.** Optionally rank by `gh repo view`.
   - Preview: `node "<repo>/install-experts.js" . --tools <detected> --source-id <id> --source-path <path> --layout <layout> --ref <ref> --pick <names> --dry-run` → show proposal (items + source + ref) → approve → re-run with `--yes`.
   - **Never run anything from a fetched source**; only `SKILL.md`/agent `.md` text is used.

   **Layer 3 — generate (only for gaps):** if neither layer covers a niche need, AUTHOR a canonical spec (frontmatter `id`/`kind`/`description` + body) to a temp file and: `node "<repo>/install-experts.js" . --tools <detected> --generate --spec-file <tmp> --dry-run` → approve → `--yes`. Prefer real community skills over generated ones; generate last.

   - Codex installs to GLOBAL `~/.codex` — say so before `--yes`. Offline/source unreachable → use Layer 1.
   - Refresh later: `node "<repo>/install-experts.js" . --update --dry-run` then `--yes` (generated entries are skipped).

6. **Report** the detected stack, commands, and what landed in the files.

## Continuity
- **"catchup"** → read STATE.md + git log/status → summarize and propose next step.
- **"wrapup"** → update STATE.md fully before closing.
