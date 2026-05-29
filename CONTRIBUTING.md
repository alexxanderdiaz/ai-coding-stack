# Contributing to ai-coding-stack

Thanks for your interest! This is a small, dependency-free Node toolkit — contributions that keep it lean and cross-platform are very welcome.

## Ground rules

- **No runtime dependencies.** Everything is plain Node (`fs`, `path`, `child_process`, `os`). Keep it that way.
- **Cross-platform.** Code must work on Windows, Linux, and macOS. Use `path.join`, `os.homedir()`, and `execFileSync(cmd, [args])` (never shell string interpolation).
- **No personal data.** Never commit tokens, credentials, machine paths, or anything user-specific.
- **Keep generated context lean.** The `project-init` templates follow the agents.md best practices (concise, critical-first, pair prohibitions with alternatives). Don't bloat them.

## Dev setup

```bash
git clone https://github.com/alexxanderdiaz/ai-coding-stack.git
cd ai-coding-stack
node test/smoke.js     # run the smoke tests
```

No build step. Edit the scripts directly.

## Before opening a PR

1. **Run the smoke tests:** `node test/smoke.js` (or `npm test`) — must be green.
2. **Syntax-check** any script you touched: `node -c <file>`.
3. If you added behavior, add a check to `test/smoke.js`.
4. Keep diffs focused; one logical change per PR.

## Commit & PR style

- **Conventional commits:** `feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `refactor:`, `test:`.
- Small, focused PRs with a short description of *what* and *why*, and how you tested.
- CI (smoke tests on Ubuntu/Windows/macOS) must pass.

## Adding support for another tool

1. Add the tool to `ensure-tools.js` (`REG`: detection + per-OS install).
2. If it reads `AGENTS.md`, it already benefits from `project-init` — no extra work.
3. If it has its own context file, extend `project-init.js` to emit a short pointer to `AGENTS.md`.
4. Update the README table and add a smoke check.

## Releases

Maintainers publish via npm Trusted Publishing (OIDC, no tokens): `npm version patch && git push --follow-tags` triggers the `release` workflow.

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE).
