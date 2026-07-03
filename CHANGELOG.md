# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); this project
follows [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- **ZAI Code (ZCode, Zhipu GLM) support:** ZAI Code is now a first-class target alongside the other six tools. It reads workspace `AGENTS.md` natively (so `project-init` context works out of the box), and `install-experts` renders **skills** to `~/.zcode/skills/<id>/SKILL.md` (global scope, like Codex; format verified against the app's bundled `zcode-configuration-guide` and its own skills on disk — identical Claude/opencode frontmatter). **Skills-only:** ZCode has no standalone subagent install path — its `zcode.cjs` discovers subagents only inside a skill's or plugin's `agents/` subdir, or via the Settings → Subagents GUI (there is no top-level `~/.zcode/agents`). Agent-kind experts are therefore skipped for zcode with a note (add them via the GUI or a plugin). `supportsKind()` gates this; detected by `/Applications/ZCode.app` on macOS via `ensure-tools` / `setup`.
- **`install-experts --list`:** read-only overview of what's installable and what's already in the project — bundled catalog experts, the trusted-source allowlist, and the experts recorded in `.aics-experts.json` (id, source, ref, tools). Narrow with `--catalog`, `--sources`, or `--installed`. Replaces `cat catalog/catalog.json` / `cat .aics-experts.json`.

### Changed
- **`project-init` arg parsing hardened (preventive):** the root `project-init.js` and the bundled `skills/project-init/project-init.js` resolved `<dir>` with a heuristic that only excluded the `--about` value. Today `--about` is the only value-taking flag, so nothing was broken, but any future `--flag <value>` would have had its value mis-read as the project directory. Both now use a `VALUE_FLAGS` set (matching `install-experts`) so the contract is explicit and future-proof. Regression tests added.

### Fixed
- **`install-experts` dir-omission arg parsing:** when `<dir>` was omitted, the value of any value-taking flag other than `--tools`/`--experts` (`--source-id`, `--pick`, `--layout`, `--ref`, `--spec-file`, `--source-path`, `--source-path-map`) was mis-read as the project directory, producing `directory not found` on the flag value itself. All value-taking flags are now enumerated and their following token skipped; `<dir>` correctly falls back to the current directory.

## [0.2.10] - 2026-05-31
### Fixed
- **`project-init` STATE.md double period (in-tool scaffolder):** 0.2.9 fixed the root `project-init.js`, but the bundled in-tool scaffolder (`skills/project-init/project-init.js`) — the one that actually runs when you say "project-init" inside a tool — had the same bug. Trailing dots in `--about` now stripped there too.

## [0.2.9] - 2026-05-31
### Fixed
- **Codex experts left no trace in the project:** Codex installs globally (`~/.codex`), so a project's `.codex/` stayed empty after a successful install and read as a failed setup. `install-experts` now writes a `.codex/README.md` pointer (from all three install paths — bundled, source, generate) explaining the experts live in `~/.codex` and pointing at the `.aics-experts.json` manifest.
- **`project-init` STATE.md double period:** an `--about` value ending in `.` produced `Project just initialized: ...alerts..`. Trailing dots/whitespace are now stripped before composing the line.
### Changed
- Docs (`project-init` SKILL.md + README): clarified that `project-init` is **run once, cross-tool** (not per-tool), that the prerequisite is the tools being **installed** (not authenticated), and that **Codex is global by design**.

## [0.2.8] - 2026-05-31
### Fixed
- **Layer-2 live skill discovery was fully broken:** `fetch-source` aborted the entire source clone if it contained *any* symlink (e.g. antigravity-awesome-skills has 7), so domain-specific discovery never ran. Fetch now warns and continues; symlinks are still rejected per-picked-item at install time (where files are actually copied).

## [0.2.7] - 2026-05-31
### Fixed
- In-tool `project-init` generated AGENTS.md/STATE.md with **Spanish** section headers in the public (English) repo — the bundled scaffolder template is now fully English.
### Changed
- `project-init` SKILL.md now **requires asking the user what the project is about** before generating (no silent inference from folder/README), and makes **Layer-2 live skill discovery required for domain-specific projects** (e.g. a Fortinet project pulls network/security skills, not just the generic bundled roles).

## [0.2.6] - 2026-05-31
### Changed
- Docs (README + ARCHITECTURE) now list the stack-detection coverage: Terraform, Azure Bicep, Shell, and Azure CLI/azd (alongside Node/Python/Go/Rust/Java/Docker), with example commands.

## [0.2.5] - 2026-05-31
### Added
- `detect-stack` now recognizes **Shell** projects (`*.sh`, with a `shellcheck` lint command) and **Azure CLI / azd** projects (`azure.yaml` / `.azure/`). Script/automation repos are no longer reported as "stack not recognized".

## [0.2.4] - 2026-05-31
### Added
- `detect-stack` now recognizes **Terraform** (`*.tf` anywhere in the tree — modules/, environments/, not just root) and **Azure Bicep** (`*.bicep`), with real commands (Terraform: init/validate/fmt/plan · Bicep: build/lint). IaC projects are no longer reported as "stack not recognized".

## [0.2.3] - 2026-05-31
### Fixed
- The in-tool `project-init` (bundled `skills/project-init/project-init.js`) now writes
  **CLAUDE.md** (pointer to AGENTS.md) in addition to AGENTS.md + STATE.md — it previously
  skipped CLAUDE.md, diverging from the root scaffolder and the documented behavior.

## [0.2.2] - 2026-05-31
### Fixed
- npm package now ships `install-experts.js` and `catalog/` (were missing from `files`),
  so expert discovery / `project-init` work when installed via npm, not only from a git clone.
### Added
- README: **Install via npm** (`npx ai-coding-stack` / `npm i -g`) and a **screen-by-screen
  walkthrough of the setup wizard** (detection, tool selection + "All tools" row, prereq
  bootstrap, install+configure, merge/fresh-backup, auth, optional scaffold).
### Changed
- `package.json` description/keywords updated for the 6-tool + MCP + wizard scope.

## [0.2.1] - 2026-05-31
### Added
- Visible **"All tools"** row in the multi-select (toggle with space/enter; `0`/`all` in the numbered fallback).
### Changed
- Wizard prints a clear **"✓ Setup complete"** line at the end (and on the scaffold "No" path), so it's obvious the install/config already finished.

## [0.2.0] - 2026-05-30
### Added
- **First-run wizard** (`node setup.js`, no flags): detects which tools are installed, then in one
  step installs the missing ones **and** applies the ready-to-use config to every selected tool
  (new + already-installed) — Context7 MCP + the in-tool `project-init` command. Ends with an
  optional "scaffold the current folder now?" prompt.
- **Don't-clobber config:** when a selected tool already has MCP servers, the wizard asks once —
  **merge** (keep yours, add Context7) or **fresh + backup** (`.bak-<timestamp>` then clean write).
- **Prerequisite bootstrap:** `ensure-tools.js` auto-installs Node.js/npm if missing
  (apt/dnf/pacman/zypper/apk · Homebrew · winget) before installing tools; `--no-deps` to skip.
- **Arrow-key TUI menu** (`lib/tui.js`, zero-dependency): ↑/↓ navigation, space multi-select,
  colors (`NO_COLOR` aware), with a numbered readline fallback on non-TTY shells.
- **In-tool `project-init` command:** installed into each compatible tool's global skills dir
  (Claude/opencode/Codex/Antigravity) during setup, so "project-init" is runnable in-session and
  scaffolds + configures whatever a project needs. (Cursor/Windsurf use per-project rules.)
- **Multi-tool expansion:** opencode (CLI, native SKILL.md support, `npm i -g opencode-ai`),
  Cursor (GUI IDE, skills → `.cursor/rules/*.mdc`), Windsurf (GUI IDE, agents → `.windsurf/workflows/*.md`,
  skills → `.windsurf/rules/*.md`). All 6 tools now read `AGENTS.md` natively.
- **MCP propagation:** `lib/propagate-mcp.js` writes Context7 (and other MCP servers) into each tool's
  native config using env-interpolation syntax (`{env:VAR}` for opencode/Cursor, `${env:VAR}` for Windsurf),
  so API keys never touch disk — only environment (`CONTEXT7_API_KEY`).
- Per-tool skill/agent rendering in `lib/render-expert.js`: opencode/Claude/Codex/Antigravity use native
  SKILL.md; Cursor/Windsurf map skills → rules; agents → per-tool native format (agents not supported in Cursor).
- Tool selection: install any subset of the six tools (`setup.js --tools claude,codex,opencode`,
  menu sub-prompt, `setup.ps1 -Tools`, `ensure-tools.js claude,codex,opencode`).
- Expert discovery: bundled `catalog/` of skills/agents, `lib/match-experts.js`,
  `lib/render-expert.js`, and `install-experts.js` — render best-fit experts to each
  tool's native format (Claude `.md`, Codex `.toml`, Antigravity workflow) with
  `project-init --with-experts` and an approval-gated (`--yes`) skill flow.
- Live expert discovery (3 layers, quality-first): `catalog/sources.json` allowlist
  (permissive-license, host-checked) + `lib/fetch-source.js` (pinned clone, symlink reject)
  + `lib/scan-source.js`; install from fetched sources with a `.aics-experts.json` provenance
  manifest and `install-experts.js --update` (preview + `--yes`). `--generate` authors a
  bespoke skill/agent for niche gaps (`source:"generated"`, skipped by `--update`).
  Agent-driven selection via the project-init skill; bundled catalog = offline fallback.
- Trusted discovery source `sickn33-antigravity-awesome-skills` (1.5k+ SKILL.md library,
  tag-scoped to data-ai/azure/rag/ml/security/architecture; quality uneven, cherry-pick
  recommended).
- Optional Context7 docs MCP (bring-your-own-key, never stored in repo; provides
  version-accurate library docs for Next.js, React, Tailwind, etc.).

### Changed
- All setup/log strings are English-only; the menu is more descriptive (per-option
  explanations, CLI vs IDE labels); manual-install messages now include download URLs.
- `--tools` / `--all` now also apply config (not just install); added `--fresh`.

### Fixed
- CLI-first tools (Claude/Codex) no longer print a misleading "GUI missing — install
  manually" nag on platforms where no desktop app exists; shows a soft info line instead.

## [0.1.1] - 2026-05-29
### Added
- GitHub Release creation in the `release` workflow (auto-generated notes on tag).
- Community files: `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`.

### Changed
- First release published to npm via Trusted Publishing (OIDC + provenance, no tokens).

## [0.1.0] - 2026-05-29
### Added
- Initial public release.
- `ensure-tools.js` — detect and install GUI + CLI for Claude Code, Codex, Antigravity.
- `project-init.js` — cross-tool project scaffolder: `AGENTS.md` (single source) +
  `CLAUDE.md`/`GEMINI.md` pointers + `STATE.md`, with auto-detected real commands.
- `lib/detect-stack.js` — language/framework/command detection.
- `hooks/state-snapshot.js` — Claude Stop hook for git snapshots in `STATE.md`.
- Session continuity: `catchup` / `wrapup`.
- `setup.js` menu + `setup.sh`/`setup.ps1` bootstrappers.
- `skills/project-init/` in-tool trigger for Codex/Antigravity.
- `sync/backup.sh` + `restore.sh` (optional, env-configured, secrets excluded).
- Docs (Architecture, Usage, project-init), smoke tests + CI, MIT license.

[Unreleased]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.2.8...HEAD
[0.2.8]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/alexxanderdiaz/ai-coding-stack/releases/tag/v0.1.1
[0.1.0]: https://github.com/alexxanderdiaz/ai-coding-stack/releases/tag/v0.1.0
