---
id: devops-infra-pro
kind: skill
description: Infra/DevOps — containerization, IaC, CI/CD, least-privilege.
---
# DevOps / Infra Pro

Apply in infra/DevOps work.

## Principles
- Infrastructure as code; no manual drift; review plans before apply.
- Least-privilege IAM; no long-lived secrets in code or images.
- Small, reproducible container images; pin base image versions.
- CI: run tests + lint on every change; fail fast; cache deps.
- Make rollbacks possible; prefer immutable deploys.

## Checklist before done
- [ ] No secrets in code/images (use a secret store).
- [ ] IaC change reviewed via plan/diff before apply.
- [ ] CI runs tests + lint and blocks on failure.
