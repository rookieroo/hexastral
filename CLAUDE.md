# CLAUDE.md

Quick orientation for an agent or engineer joining this repo. The detailed
guidance lives in linked files — this is a navigation hub.

## What this repo is

HexAstral is an AI-powered East Asian metaphysics product suite. Built on:

- **Backend**: Cloudflare Workers + Hono + D1 (single `hexastral-api` + 7 internal services)
- **Mobile**: Expo 54 + React Native 0.81 (8 satellite apps — see below)
- **Web**: Next.js 15 on Cloudflare via OpenNext (1 product surface + 1 LLC site)
- **Tooling**: Bun + Turborepo + Biome + Drizzle

Repo overview is in [README.md](README.md).

## Where things are (top-level map)

```
apps/  (backend)   hexastral-api
       (web)       hexastral-web · useone-tech (LLC corp site)
       (mobile)    fate-app · yuan-app · cycle-app · feng-app · numerology-app
                   coin-cast-app · dream-oracle-app · face-oracle-app
services/          svc-{astro,signal,notify,geocode,mailer,admin-notify,tail}
packages/          hexastral-tokens · hexastral-client · scenario-yuan + 18 others
docs/              ROADMAP.md + decisions/000N-*.md  ← start here for context
```

Birth-info onboarding required: **fate / yuan / cycle / numerology** (4).
Optional: **feng**. None: **coin-cast / dream-oracle / face-oracle** (oracle class).

A combined "flagship" app (was working name `hexastral-app`, 命緣卦道) was scoped
in early planning but is **not implemented**. References below are stale; keep
the slot reserved if you find them, but don't assume the directory exists.

## Before you start working

1. **Read [docs/ROADMAP.md](docs/ROADMAP.md)** — current phase, what's queued, what NOT to do.
2. **Human-only launch tasks** — [docs/local-manual-checklist.md](docs/local-manual-checklist.md) (EAS, Apple, RevenueCat, designer, ja review).
3. **Read [docs/decisions/](docs/decisions/)** ADRs — naming + brand architecture.
4. **Skim the latest closed PR**(s) on GitHub to see what just shipped.
5. If working on Yuán: also read [packages/scenario-yuan/README.md](packages/scenario-yuan/README.md) and [MIGRATION.md](packages/scenario-yuan/MIGRATION.md).

## House rules (carry-over from PR #1)

- **No real users yet** (as of 2026-05-14) — pre-PMF, aggressive refactor is OK. Verify before assuming.
- **CI is validation-only.** Deploys happen locally via `wrangler` / EAS. See [deploy.md](deploy.md).
- **bun + biome + drizzle.** Don't introduce `npm` / `eslint` / `prisma`.
- **No emojis in code or commits** unless explicitly asked.
- **HMAC v2 for mobile, Turnstile for web.** Don't add a third auth scheme.
- **`react-native-reanimated` v4 + `expo-haptics`** for any new mobile motion. Don't fall back to RN `Animated`.
- **Always sign requests via `@zhop/hexastral-client` + a signer; never raw fetch.**

## Common commands

```bash
bun install            # workspace install
bun typecheck          # all workspaces (turbo)
bun lint               # biome check across workspaces
bun test               # astro-core + svc-fortune + hexastral-api golden test
bun check-deps         # version consistency across workspaces

# Per-app deploy (local; CI does NOT deploy):
cd apps/hexastral-api && bun deploy
cd apps/hexastral-web && bun deploy
cd services/svc-astro && bun deploy
cd apps/yuan-app && eas build --profile production --platform ios
```

## Don't do without explicit ask

- Don't auto-`bun install` and expect it to succeed — past sandboxes had no npm registry.
- Don't delete `useone-tech` — it's the LLC corporate site (privacy / terms required by App Store).
- Don't add a `package.json` `"deploy"` script to a service workspace that doesn't deploy independently. The pattern is per-worker `bun deploy` in its own directory.

## When in doubt

- Code is the source of truth. The roadmap is a snapshot; the latest commit is what's real.
- If the user says "你来决定" — make an opinionated choice with cited evidence, don't ask back.
