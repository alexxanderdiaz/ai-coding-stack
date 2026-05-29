# Architecture

`ai-coding-stack` is a small, dependency-free Node toolkit with two jobs: **install** AI coding tools and **scaffold** projects for them — plus session continuity.

```mermaid
flowchart TD
    S[setup.js / setup.sh / setup.ps1] --> M{Menu}
    M -->|tools| ET[ensure-tools.js<br/>install GUI+CLI if missing]
    M -->|init| PI[project-init.js<br/>scaffold cwd]
    ET --> AUTH[You authenticate each tool<br/>with your own account]
    PI --> FILES[CLAUDE.md · AGENTS.md · GEMINI.md · STATE.md]
```

## Tool install (ensure-tools.js)

Per-OS, data-driven. Detects the CLI (on PATH) and GUI (winget list / app dir); installs what's missing.

| Tool | GUI | CLI |
|------|-----|-----|
| Claude Code | `Anthropic.Claude` | `Anthropic.ClaudeCode` (`claude`) |
| Codex | (macOS-first; CLI covers Win/Linux) | `OpenAI.Codex` (`codex`) |
| Antigravity | `Google.Antigravity` | `Google.AntigravityCLI` (`agy`) |

Windows = winget (verified IDs); macOS = brew/npm; Linux = npm (GUIs: manual note).

## Context files — single source of truth

```mermaid
flowchart LR
    A["AGENTS.md (source of truth)<br/>goal, commands, structure,<br/>patterns, permissions, continuity"]
    A --> C["CLAUDE.md (pointer)"]
    A --> G["GEMINI.md (pointer + Antigravity overrides)"]
```

`AGENTS.md` is the cross-tool standard (Codex, Antigravity v1.20.3+, Cursor). Edit it once → every tool stays in sync. `CLAUDE.md` and `GEMINI.md` are short pointers.

## Continuity (context vs progress)

- **AGENTS.md** = *context* (what the project is). Static-ish, single source.
- **STATE.md** = *progress* (where you left off). Dynamic, shared by all tools.

```mermaid
flowchart LR
    W["wrapup (any tool)"] --> S[STATE.md]
    H["Claude Stop hook<br/>state-snapshot.js"] --> S
    S -->|catchup reads STATE.md + git| R[Resume anywhere]
```

## Stack detection (lib/detect-stack.js)

Reads `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` / `pom.xml` / Gradle / Docker / Terraform → `{ languages, frameworks, commands{build,test,lint,dev}, suggestedProfile, isEmpty }`. Drives the real commands written into the context files.
