# ADR-0005: Package boundaries (scenario, satellite, portfolio, ai-vision)

**Status**: Accepted (2026-05-16)

## Context

The monorepo had 25 `packages/*` workspaces. Several boundaries were unclear:

- `@zhop/ai-vision` documented a non-existent `svc-vision` consumer while `svc-astro` duplicated Gemini helpers.
- `scenario-bazi`, `scenario-ziwei`, and `scenario-bonds` each had a single consumer (`hexastral-app`).
- `satellite-ui` vs `@zhop/core-ui` overlap was questioned during Phase F.
- `portfolio-client` vs `hexastral-client` unification was proposed in ROADMAP §6.3.

## Decisions

### 1. `@zhop/ai-vision` stays a package; no `svc-vision` Worker

Vision primitives (Gemini client, R2 cache, Zod retry) are shared **libraries** consumed inside existing Workers:

- `services/svc-feng` — multi-image landform analysis + synthesis
- `services/svc-astro` — face/palm physiognomy (`portfolio` → `callAstro` → physiognomy)

Face Oracle mobile does **not** call Gemini directly; it uses `POST /api/portfolio/auto` → svc-astro. Consolidating on `@zhop/ai-vision` removes duplicate `svc-astro/src/lib/gemini.ts`.

Creating a dedicated `svc-vision` would add an extra Worker, secret, and service binding hop without separating prompts (physiognomy prompts already live in svc-astro).

### 2. `scenario-*` — two patterns

| Pattern | Packages | Rule |
|--------|----------|------|
| **Cross-product** | `scenario-yuan`, `scenario-feng`, `scenario-dream`, `scenario-palmface` | Keep as packages when 2+ apps or web share UI + hooks + API facades. |
| **Single-consumer** | ~~`scenario-bazi`~~, ~~`scenario-ziwei`~~, ~~`scenario-bonds`~~ | Inlined into `apps/hexastral-app/components/{bazi,ziwei,bonds}/` and packages deleted. The pre-existing `components/bond-radar/` (yiching radar chart) is a separate concern and remains untouched. |

`scenario-feng` remains shared by `feng-app` and `compass-app` (Compass is a Fēng funnel satellite; 24山/八卦 overlay is intentional — Option A).

### 3. `satellite-ui` — keep separate from `core-ui`

- **`core-ui`**: brand-agnostic primitives (Button, Card, Pill, EmptyState, theme provider).
- **`satellite-ui`**: satellite **flow** composites (onboarding, paywall, history list, share card) used by coin-cast, face-oracle, dream-oracle, numerology.

Do not merge into `core-ui` — flagships would inherit RevenueCat / satellite-only peer dependencies.

### 4. `portfolio-client` + `portfolio-posters` — keep; do not merge with `hexastral-client`

- **`hexastral-client`**: Hono RPC for logged-in flagship + web surfaces.
- **`portfolio-client`**: anonymous DDL session + `runPreview` / `runAuto` / `runLinked` for `/api/portfolio/*` multi-target endpoints.
- **`portfolio-posters`**: share poster layout only (depends on `satellite-ui` for `SatelliteShareCard`).

ROADMAP §6.3 “drop portfolio-client” is **rejected** — different auth model and error taxonomy; merging would break satellite anonymous flows.

## Consequences

- Package count: 25 → 22 (removed three inlined scenario packages).
- `svc-astro` depends on `@zhop/ai-vision`; `@google/genai` is not a direct svc-astro dependency.
- New scenario packages should only be created when a second consumer exists or is committed in the same PR.
