# Design — Live Expert Discovery (Approach B)

Date: 2026-05-29
Repo: `ai-coding-stack` (public). Extends the bundled-catalog feature (Approach A) already merged in `main`.

## Problem

The merged feature ships a small **bundled** catalog (6 generic experts, offline). The
intended experience is bigger: tell a project its role/domain ("graphic designer",
"web developer", "architect") and have the toolkit **find the best community
skills/agents from well-known trusted collections, install only the ones relevant to
that project, into whichever tools the user has** — so the project is ready to work,
the same experience the private setup gives from a personal library.

## Goals

- From a stated role/domain + detected stack, **discover** relevant skills and agents
  from a curated allowlist of **trusted, popular collections** (e.g. everything-claude-code,
  superpowers, wshobson/agents, Anthropic-official, awesome-claude-code index).
- Install only the **project-relevant** picks, rendered to each **detected** tool's
  native format (Claude `.claude/`, Antigravity `.agent/`, Codex global `~/.codex`).
- **Fresh at install** (fetch current HEAD), with a **provenance manifest** and an
  **on-demand update** so installs never silently rot.
- Stay safe: never execute fetched third-party code; allowlist + pin + approval.

## Non-goals

- No automatic/background updates (deliberate — silent third-party-code pull is the
  risk we avoid). Updates are on-demand, previewed, approved.
- No native Claude plugin install (`claude plugin install`) — that is whole-plugin +
  global; we want selective + project-scoped + cross-tool. We fetch-and-extract.
- No open-web/arbitrary-GitHub search in this iteration. Sources are the curated
  allowlist only. (Open search could be a later layer.)
- The bundled Approach-A catalog stays as the **offline fallback**; not removed.

## Approach

The "intelligent" part — interpret a role/domain and choose the best-fit
skills/agents — is done by the **agent (LLM)** via an in-tool SKILL, exactly like the
private setup. The **deterministic** parts — fetch (pinned), scan, render, install,
manifest, update — are plain Node. Sources are a curated allowlist of large, vetted,
popular collections; the agent picks *within* them what fits the project.

**Three layers, tried in order (quality-first):**
1. **Bundled catalog** (Approach A) — offline, vetted, instant. Common roles.
2. **Live trusted sources** (this spec) — fetch best-fit from the allowlist. Preferred
   for well-known needs (battle-tested, community-vetted beats LLM-improvised).
3. **Generation fallback** — when no bundled/community skill fits a niche need, the
   agent **authors a bespoke skill/agent** (a canonical spec) and installs it via the
   same render pipeline (`source: "generated"`). Low security risk (it is instruction
   text, not third-party code); the risk is quality, so it is last, only for gaps.

---

## Components

### 1. `catalog/sources.json` — trusted-source allowlist
```json
{
  "version": 1,
  "sources": [
    {
      "id": "everything-claude-code",
      "repo": "https://github.com/<owner>/everything-claude-code",
      "host": "github.com",
      "layout": "claude-plugin-marketplace",
      "paths": { "skills": "plugins/*/skills", "agents": "plugins/*/agents" },
      "tags": ["general", "review", "testing", "docs", "frontend", "backend"],
      "description": "Large multi-plugin Claude Code marketplace."
    },
    {
      "id": "wshobson-agents",
      "repo": "https://github.com/wshobson/agents",
      "host": "github.com",
      "layout": "agents-dir",
      "paths": { "agents": "." },
      "tags": ["agents", "roles", "backend", "frontend", "data", "devops"],
      "description": "Large curated subagent collection."
    }
  ]
}
```
- `layout` ∈ `claude-plugin-marketplace` | `skills-dir` | `agents-dir` — tells the
  scanner where skills/agents live.
- `host` is the exact hostname checked against the allowlist before any clone.
- Seed sources are added in the implementation task and **each repo URL/owner is
  verified with `gh repo view` before being committed** (no guessed URLs land).
- **License check:** only add sources with a permissive license (MIT/Apache/BSD/ISC).
  Skip repos with no license (all-rights-reserved) or copyleft you don't want. Record
  the license in the entry (`"license": "MIT"`). We only reference + fetch (never
  vendor their content into this repo), but installs into a user project preserve any
  bundled `LICENSE`/attribution.
- The registry grows over time via `git pull` of the public repo.

### 2. `lib/fetch-source.js`
- `fetchSource(sourceEntry, cacheDir)` → `{ path, ref }`.
- Guards (all before any file read):
  - `new URL(repo).hostname === sourceEntry.host` and host ∈ allowlist set, else throw.
  - `git clone --depth 1 <repo> <cacheDir>/<id>` then resolve `git rev-parse HEAD` → `ref`.
  - Walk the clone with `lstatSync`; if any entry is a symlink, abort and remove the clone.
  - Never run anything from the clone (no install scripts, no hooks).
- Cache root: `~/.cache/ai-coding-stack/sources/`. Re-clone refreshes to current HEAD.

### 3. `lib/scan-source.js`
- `scanSource(localPath, layout, paths)` → `[{ type:"skill"|"agent", name, file, description }]`.
- Reads frontmatter/`SKILL.md` titles + descriptions only (uses `parseSpec` from
  render-expert). Globs the `paths` per layout (e.g. `plugins/*/skills/*/SKILL.md`).
- Pure read; returns the menu the agent chooses from.

### 4. In-tool SKILL — `skills/project-init/SKILL.md` (extended discovery step)
- Given the project role/domain (`--about`) + detected stack: for the relevant
  sources, `fetch` (cached) → `scan` → the agent **filters/ranks to project-relevant**
  picks → **presents the proposal (item + source + ref)** → explicit user approval →
  calls the installer with the approved picks → reports.
- Ranking signal: sources are pre-vetted/popular; within them the agent matches
  name/description/tags to the role/stack. (Optional `gh repo view` for stars is
  allowed but not required.)
- Never installs unapproved content; shows source + SHA before writing.

### 5. `install-experts.js` (extended) + provenance manifest
- New mode: install from a fetched source pick, in addition to the bundled catalog.
  Signature additions: `--source <id> --pick <name[,name...]>` (and the existing
  bundled `--experts` path stays).
- Reuses `render-expert`: skills → `skills/<id>/SKILL.md` (portable, all tools);
  agents → per-tool render (Claude `.md`, Codex `.toml`, Antigravity workflow).
- Writes/updates **`.aics-experts.json`** in the project root:
  ```json
  { "version": 1, "experts": [
    { "id": "code-reviewer", "source": "everything-claude-code", "sourcePath": "plugins/qa/agents/code-reviewer.md",
      "type": "agent", "ref": "<sha>", "installedAt": "<date-from-args>", "tools": ["claude","codex"] }
  ]}
  ```
- Targets the **detected** tools (caller passes the list, derived from
  `ensure-tools.js all --check`); `--yes` gate + `safeJoin` + id validation unchanged.
- `installedAt` is passed in by the caller (scripts cannot call `Date.now()` in the
  workflow context; the SKILL/CLI supplies the date string).

### 6. Update — `install-experts.js --update`
- Reads `.aics-experts.json` → for each distinct source, `fetchSource` (current HEAD)
  → re-render each recorded pick → compare to installed file → show a **diff/preview**
  (changed / unchanged / removed-upstream) → only writes with `--yes`.
- Updates `ref`/`installedAt` in the manifest for refreshed items.

### 7. Staleness hint
- `project-init` / `catchup` reads `.aics-experts.json`: if present, prints
  "N experts from <sources>, installed <date>; run `install-experts --update` to refresh."
  No automatic action.

### 8. Offline fallback
- The bundled Approach-A catalog (`catalog/catalog.json` + `catalog/specs/`) remains.
  If no network or a source is unreachable, bundled experts still install. The SKILL
  prefers live sources when reachable, falls back to bundled otherwise.

### 9. Generation fallback (layer 3)
- When neither the bundled catalog nor the trusted sources have a fit for a niche
  project need, the agent (in the SKILL) **authors a canonical spec** (frontmatter
  `id`/`kind`/`description` + Markdown body) for the missing skill/agent, writes it to
  a temp file, and runs `install-experts.js --generate --spec-file <path>`.
- The installer `parseSpec`s the file and renders it per detected tool via the same
  `renderExpert` pipeline; manifest entry is `{ source: "generated", ref: "local" }`.
- `--update` **skips** `source:"generated"` entries (nothing to re-fetch; they are
  locally authored). The agent can re-author/`--force` if it wants to revise one.
- Security: generated content is instruction text the agent wrote — no third-party
  code, no fetch, no execution. Same `--yes` gate, `safeJoin`, and id validation apply.
- Order: generation is the LAST resort (quality of community skills > LLM-improvised),
  used only for gaps the first two layers cannot fill.

---

## Data flow

```
role/--about + detect-stack
        │  (agent, in SKILL)
        ▼
pick relevant sources ──► fetch-source (clone --depth1, pin SHA, reject symlinks)
        │                          │
        ▼                          ▼
   scan-source  ───────────►  list available skills/agents
        │  (agent ranks/filters to project)
        ▼
   propose picks ──(user --yes)──► install-experts --source/--pick
        │                                   │
        ▼                                   ▼
   render-expert per detected tool    write files + .aics-experts.json
```

## Security (extends the merged model)

- Source host validated by `new URL(repo).hostname` exact match against the allowlist
  set — never substring `includes`.
- `git clone --depth 1`; resolved SHA recorded; re-clone for updates.
- After clone, reject the source if any file is a symlink (`lstatSync().isSymbolicLink()`).
- Never execute anything from a fetched source (no npm install, no hooks, no scripts);
  only read `SKILL.md` / agent `.md` text and render it.
- `--yes` approval gate for all writes; the proposal shows source + SHA.
- Fetched content is cached under the user cache dir, never written into tool config
  except via the validated render+`safeJoin` path.
- `id`/name used in destination paths validated `/^[A-Za-z0-9_-]+$/`.

## Testing (`test/smoke.js`, extended — no network)

- `catalog/sources.json` parses; every `host` is in the allowlist set; ids unique.
- `fetch-source`: host-allowlist rejects a non-listed host; a symlink in a fixture
  clone is rejected. (Use a local fixture git repo / dir; no real network.)
- `scan-source`: against a fixture source tree (each layout), returns the expected
  skills/agents with descriptions.
- `install-experts --source/--pick` against a **local fixture source**: writes the
  rendered files per tool into a temp project, writes `.aics-experts.json`, is
  idempotent, respects `--yes` (no write without it).
- `--update`: with a fixture whose content changed, preview lists the change; `--yes`
  applies and updates the manifest ref.
- Offline path: bundled catalog install still passes (regression).
- Generation: `install-experts.js --generate --spec-file <fixture>` renders the
  authored spec per tool into a temp project, writes a `source:"generated"` manifest
  entry, respects `--yes`; `--update` skips generated entries.

## Components summary

| File | Role | Action |
|------|------|--------|
| `catalog/sources.json` | trusted-source allowlist | Create |
| `lib/fetch-source.js` | clone (pinned) + allowlist + symlink reject | Create |
| `lib/scan-source.js` | enumerate skills/agents in a fetched source | Create |
| `install-experts.js` | `--source/--pick` install + `.aics-experts.json` + `--update` + `--generate` | Modify |
| `skills/project-init/SKILL.md` | agent-driven discovery + approval flow | Modify |
| `project-init.js` | staleness hint from manifest | Modify |
| `test/smoke.js` | fixtures, no network | Modify |
| `README.md` / `CHANGELOG.md` | document live discovery | Modify |

## Open implementation notes

- Verify each seed source repo with `gh repo view <owner>/<repo>` before adding to
  `sources.json`; drop any that don't resolve. Start with 3–5 well-known ones.
- `scan-source` layout handlers: implement `skills-dir`, `agents-dir`, and
  `claude-plugin-marketplace` (glob `plugins/*/{skills,agents}`); other layouts error
  clearly.
- Windows: `git clone` + cache dir under `%LOCALAPPDATA%`-equivalent via
  `os.homedir()/.cache` is fine; symlink check uses `lstatSync` (portable).
