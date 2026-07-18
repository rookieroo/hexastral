# AGENTS.md

Quick orientation for an agent or engineer joining this repo. Architecture
truth lives in linked docs — this is the navigation hub for all AI tools
(Cursor, Claude Code, GitHub Copilot).

## What this repo is

HexAstral is an AI-powered East Asian metaphysics product suite. Built on:

- **Backend**: Cloudflare Workers + Hono + D1 (`hexastral-api` + internal services)
- **Mobile**: Expo 54 + React Native 0.81 (satellite app matrix — see below)
- **Web**: Next.js 15 on Cloudflare via OpenNext (`hexastral-web` + LLC site)
- **Tooling**: Bun + Turborepo + Biome + Drizzle

Repo overview: [README.md](README.md).

## Where things are (top-level map)

```
apps/  (backend)   hexastral-api
       (web)       hexastral-web · useone-tech (LLC corp site)
       (mobile)    auspice-app (Yuun) · kindred-app (Yuel) · feng-app · coin-cast-app
                   + post-V1: numerology · dream-oracle · xingqi-app (Xingqi)
services/          svc-{astro,fortune,notify,geocode,mailer,admin-notify,signal,tail}
packages/          astro-core · hexastral-client · satellite-runtime · scenario-* + others
docs/              README.md · ROADMAP.md · apps/ · publish/ · setup/ · decisions/
```

Launch scope: **[docs/ROADMAP.md](docs/ROADMAP.md)** · Doc index: **[docs/README.md](docs/README.md)**

### Birth-info onboarding (by app class)

| Class | Apps | Birth info |
|---|---|---|
| Natal / chart | kindred-app, numerology-app | Required |
| Optional natal | feng-app | Optional (some chapters degrade without it) |
| Utility / oracle | auspice-app, coin-cast-app, dream-oracle-app | Not required |
| Face / palm oracle | xingqi-app (Xingqi) | Required (ADR-0028 — with L/R palm + face photos) |

## AI rules — where to look

| Document | Tool | Purpose |
|---|---|---|
| **AGENTS.md** (this file) | All | Navigation, house rules, commands |
| **[.cursorrules](.cursorrules)** | Cursor | Code constraints for the whole monorepo + mobile satellite patterns |
| **[apps/hexastral-api/.cursorrules](apps/hexastral-api/.cursorrules)** | Cursor | API-only: D1, HMAC/Turnstile, service clients |
| **[services/.cursorrules](services/.cursorrules)** | Cursor | Internal Workers: bindings, no public routes |
| **[.github/copilot-instructions.md](.github/copilot-instructions.md)** | GitHub Copilot | Inline code-generation bans (Theme, cards, icons) |
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
- **CI is validation-only.** Deploys happen locally via `wrangler` / EAS. See [deploy.md](deploy.md).
- **bun + biome + drizzle.** Don't introduce `npm` / `eslint` / `prisma`.
- **No emojis in code or commits** unless explicitly asked.
- **HMAC v2 for mobile, Turnstile for web.** Don't add a third auth scheme.
- **`react-native-reanimated` v4 + `expo-haptics`** for new mobile motion — not RN `Animated`.
- **Always sign requests** via `@zhop/hexastral-client` + a signer; never raw `fetch` to the API.
- **Do not treat `hexastral-app` as a launch target** — retired omnibus ([archive ADR-0009](docs/archive/decisions/0009-two-layer-matrix.md)).

## Common commands

```bash
bun install            # workspace install
bun typecheck          # all workspaces (turbo)
bun lint               # biome check across workspaces
bun test               # astro-core + svc-fortune + hexastral-api golden tests
bun check-deps         # version consistency across workspaces

# Per-app deploy (local; CI does NOT deploy):
cd apps/hexastral-api && bun deploy
cd apps/hexastral-web && bun deploy
cd services/svc-astro && bun deploy
cd apps/kindred-app && eas build --profile production --platform ios
cd apps/auspice-app && eas build --profile production --platform ios
cd apps/feng-app && eas build --profile production --platform ios
```

## Don't do without explicit ask

- Don't auto-`bun install` and expect it to succeed — sandboxes may lack npm registry access.
- Don't delete `useone-tech` — LLC corporate site (privacy / terms required by App Store).
- Don't add a `package.json` `"deploy"` script to a workspace that doesn't deploy independently — use `bun deploy` in that worker's directory.
- Don't auto-deploy production or run remote D1 migrations without explicit user approval.

## When in doubt

- Code is the source of truth. The roadmap is a snapshot; the latest commit is what's real.
- If the user says "你来决定" — make an opinionated choice with cited evidence, don't ask back.
