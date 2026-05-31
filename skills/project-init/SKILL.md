---
name: project-init
description: Scaffold the current project for the best AI-coding-agent experience. Use when the user says "project-init", "set up this project", "initialize this project", or opens a new project. Detects the stack, writes AGENTS.md (cross-tool source) + CLAUDE.md (pointer for Claude Code) (+ GEMINI.md for Antigravity) with real commands and a STATE.md continuity log; if relevant skills/agents are missing, discovers good ones online (with approval).
allowed-tools: Bash(node:*), Bash(ls:*), Bash(cat:*), Bash(git:*), Bash(gh:*)
---

# project-init

Configure the current project directory. `AGENTS.md` is the cross-tool context file (read by Claude Code, Codex, Antigravity, Cursor, opencode, Windsurf); `GEMINI.md` holds Antigravity-specific overrides.

## Flow

1. **Confirm the dir.** It's the project cwd. If it's `~` or a tool config dir, WARN before continuing.

2. **ALWAYS ask the user what the project is about — before generating anything.** What it is, its goal, the **domain** (e.g. networking/Fortinet, fintech, RAG app), and preferred stack. Ask even if a README or code already exists — **do NOT silently infer from the folder name or README**; confirm with the user (you may propose a draft from the README and ask them to correct it). **Wait for their answer.** It becomes `--about` and drives BOTH the context files AND which experts to discover in step 5. A vague `--about` = a weak setup.

3. **Generate** by running the bundled script:
   ```
   node "<this-skill-dir>/project-init.js" . --about "<what it is>"          # Codex
   node "<this-skill-dir>/project-init.js" . --gemini --about "<what it is>" # Antigravity (also writes GEMINI.md)
   ```
   It detects language/frameworks/real commands and writes `AGENTS.md` (+ `GEMINI.md`) and `STATE.md`. Keeps existing files unless `--force`.

4. **Fill the high-value sections** (best practice): the files ship with placeholders for **Structure** and **Non-obvious patterns**. Inspect the repo and fill them — structure high-level; patterns ONLY the counterintuitive (one real example > three paragraphs); pair prohibitions with alternatives. Keep each file <150 lines.

5. **Discover experts (approval-gated) — three layers, quality-first:**
   Detect installed tools first: `node "<repo>/ensure-tools.js" all --check`.

   **Layer 1 — bundled catalog (offline, instant):** for common roles, install vetted experts: `node "<repo>/install-experts.js" . --tools <detected> --experts <ids> --dry-run` then `--yes`. NOTE: the bundled catalog only covers **generic roles** (python-pro, api-backend-pro, devops-infra-pro, frontend-pro, ml-data-pro, code-reviewer). It does NOT cover domain specifics — that's Layer 2.

   **Layer 2 — live trusted sources (REQUIRED whenever the project has a specific domain; don't stop at Layer 1):**
   - Map the `--about` domain to search terms and **search the trusted sources for matching skills** — e.g. a **Fortinet/firewall/network** project → look for `network`, `security`, `firewall`, `infra`; a RAG app → `ai-ml`, `rag`, `vector`; fintech → `payments`, `security`. If Layer 1 gave you only generic roles, Layer 2 is where the domain-relevant skills come from.
   - Trusted sources are in `<repo>/catalog/sources.json` (allowlist, each with a `license` + `tags`). Pick the sources whose `tags` fit the domain (e.g. `sickn33-antigravity-awesome-skills` is tag-scoped to security/azure/etc; `wshobson-agents` for backend/devops/security).
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
