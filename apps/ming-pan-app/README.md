# ming-pan-app (命 · 八字 + 紫微) — FROZEN, donor to Kindred

Personal-fate reading — 八字 four-pillar + 紫微 12-palace, LLM report chapters,
native chart views. Fully built, **never ships as a standalone app**.

## Status (see ADR-0021 / ADR-0022)

- **Frozen** per [ADR-0019](../../docs/decisions/0019-v1-wave-narrowed-cycle-feng-yuan.md):
  must keep building + typechecking; it is the ADR-0018 design-language reference.
- **Disposition** per [archive ADR-0022](../../docs/archive/decisions/0022-mingpan-disposition-donor-not-launch.md):
  this app is the **donor frame for kindred-app** — its compute libs
  (`lib/natal.ts`, `lib/ziwei.ts`, `lib/reading.ts`, `lib/reading-cache.ts`),
  report UI, and chart views are being ported into Kindred (ADR-0021 phases
  K1–K2). Once K1/K2 are verified in production, this app is archived per the
  ADR-0016 pattern.
- It does **not** launch. ADR-0019's MingPan restart triggers are void; a
  narrow revival clause (thin acquisition shell, no report) lives in ADR-0022.
- Bundle IDs `com.hexastral.fate` / `com.hexastral.mingpan` stay reserved.

Do not add features here. Bug fixes only if they block the monorepo build.

## Local steps still required

- `eas init` → replace `REPLACE_WITH_FATE_EAS_PROJECT_ID` in `app.json` + `eas.json`.
- Add `assets/icon.png` + `assets/splash.png` (designer brief).
- `bun install` from the repo root before `bun --filter @zhop/fate-app dev`.

## Dev

```
bun install                       # from repo root
bun --filter @zhop/fate-app dev
```
