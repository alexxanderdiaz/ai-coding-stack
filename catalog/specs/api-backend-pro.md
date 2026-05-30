---
id: api-backend-pro
kind: skill
description: Backend/API patterns — validation, error handling, persistence, auth.
---
# API / Backend Pro

Apply when building or changing server endpoints or services.

## Principles
- Validate all input at the boundary; never trust external data.
- Use a consistent response envelope (status, data, error).
- Parameterized queries only — never string-build SQL.
- Handle errors explicitly; return safe messages, log detail server-side.
- Authn/authz on every protected route; rate-limit public endpoints.
- Keep handlers thin; put logic in testable units.

## Checklist before done
- [ ] Inputs validated; bad input returns a clear 4xx.
- [ ] No secrets in code (env/secret manager).
- [ ] Errors don't leak internals.
- [ ] Tests cover happy path + one failure path per endpoint.
