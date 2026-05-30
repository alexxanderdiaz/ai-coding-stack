# project-init — generated files & best practices

One run writes four files at the project root:

| File | For | Content |
|------|-----|---------|
| `AGENTS.md` | Codex, Antigravity, Cursor (cross-tool) | **Source of truth**: Goal, Commands, Structure, Non-obvious patterns, Permissions, Conventions, Commits/PR, Continuity |
| `CLAUDE.md` | Claude Code | Short pointer → AGENTS.md |
| `GEMINI.md` | Antigravity | Pointer + Antigravity-only overrides |
| `STATE.md` | all | Session-continuity log |

## Best practices baked in (agents.md 2026)
- **Concise (<150 lines).** Bloated/auto-generated context lowers agent success and raises cost — keep it lean.
- **Critical rules first.**
- **Pair prohibitions with alternatives:** "Don't do X → use Y."
- **Omit defaults** the agent can infer from repo config.
- **Highest-signal section = Non-obvious patterns** — the counterintuitive things, with one real example.

## The agent fills the gaps
`Structure` and `Non-obvious patterns` ship as placeholders. Running project-init from inside a tool, the agent inspects the repo and fills them with real findings — that's where the value is.

## Flags
```
node project-init.js [dir] [--about "what it is"] [--force] [--with-experts] [--gemini]
```
- `--about` → seeds the **Goal** section (most valuable for empty/new folders).
- `--force` → overwrite existing files (default: keep).
- `--with-experts` → after writing the context files, print best-fit experts for the detected stack plus the install/preview command (`node install-experts.js . ... --dry-run`).
- `--gemini` → (in-tool skill script) also writes `GEMINI.md` for Antigravity.

## Discovering experts
After scaffolding, `project-init` can suggest and install best-fit skills/agents for your stack — bundled catalog, live trusted sources, or generated for gaps. See README "Expert discovery (skills & agents)".
