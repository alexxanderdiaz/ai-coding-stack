# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); this project
follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
