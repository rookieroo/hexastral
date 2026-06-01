# Docs: repo adjustment & local ops index

> This file previously held a misplaced package-audit draft. As of **2026-05-16** it points to the canonical checklists below.

## Where to look

| Question | Document |
|----------|----------|
| **What must I do on my machine?** (EAS, Apple, RevenueCat, CF, designer, ja review) | **[local-manual-checklist.md](local-manual-checklist.md)** |
| What phases shipped in code? | [ROADMAP.md](ROADMAP.md) |
| Phase F week-by-week + decisions | [phase-f-plan.md](phase-f-plan.md) |
| Per-app core-ui / API envelope notes | [phase-f-migration-notes.md](phase-f-migration-notes.md) §16 |
| Deploy order | [deploy.md](../deploy.md) |
| Package boundaries (scenario / portfolio / ai-vision) | [decisions/0005-package-boundaries.md](decisions/0005-package-boundaries.md) |

## Package cleanup (2026-05-16) — done in repo

- `@zhop/ai-vision` consumed by `svc-feng` + `svc-astro` (no `svc-vision` worker).
- `scenario-bazi` / `scenario-ziwei` / `scenario-bonds` inlined into `hexastral-app`; packages removed.
- `portfolio-client` retained (see ADR-0005).
