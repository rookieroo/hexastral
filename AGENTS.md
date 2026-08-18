# AGENTS.md

Quick orientation for an agent or engineer joining this repo. Architecture
truth lives in linked docs — this is the navigation hub for all AI tools
(Cursor, Claude Code, GitHub Copilot).

## What this repo is

HexAstral is an AI-powered East Asian metaphysics product suite. Built on:

- **Backend**: Cloudflare Workers + Hono + D1 (`hexastral-api` + internal services)
- **Mobile**: Expo 54 + React Native 0.81 (satellite app matrix — see below)
- **Web**: Next.js 16 on Cloudflare via OpenNext (`hexastral-web` + LLC site)
- **Tooling**: Bun + Turborepo + Biome + Drizzle

Repo overview: [README.md](README.md).

## Where things are (top-level map)

```
apps/  (backend)   hexastral-api
       (web)       hexastral-web · useone-tech (LLC corp site)
       (mobile)    auspice-app (Yuun) · kindred-app (Yuel) · feng-app · coin-cast-app
                   · xingqi-app (Syel, post-V1) · lantai-app (Lantai, parallel)
services/          svc-{astro,notify,geocode,mailer,admin-notify,signal,tail,feng,ad-convert}
packages/          astro-core · hexastral-client · satellite-runtime · scenario-* + others
docs/              README.md · ROADMAP.md · apps/ · publish/ · setup · decisions/
```

Launch scope: **[docs/ROADMAP.md](docs/ROADMAP.md)** · Doc index: **[docs/README.md](docs/README.md)**

### Birth-info onboarding (by app class)

| Class | Apps | Birth info |
|---|---|---|
| Natal / chart | kindred-app | Required |
| Optional natal | feng-app | Optional (some chapters degrade without it) |
| Utility / oracle | auspice-app, coin-cast-app, lantai-app | Not required |
| Face / palm oracle | xingqi-app (Syel) | Required (ADR-0028 — with L/R palm + face photos) |

## AI rules — where to look

| Document | Tool | Purpose |
|---|---|---|
| **AGENTS.md** (this file) | All vibe-coding tools (Claude Code, Codex, Cursor, Gemini CLI, Copilot…) | Navigation, house rules, commands |
| **[.cursorrules](.cursorrules)** | Cursor (and tools that read it) | Code constraints for the whole monorepo + mobile satellite patterns |
| **[apps/hexastral-api/.cursorrules](apps/hexastral-api/.cursorrules)** | Cursor | API-only: D1, HMAC/Turnstile, service clients |
| **[services/.cursorrules](services/.cursorrules)** | Cursor | Internal Workers: bindings, no public routes |
| **docs/ROADMAP.md + docs/decisions/** | Human + AI | Architecture, launch scope, ADRs |

**No per-app or per-package `.cursorrules`.** Satellite apps (`apps/*-app`) and shared packages (`packages/*`) follow root `.cursorrules`; package-specific constraints belong in each package `README.md`.

## Before you start working

1. **Read [docs/ROADMAP.md](docs/ROADMAP.md)** and **[docs/README.md](docs/README.md)** — launch scope + per-app docs.
2. **Human-only launch tasks** — [docs/publish/README.md](docs/publish/README.md) (EAS, Apple, RevenueCat, designer, ja review).
3. **Read [docs/decisions/](docs/decisions/)** ADRs — naming + brand architecture.
4. **Skim the latest closed PR(s)** on GitHub to see what just shipped.
5. **Kindred / bonds work**: [packages/scenario-kindred/README.md](packages/scenario-kindred/README.md) if present; legacy Yuán docs may reference `scenario-yuan`.

## House rules

- **Pre-PMF** — aggressive refactor is OK when justified; verify "no real users" before assuming.
- **No CI.** All deploys happen locally via `wrangler` / EAS. Validation is also local — run `bun run preflight` before builds/submits. See [docs/deploy.md](docs/deploy.md).
- **bun + biome + drizzle.** Don't introduce `npm` / `eslint` / `prisma`.
- **`bunx`, never `npx`.** One-off CLIs (Expo, Wrangler, etc.) use `bunx`; prefer `bun run <script>` when defined.
- **No emojis in code or commits** unless explicitly asked.
- **HMAC v2 for mobile, Turnstile for web.** Don't add a third auth scheme.
- **`react-native-reanimated` v4 + `expo-haptics`** for new mobile motion — not RN `Animated`.
- **Always sign requests** via `@zhop/hexastral-client` + a signer; never raw `fetch` to the API.
- **Do not treat `hexastral-app` as a launch target** — retired omnibus.
- **Secrets live in Cloudflare only** (`bunx wrangler secret put` per owning worker). Never create local `.env.production.secrets` plaintext files; delete any you find.
- **Internal services are not public** — every `services/svc-*` keeps `"workers_dev": false` in its `wrangler.jsonc` (service-bindings only). Don't remove it.
- **ADR references** — old ADRs (0004–0027) have no files; cite them as bare numbers (`ADR-0019`) and resolve via [docs/decisions/README.md](docs/decisions/README.md). Only write a new ADR file for cross-app structural decisions.

## Common commands

```bash
bun install            # workspace install
bun run preflight      # full local validation: typecheck + lint + test + deps + ASO + release-config
bun typecheck          # all workspaces (turbo)
bun lint               # biome check across workspaces
bun test               # all discovered test suites (astro-core, api golden, apps, services)
bun check-deps         # version consistency across workspaces

# Per-app deploy (all local — no CI exists). Use `bun run deploy` — bare
# `bun deploy` is a RESERVED Bun subcommand and silently does nothing:
cd apps/hexastral-api && bun run deploy
cd apps/hexastral-web && bun run deploy
cd services/svc-astro && bun run deploy
cd apps/kindred-app && eas build --profile production --platform ios
cd apps/auspice-app && eas build --profile production --platform ios
cd apps/feng-app && eas build --profile production --platform ios
```

## Don't do without explicit ask

- Don't auto-`bun install` and expect it to succeed — sandboxes may lack npm registry access.
- Don't delete `useone-tech` — LLC corporate site (privacy / terms required by App Store).
- Don't add a `package.json` `"deploy"` script to a workspace that doesn't deploy independently — use `bun run deploy` in that worker's directory.
- Don't auto-deploy production or run remote D1 migrations without explicit user approval.

## Development docs — quick index (按任务找文档)

| 你在做什么 | 先读 |
|---|---|
| 改 Yuun（黄历）客户端 | [.cursorrules](.cursorrules) §3 + [docs/apps/yuun/launch.md](docs/apps/yuun/launch.md) + [ia-today-first.md](docs/apps/yuun/ia-today-first.md) |
| 改 API 路由 / D1 | [apps/hexastral-api/.cursorrules](apps/hexastral-api/.cursorrules) + `src/routes/` 既有模式；迁移走 `bun db:generate` |
| 改内部服务 | [services/.cursorrules](services/.cursorrules)（bindings、no public routes） |
| 改推送体系 | [docs/setup/push-retention-playbook.md](docs/setup/push-retention-playbook.md) + [docs/apps/yuun/push-metrics.md](docs/apps/yuun/push-metrics.md) + [free-push-quality.md](docs/apps/yuun/free-push-quality.md) |
| 改 IAP / RevenueCat | [docs/setup/revenuecat-entitlements.md](docs/setup/revenuecat-entitlements.md) + `apps/hexastral-api/src/config/products.ts`（SSOT） |
| 上架 / 提审 | [docs/publish/launch-checklist.md](docs/publish/launch-checklist.md)（no-IAP 先发说明在内） |
| 部署 / 迁移 | [docs/deploy.md](docs/deploy.md) |
| 历史决策（裸编号 ADR-XXXX） | [docs/decisions/README.md](docs/decisions/README.md) 映射表 |
| 包约束 | 各 `packages/*/README.md` |

`docs/` 不是纯业务文档：`docs/setup/` 是工程/运维（推送、RC、cron、Sentry、漏斗接线），
`docs/decisions/` + `ROADMAP.md` 是架构，`docs/apps/*/` 是产品计划+发布清单混合，
`docs/publish/` 是发布运维，`docs/research/` 是市场研究。

## When in doubt

- Code is the source of truth. The roadmap is a snapshot; the latest commit is what's real.
- If the user says "你来决定" — make an opinionated choice with cited evidence, don't ask back.
