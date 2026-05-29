# Security Policy

## Supported versions

The latest published version on npm receives fixes. This is a small toolkit;
older versions are not maintained — upgrade to the latest.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use GitHub's private reporting: **Security → Report a vulnerability** on this
repository (Privately report a vulnerability). Include:

- what the issue is and where (file / command),
- how to reproduce it,
- the impact and any suggested fix.

You'll get an acknowledgement and, once confirmed, a fix and a new release.

## Scope & notes

This toolkit runs locally and shells out to `node`, `git`, `winget`/`brew`/`npm`,
and the AI tool CLIs. Keep in mind:

- It never stores credentials or tokens. You authenticate each AI tool with your
  own account.
- All external commands run via `execFileSync(cmd, [args])` (no shell string
  interpolation) to avoid command injection.
- `project-init` writes files into the current project directory; review them
  before committing.
- The optional `sync/backup.sh` excludes secrets (`auth.json`, `.env*`, tokens)
  — still review archives before pushing them anywhere.

Releases are published to npm with **provenance** via GitHub Actions Trusted
Publishing (OIDC, no long-lived tokens).
