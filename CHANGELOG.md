# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); this project
follows [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- Tool selection: install any subset of the three tools (`setup.js --tools claude,codex`,
  menu sub-prompt, `setup.ps1 -Tools`, `ensure-tools.js claude,codex`).
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

[Unreleased]: https://github.com/alexxanderdiaz/ai-coding-stack/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/alexxanderdiaz/ai-coding-stack/releases/tag/v0.1.1
[0.1.0]: https://github.com/alexxanderdiaz/ai-coding-stack/releases/tag/v0.1.0
