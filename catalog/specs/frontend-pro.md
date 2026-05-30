---
id: frontend-pro
kind: skill
description: Frontend patterns — components, state, accessibility, performance.
---
# Frontend Pro

Apply when building or changing UI.

## Principles
- Small, focused components; lift state only as far as needed.
- Type component props explicitly; avoid `any`.
- Accessibility: semantic elements, labels, keyboard focus, color contrast.
- Performance: memo only after measuring; avoid unnecessary re-renders; lazy-load heavy routes.
- Keep side effects in effects/handlers, not in render.

## Checklist before done
- [ ] Props typed; no `any`.
- [ ] Interactive elements are keyboard-accessible and labeled.
- [ ] No layout shift on load for key views.
- [ ] Errors and loading states handled in the UI.
