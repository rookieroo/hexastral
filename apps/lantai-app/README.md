# Lantai (`apps/lantai-app`)

**Lantai** (兰台) — subtitle **Flare for Notion**. Bundle `com.hexastral.lantai`, scheme `lantai`.

Plan: [docs/apps/lantai/plan.md](../../docs/apps/lantai/plan.md) (v0.10) · consent memo: [docs/apps/lantai/legal-feasibility.md](../../docs/apps/lantai/legal-feasibility.md).

Wave 2 parallel track. Scaffold is Yuun infrastructure (Expo 54, HMAC, `satellite-runtime`, CoreUI) **without** almanac / widgets / `astro-core`. Theme: zinc, light-default, accent `zinc[900]`.

## v1a (this scaffold)

Current code still uses `shortcuts://run-shortcut?…configId` and `GET /s/:id`. **Plan v0.10 supersedes that:** App writes `config_id` to iCloud slot files; Shortcuts read a fixed path; `/s/:id` is legacy-only.

- Apple / Google portfolio sign-in, then Notion OAuth (`/api/lantai/oauth/*`)
- **Core:** pick a database already in the user’s workspace, introspect properties, toggle fields
- Optional starters (journal / inbox / links / habits) only pre-fill a name

Not in this app yet: AI ingest, iCloud slot writer, APNs on job complete, 精气神 capture (Syel **Sync to Notion** is separate), NativeWind 黄历 cards, widget-kit, Watch, `svc-notion`, writing `/Shortcuts/` from the app.

## Local

```bash
cd apps/lantai-app
bun install   # from repo root
bun run dev
```

EAS project id and RevenueCat keys are placeholders until `eas init` + ASC SKUs exist. Do not deploy production API / D1 until the user approves `bun db:migrate:prod`.
