# Design — Tool Selector + Expert Discovery (skills & agents)

Date: 2026-05-29
Repo: `ai-coding-stack` (public). Feature 1 also lands in the private `claude-code-portable-setup`.

## Problem

The public toolkit currently (a) installs all three AI tools with no way to pick a
subset, and (b) `project-init` only writes context files — it does not bring in the
skills/agents that make a project productive the way the private setup's curated
library does. Two gaps:

1. **No tool selection.** Not everyone has access to Claude Code, Codex, and
   Antigravity. The installer must let the user choose which tools to install.
2. **No expert discovery.** Given the project purpose, the toolkit should pick the
   best-fit skills and agents, render them to each selected tool's native format, and
   install them locally — the closest safe approximation of the private library,
   without shipping any personal data.

## Goals

- Let the user install only the tools they want (one, two, or all three), from both
  the menu and a flag, on every OS. Mirror the selector into the private repo.
- From the project's detected stack + stated purpose, propose the best-fit experts
  (skills and agents), and on approval install them rendered to each selected tool's
  native format.
- Stay dependency-free (plain Node), cross-platform, and ship no personal data.

## Non-goals

- The private repo does **not** get the catalog/discovery — it already has the
  curated `skills-library`. Private gets the tool selector only.
- No live open-web skill search in this iteration (that is Approach B, future).
- No execution of any downloaded content; no post-install scripts.

## Approach

**Approach A (chosen for this iteration):** every catalog expert is a **canonical
spec file bundled in the repo**. The installer renders each spec into the native
format of each target tool. Zero network, fully vetted. The catalog schema reserves
fields for **Approach B** (pinned-git external skills, allowlist + SHA) so it can be
added later without a redesign.

---

## Feature 1 — Tool selector

### `ensure-tools.js`
- Accept a comma list and/or multiple positional tools in addition to `all` and a
  single tool: `node ensure-tools.js claude,codex` or `node ensure-tools.js claude codex`.
- Parsing: collect all non-`--` args, split each on `,`, dedupe, validate against
  `REG` keys; `all` (or empty) expands to all keys. Unknown tokens print a clear
  error and are skipped. `--check` behavior unchanged.

### `setup.js`
- Menu: when the user picks "install tools", show a tool sub-prompt:
  ```
  Which tools? (comma list, or 'all')
    1) Claude Code   2) Codex   3) Antigravity
  e.g. "1,3" or "all"
  ```
  Map the numeric/`all` answer to tool keys and pass them to `ensure-tools.js`.
- Flag form: `node setup.js --tools claude,codex` (and `--all` still implies all
  tools). When `--tools` has a value list, pass it through; bare `--tools` keeps
  today's "all" default for backward compatibility.
- `authNotes()` prints only the lines for the selected tools.

### `setup.ps1`
- Mirror the sub-prompt and `-Tools claude,codex` parameter; call `ensure-tools.js`
  with the selected list.

### Private repo (`claude-code-portable-setup`)
- Add the same selection to its `setup`/`install` entrypoint so config deploys only
  for the chosen tools (skip `install-codex.js` / `install-antigravity.js` for
  tools the user did not select). No catalog work in the private repo.

---

## Feature 2 — Expert discovery (public only)

### Catalog — `catalog/catalog.json`
```json
{
  "version": 1,
  "experts": [
    {
      "id": "code-reviewer",
      "kind": "agent",
      "profiles": ["*"],
      "languages": [],
      "frameworks": [],
      "keywords": ["review", "quality", "security"],
      "description": "Reviews changes for bugs, security, and maintainability.",
      "spec": "specs/code-reviewer.md",
      "source": { "type": "bundled" }
    }
  ]
}
```
- `kind`: `"agent"` (persona, rendered to each tool's agent primitive) or `"skill"`
  (instruction manual, copied into each tool's skills dir).
- Matching fields: `profiles` (matches `detectStack().suggestedProfile`; `"*"` =
  always), `languages`, `frameworks`, `keywords` (matched against `--about` text).
- `source.type`: `"bundled"` (spec file in repo) now; `"git"` reserved for Approach B
  (`{ "type": "git", "repo", "ref": "<pinned-sha>", "path" }`, repo host on an
  allowlist).
- Canonical spec files live in `catalog/specs/<id>.md` with light frontmatter:
  `id`, `description`, `kind`, optional `tools` (allowed tool hints). Body = the
  role/instructions in tool-neutral Markdown.

### Matcher — `lib/match-experts.js`
- `matchExperts(catalog, detection, aboutText)` → ranked expert list.
- Score: profile match + language/framework match + keyword hits in `aboutText`.
  `profiles:["*"]` always included at a base score. Returns sorted, deduped by `id`.
- Pure function, no I/O, unit-testable.

### Renderer — `lib/render-expert.js`
- `renderExpert(spec, tool)` → `{ relPath, content }` per target:
  - **Claude** — agent → `.claude/agents/<id>.md` (frontmatter `name`, `description`,
    optional `tools`); skill → `.claude/skills/<id>/SKILL.md`.
  - **Codex** — agent → `~/.codex/agents/<id>.toml` (keys: `name`, `description`,
    `instructions`); skill → `~/.codex/skills/<id>/SKILL.md`.
  - **Antigravity** — agent → `.agent/workflows/<id>.md` (saved-prompt persona);
    skill → `.agent/skills/<id>/SKILL.md`.
- TOML rendering is hand-built (no dep): escape strings, multi-line `instructions`
  as a triple-quoted basic string.

### Install targets (per-tool nuance)
- **Claude, Antigravity** → project-local (`.claude/`, `.agent/` in the project dir).
- **Codex** → global (`~/.codex/`), since Codex has no reliable per-project skills
  dir. Documented in output so the user knows where files landed.

### Installer — `install-experts.js`
- `node install-experts.js [dir] --tools claude,codex --experts code-reviewer,react-pro [--dry-run] [--yes]`
- For each expert × each target tool: render and write to the resolved path. Create
  dirs as needed. Skip existing files unless `--force`. `--dry-run` prints the plan
  (paths + tool) and writes nothing.
- Prints a summary: what landed where, per tool.

### In-tool skill — `skills/project-init/SKILL.md` (updated)
- After writing context files, if discovery is requested: run the matcher, let the
  agent refine the shortlist using the stated purpose (`--about`), **present the
  proposed experts and target tools, and require explicit user approval**, then call
  `install-experts.js` with the approved ids and the selected tools.
- Never install third-party content without approval. Bundled specs are vetted;
  Approach-B git sources additionally show repo + pinned SHA before any clone.

### Flow (public)
1. `project-init` writes `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` / `STATE.md` (today).
2. If `--with-experts` (flag) or the menu opts in: `detectStack` → `matchExperts`
   → agent refines with `--about` → **propose list + targets → confirm** →
   `install-experts.js` renders per tool → report.
3. Default is **off**; the four context files always work without discovery.

---

## Security

- Bundled specs are committed and reviewed in-repo — no network, no third-party code
  execution.
- Discovery is opt-in; installation always requires explicit confirmation of the
  expert list and the target tools.
- Approach B (future) restricts `source.type:"git"` to an allowlist of hosts/orgs,
  pins to a commit SHA, clones `--depth 1`, shows repo + SHA before cloning, and
  never runs scripts from cloned content.
- Existing files are preserved unless `--force`; `--dry-run` previews all writes.

## Testing (`test/smoke.js`, extended)

- `catalog/catalog.json` parses; every `spec` path exists; ids unique.
- `matchExperts` returns expected ids for a Go (`backend`) fixture and a React
  (`frontend`) fixture; `code-reviewer` (`*`) always present.
- `renderExpert` produces a Claude `.md` with valid frontmatter, a Codex `.toml`
  that round-trips key fields, and an Antigravity workflow `.md`.
- `install-experts.js --dry-run` lists the right paths per tool; a real install into
  a temp dir writes the expected files and is idempotent.
- `ensure-tools.js` accepts a comma list (`claude,codex` → both attempted, in
  `--check` mode no install).

## MVP catalog (~6 experts)

| id | kind | match |
|----|------|-------|
| `code-reviewer` | agent | `*` |
| `frontend-pro` | skill | profile `frontend` / React, Next.js, Vue |
| `api-backend-pro` | skill | profile `backend` / Node backend, Django, Flask, FastAPI, Go |
| `python-pro` | skill | language Python / profile `python` |
| `ml-data-pro` | skill | profile `data` / ML/Data |
| `devops-infra-pro` | skill | profile `devops` / Docker, Terraform, GitHub Actions |

## Components summary

| File | Role | Repo |
|------|------|------|
| `ensure-tools.js` | accept tool list | public + private (mirror) |
| `setup.js` / `setup.ps1` | tool sub-prompt + `--tools list` | public (+ private equivalent) |
| `catalog/catalog.json` | expert catalog | public |
| `catalog/specs/*.md` | canonical expert specs | public |
| `lib/match-experts.js` | stack+purpose → expert shortlist | public |
| `lib/render-expert.js` | spec → per-tool native format | public |
| `install-experts.js` | install rendered experts into selected tools | public |
| `skills/project-init/SKILL.md` | wire discovery with approval | public |
| `test/smoke.js` | extended coverage | public |
