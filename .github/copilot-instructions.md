# GitHub Copilot Instructions — HexAstral

> **Architecture SSOT:** App matrix, launch scope, and naming → [docs/ROADMAP.md](../docs/ROADMAP.md) and [AGENTS.md](../AGENTS.md). Do not trust stale references to `hexastral-app` as the main product or to renamed apps (`fate-app`, `yuan-app`, `cycle-app`).

---

## MANDATORY: Code Generation Rules

### Always Do:
- `import { z } from 'zod/v4'` (NOT `'zod'`)
- `import type` for type-only imports
- Functional style — classes only when 3+ shared dependencies
- Named exports (default exports only for React / React Native components)
- `HTTPException` for Hono API errors
- Cloudflare Rate Limiting API (NOT manual KV counters)
- Context via `c.set()` / `c.get()` — no global variables in Workers
- Read request body once, pass as parameter downstream
- `??` operator and early-return type narrowing for null safety
- Zinc palette semantic tokens for iOS theme (see Theme System below)
- Monochrome Lucide icons only in iOS UI
- Locale strings via `t()` hook — no hardcoded UI text
- iOS network data fetching: `useQuery` / `useMutation` from `@tanstack/react-query`, hooks go in `hooks/`
- iOS network images: `import { Image } from 'expo-image'` with `cachePolicy="memory-disk"`
- iOS non-sensitive persistent data: MMKV / app storage wrapper (sync, non-blocking)
- API Service Binding calls: use named clients from `lib/service-clients.ts`, not raw `binding.fetch()`
- API `db`: always obtained from `c.get('db')` — injected by `dbMiddleware`, never instantiate per-route
- Mobile API calls: sign via `@zhop/hexastral-client` — never raw `fetch`

### Never Generate:
- `any` type — use `unknown` with type guards
- `// @ts-ignore` — use `// @ts-expect-error` with explanation
- `as Type` assertions — use Zod parse or type guards
- Empty `catch {}` or silent `.catch(() => {})` — always log (via `createLogger()`) or handle
- `console.log` in production code
- Hardcoded secrets or API URLs — use Cloudflare bindings / env vars
- Hardcoded hex colors in iOS components — use `ios.*` palette from `useTheme()`
- Emoji characters in iOS UI — use Lucide icons or text
- **Colorful / rainbow wuxing-colored card borders** — no `borderLeftWidth` with `palaceColors[name]`, `brightnessColors[star]`, or per-element accent colors on list cards. Use `borderWidth: 0.5, borderColor: colors.border` uniformly
- **Left-border card pattern** (e.g. `borderLeftWidth: 3, borderLeftColor: someAccent`) — AI-generated look, banned. All cards use flat `borderWidth: 0.5, borderColor: colors.border` + `borderRadius: 0`
- **Decorative Lucide icons on settings rows, quick-action grids, or list items** — Ink-Brutalism is text-first. Do NOT decorate `SettingsRow`, profile quick-access entries, paywall list rows, or DevTools entries with icons "for visual interest". Only use icons when they convey state the user cannot infer from the label (chevron for navigation, check for selected, error/warning glyphs). Pure functional category headers (e.g. Self / Love / Work) may use a single small icon in the header row, not on each child item.
- Multiple reads of the same request body
- `useState` + `useEffect` combos for async network data — use `useQuery`
- `import { Image } from 'react-native'` for network URLs — use `expo-image`
- Raw `c.env.SVC_*.fetch(new Request(...))` in route handlers — use `lib/service-clients.ts`
- `bun add expo-*` in satellite apps — use `npx expo install` from the app directory

---

## Tech Stack (by archetype)

### Mobile satellite apps (`apps/*-app` — e.g. `auspice-app`, `kindred-app`)
- **Language**: TypeScript strict, React 19, React Native 0.81
- **Framework**: Expo SDK 54, Expo Router 6 (file-based routing under `app/`)
- **Shared glue**: `@zhop/satellite-runtime`, `@zhop/satellite-ui`, `@zhop/hexastral-client`
- **Styling**: NativeWind 4.1 + Tailwind v3 (NOT v4 — NativeWind constraint)
- **Monetization**: RevenueCat (`react-native-purchases`)
- **Security**: HMAC-SHA256 request signing on every API call
- **Storage**: `expo-secure-store` (secrets only); MMKV / app storage for preferences & cache
- **Data fetching**: `@tanstack/react-query` — hooks in `hooks/`
- **Images**: `expo-image` for all network images (memory+disk cache)
- **Motion**: `react-native-reanimated` v4 + `expo-haptics` — not RN `Animated`
- **Build**: EAS Build (dev / preview / production profiles)
- **i18n**: Custom `useI18n()` hook — 9 locales (zh, zh-Hant, en, ko, ja, de, es, vi, th)

### hexastral-api
- **Framework**: Hono 4.9+ on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM (`sqlite-core`)
- **Schema**: Single `src/db/schema.ts` — migrations via `drizzle-kit generate`
- **Auth middleware**: `hmac-verify.ts` (iOS) OR `turnstile.ts` (web) — mutually exclusive per route
- **Rate limiting**: `RATE_LIMITER` (global) + `CHART_RATE_LIMITER` (strict, expensive endpoints)
- **Bindings**: `DB`, `AI`, `GUARD_KV`, `DDL_KV`, `RATE_LIMITER`, `CHART_RATE_LIMITER`, `SVC_*` fetchers, `FACE_PHOTOS_BUCKET`

### hexastral-web
- **Framework**: Next.js 15.5 + React 19, deployed via OpenNext to Cloudflare Worker
- **Styling**: Tailwind CSS v4 + PostCSS
- **i18n**: `next-intl` (zh-CN, zh-TW, en, ja, ko)
- **Human verification**: Cloudflare Turnstile

---

## iOS Theme System

Design philosophy: **"Ink Brutalism"** — East Asian calligraphy aesthetic on a monochrome Zinc palette.

```typescript
// Always construct an ios palette using useTheme(). Never hardcode hex values in JSX.

const { colors, isDark } = useTheme()

const ios = {
  bg:        isDark ? '#09090B' : '#FAFAFA',   // Zinc-950 / Zinc-50
  card:      isDark ? '#18181B' : '#FFFFFF',   // Zinc-900 / white
  separator: isDark ? '#27272A' : '#E4E4E7',   // Zinc-800 / Zinc-200
  text:      isDark ? '#FAFAFA' : '#09090B',   // Zinc-50 / Zinc-950
  secondary: isDark ? '#A1A1AA' : '#71717A',   // Zinc-400 / Zinc-500
  tint:      colors.primary,                   // dark=#FAFAFA  light=#18181B
  tintFg:    isDark ? '#18181B' : '#FFFFFF',   // contrast foreground for tint buttons
  accent:    colors.accent,                    // dark=#C4A882 (Ink Gold)  light=#3C2415 (Ink Brown)
  dim:       isDark ? '#52525B' : '#A1A1AA',   // Zinc-600 / Zinc-400
}
```

Semantic exports from `lib/theme.ts` (use for reading/chart UIs):
- `wuxingColors` — 五行: metal / wood / water / fire / earth (each: `accent` + `bg` + `label`)
- `fortuneColors` — 吉凶: great-fortune / fortune / neutral / caution / misfortune
- `brightnessColors` — 紫微 star brightness (庙/旺/得/利/平/不/陷)
- `mutagenColors` — 四化: 禄/权/科/忌
- `palaceColors` — 12 palaces

Rules:
- Never use hardcoded hex literals in component JSX — derive from `ios.*` or the semantic exports
- Lucide icons must use a color from the `ios` palette, never a fixed string
- Tint buttons always pair `ios.tint` background with `ios.tintFg` text (contrast guaranteed in both modes)
- Semantic colors are for chart/reading UIs — not for list-card left borders or rainbow accents

---

## iOS i18n System

Custom hook — NOT i18next. Type-safe key lookup.

```typescript
import { useI18n } from '@/lib/i18n'

const { t, locale, setLocale } = useI18n()

// t() is type-safe — key must exist in TranslationKeys (derived from zh locale file)
<Text>{t('shop_upgrade_pro')}</Text>
```

- Locale files: `locales/{zh,zh-Hant,en,ko,ja,de,es,vi,th}.ts`
- Always add new keys to all 9 locale files — never hardcode UI text in components

---

## hexastral-api Patterns

### Context Variables

```typescript
// Injected by middleware, consumed via c.get()
c.get('requestId')   // string — nanoid per request
c.get('userId')      // string | null — null for public routes
c.get('db')          // DrizzleD1Database with full schema
```

### Security Middleware

```typescript
// iOS native routes: HMAC only
app.use('/bazi/*', hmacVerify)
app.use('/ziwei/*', hmacVerify)

// Web-facing routes: Turnstile only
app.use('/share/*', turnstileVerify)

// Never apply both to the same route
```

### Rate Limiting

```typescript
const { success } = await c.env.RATE_LIMITER.limit({ key: userId ?? clientIp })
if (!success) throw new HTTPException(429, { message: 'Rate limited' })

// Expensive chart endpoints use the stricter CHART_RATE_LIMITER
const { success } = await c.env.CHART_RATE_LIMITER.limit({ key: userId })
```

### Database — D1 + Drizzle

```typescript
// db is injected by dbMiddleware — never instantiate drizzle() inside a route handler
const db = c.get('db')  // DrizzleD1Database<typeof schema>

// Credits must use db.batch() — never a direct field overwrite
await db.batch([
  db.update(users).set({ credits: sql`credits - ${cost}` }).where(eq(users.id, userId)),
  db.insert(readings).values(readingRow),
])
```

### Service Binding Calls

Always use the named clients from `lib/service-clients.ts` — never call `c.env.SVC_*.fetch()` directly in route handlers.

```typescript
import { astroClient } from '../lib/service-clients'

// ✅ Correct — typed, timeout, error propagation
const result = await astroClient.computeHehun(c.env.SVC_ASTRO, payload)

// ❌ Wrong — no timeout, raw error swallowing
const res = await c.env.SVC_ASTRO.fetch(new Request('http://internal/...', { ... }))
```

---

## astro-core Usage

Pure TypeScript — deterministic, synchronous, no network. Import from sub-path exports:

```typescript
import { buildFourPillars } from '@zhop/astro-core/ganzhi'
import { getSolarTerm }    from '@zhop/astro-core/jieqi'
import { sihua }           from '@zhop/astro-core/sihua'
import { getHehunScore }   from '@zhop/astro-core/hehun'
```

Before modifying `@zhop/*` packages: run `bun typecheck` and check all consumers. Package-specific rules live in each `packages/*/README.md`.

---

## Code Style

| Rule | Value |
|---|---|
| Formatter | Biome 2.2.4 |
| Indentation | 2 spaces |
| Line width | 100 characters |
| Quotes | Single |
| Component files | PascalCase.tsx |
| Utility files | camelCase.ts |
| API route files | kebab-case.ts |
| DB columns | snake_case (Drizzle D1 convention) |
| Package scope | @zhop/* for all; services named @zhop/svc-* |

---

## Common Commands

```bash
# Root monorepo
bun install              # install all workspace dependencies
bun format:fix           # Biome format all workspaces
bun lint:fix             # Biome lint fix all workspaces
bun typecheck            # tsc --noEmit all workspaces

# Mobile satellite (cd apps/<name>-app first)
bunx expo start                                  # Metro bundler
bunx expo run:ios                                # local iOS simulator
npx expo install <pkg>                           # ALWAYS for native modules
eas build --profile production --platform ios    # cloud build

# hexastral-api (cd apps/hexastral-api first)
bun dev                  # wrangler dev on port 3010
bun db:generate          # drizzle-kit generate (after schema changes)
bun db:migrate           # apply migrations to local D1
bun db:migrate:prod      # apply migrations to production D1 (remote)
bun deploy               # wrangler deploy to production

# hexastral-web (cd apps/hexastral-web first)
bun dev                  # Next.js dev with Turbopack
bun deploy               # OpenNext to Cloudflare deploy
```

---

## Notes

- Run `bun format:fix && bun lint:fix` before every commit
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Do NOT create summary markdown files unless explicitly requested
- `apps/hexastral-app` is a **retired** omnibus — do not extend it for new features; see [ADR-0009](../docs/decisions/0009-two-layer-matrix.md)
- Cursor-specific rules: see [.cursorrules](../.cursorrules) and [AGENTS.md](../AGENTS.md)

---

## CodeSeeker MCP Tools — MANDATORY FOR CODE DISCOVERY

**CRITICAL**: This project has CodeSeeker MCP tools available. You MUST use them as your PRIMARY method for code discovery, NOT grep/glob.

### Auto-Initialization Check

**BEFORE any code search**, verify the project is indexed:
1. Call `projects()` to see indexed projects
2. If this project is NOT listed, call `index({path: "PROJECT_ROOT_PATH"})` first
3. If tools return "Not connected", the MCP server may need restart

### When to Use CodeSeeker (DEFAULT)

**ALWAYS use CodeSeeker for these queries:**
- "Where is X handled?" → `search({query: "X handling logic"})`
- "Find the auth/login/validation code" → `search({query: "authentication"})`
- "How does Y work?" → `search({query: "Y implementation", read: true})`
- "What calls/imports Z?" → `analyze({action: "dependencies", filepath: "path/to/Z"})`

| Task | MUST Use | NOT This |
|------|----------|----------|
| Find code by meaning | `search({query: "..."})` | ❌ `grep -r "..."` |
| Search + read files | `search({query: "...", read: true})` | ❌ `grep` then `cat` |
| Show dependencies | `analyze({action: "dependencies", filepath: "..."})` | ❌ Manual file reading |

Only fall back to grep/glob for exact literal strings, regex patterns, or when you already know the exact file path.

### Keep Index Updated

After using Edit/Write tools, call:
```
index({action: "sync", changes: [{type: "modified", path: "path/to/file"}]})
```
