---
id: python-pro
kind: skill
description: Idiomatic Python — typing, structure, pytest, packaging.
---
# Python Pro

Apply in Python projects.

## Principles
- PEP 8; type hints on public function signatures; prefer f-strings.
- Small functions, single responsibility; Google-style docstrings on public APIs.
- Validate input at boundaries; raise specific exceptions; never swallow errors.
- Use `pytest`; prefer behavior tests over implementation-detail tests.

## Checklist before done
- [ ] Public functions typed and documented.
- [ ] `pytest` passes; new behavior has tests.
- [ ] Lint clean (`ruff check .` or project linter).
