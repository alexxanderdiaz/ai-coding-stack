---
id: ml-data-pro
kind: skill
description: ML/Data workflows — reproducibility, data hygiene, evaluation.
---
# ML / Data Pro

Apply in ML/data projects.

## Principles
- Reproducibility: pin seeds, versions, and data snapshots; record params.
- Separate data prep, training, and evaluation into distinct steps.
- Never leak test data into training; hold out a clean evaluation set.
- Track metrics over time; compare against a baseline before claiming gains.
- Keep notebooks for exploration; move reusable code into modules.

## Checklist before done
- [ ] Run is reproducible (seed + versions recorded).
- [ ] No train/test leakage.
- [ ] Result compared to a baseline with a stated metric.
