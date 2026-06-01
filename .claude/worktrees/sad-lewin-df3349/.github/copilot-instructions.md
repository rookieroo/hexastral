# GitHub Copilot Instructions — HexAstral

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
- iOS non-sensitive persistent data: `lib/storage.ts` MMKV wrapper (sync, non-blocking)
- API Service Binding calls: use named clients from `lib/service-clients.ts`, not raw `binding.fetch()`
- API `db`: always obtained from `c.get('db')` — injected by `dbMiddleware`, never instantiate per-route

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
- `AsyncStorage` for non-sensitive data — use `lib/storage.ts` MMKV wrapper
- Raw `c.env.SVC_*.fetch(new Request(...))` in route handlers — use `lib/service-clients.ts`

---

## Project Overview

**HexAstral** is an AI-powered East Asian metaphysics iOS app. Core product: transparent Ba Zi × Zi Wei dual-chart readings with AI interpretation. Target: 25–45 year-old global users.

### Monorepo Apps

| App | Type | Purpose |
|---|---|---|
| `apps/hexastral-app` | Expo 54 / React Native 0.81 | Main product — iOS app |
| `apps/hexastral-api` | Cloudflare Worker + Hono | Unified backend API |
| `apps/hexastral-web` | Next.js 15 + Cloudflare | Landing, onboarding, share reports |
| `apps/useone-tech` | Next.js 15 + Cloudflare | UseOne marketing site |

### Packages

| Package | Purpose |
|---|---|
| `packages/astro-core` | Pure-TS metaphysics engine: 八字, 紫微, 六爻, 节气, 合婚, 大运, 神煞, 四化 |
| `packages/hexastral-client`| Shared Hono RPC client (`hc<AppType>`) for both iOS and Web |
| `packages/ddl-client` | Deferred Deep Link — web to iOS onboarding handoff |
| `packages/ui` | shadcn/ui + Tailwind v4 — web apps only |
| `packages/email` | React Email transactional templates |
| `packages/hexastral-tokens` | Design tokens — lunar phases, gradients, palette, SVG paths, report types |
| `packages/logger` | Logger abstraction `createLogger()` — created but not yet wired to any service |

### Microservices (Cloudflare Workers, called via service bindings)

| Service | Purpose |
|---|---|
| `services/svc-astro` | iztro + astro-core + OpenAI/Gemini chart interpretation |
| `services/svc-fortune` | Daily fortune generation for push notifications |
| `services/svc-geocode` | City / timezone lookups |
| `services/svc-notify` | Push delivery via Firebase FCM |
| `services/svc-mailer` | Transactional email via AWS SES |
| `services/svc-admin-notify` | Admin alert notifications (Telegram) |
| `services/svc-signal` | Internal signal relay to API |
| `services/svc-tail` | Tail log aggregation |

---

## Tech Stack

### hexastral-app
- **Language**: TypeScript strict, React 19, React Native 0.81
- **Framework**: Expo SDK 54, Expo Router 6 (file-based routing under `app/`)
- **Bundle ID**: `com.zhop.hexastral`
- **Styling**: NativeWind 4.1 + Tailwind v3 (NOT v4 — NativeWind constraint)
- **Monetization**: RevenueCat (`react-native-purchases`)
- **Auth**: Apple Sign-In (`expo-apple-authentication`) + guest mode
- **Security**: HMAC-SHA256 request signing (`lib/hmac.ts`) on every API call
- **Storage**: `expo-secure-store` (secrets only), `lib/storage.ts` MMKV wrapper (preferences & cache)
- **Data fetching**: `@tanstack/react-query` — hooks in `hooks/`, persisted via MMKV
- **Images**: `expo-image` for all network images (memory+disk cache, blurhash placeholder)
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
- Detection: `expo-localization` `getLocales()` → fallback chain → `AsyncStorage` manual override
- AsyncStorage key: `hexastral_locale`
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

// Relational queries (requires schema with relations() defined)
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: { bonds: true },
})

// Credits must use db.batch() — never a direct field overwrite
await db.batch([
  db.update(users).set({ credits: sql`credits - ${cost}` }).where(eq(users.id, userId)),
  db.insert(readings).values(readingRow),
])
```

### Error Handling

```typescript
import { HTTPException } from 'hono/http-exception'

if (!user) throw new HTTPException(404, { message: 'User not found' })
if (!hasAccess) throw new HTTPException(403, { message: 'Subscription required' })

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error('[error]', c.get('requestId'), err)
  return c.json({ error: 'Internal server error' }, 500)
})
```

### Service Binding Calls

Always use the named clients from `lib/service-clients.ts` — never call `c.env.SVC_*.fetch()` directly in route handlers. The unified layer handles timeout (`AbortSignal.timeout`), structured error propagation, and consistent `ServiceError` format.

```typescript
import { astroClient, mailerClient, notifyClient } from '../lib/service-clients'

// ✅ Correct — typed, timeout, error propagation
const result = await astroClient.computeHehun(c.env.SVC_ASTRO, payload)

// ❌ Wrong — no timeout, raw error swallowing, duplicated per callsite
const res = await c.env.SVC_ASTRO.fetch(new Request('http://internal/...', { ... }))
```

Service errors propagate as `HTTPException` with `{ code, message, status }` from the service layer, so `onError` correctly forwards the original status to the client.

---

## astro-core Usage

Pure TypeScript — deterministic, synchronous, no network. Import from sub-path exports:

```typescript
import { buildFourPillars } from '@zhop/astro-core/ganzhi'
import { getSolarTerm }    from '@zhop/astro-core/jieqi'
import { sihua }           from '@zhop/astro-core/sihua'
import { getHehunScore }   from '@zhop/astro-core/hehun'
```

Tests: `packages/astro-core/src/**/*.test.ts` (Vitest).

---

## Code Style

| Rule | Value |
|---|---|
| Formatter | Biome 2.2.4 |
| Indentation | 2 spaces |
| Line width | 100 characters |
| Quotes | Single |
| Trailing commas | ES5 |
| Import order | Managed by Biome organizeImports — do not manually reorder |
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
turbo build              # build all in dependency order

# Quality Assurance
maestro test .maestro/flows/     # run all end-to-End iOS tests on simulator

# hexastral-app (cd apps/hexastral-app first)
bunx expo start                                  # start Metro bundler
bunx expo run:ios                                # local iOS simulator build
npx expo install <pkg>                           # ALWAYS use for native modules
eas build --profile development --platform ios   # cloud dev build

# hexastral-api (cd apps/hexastral-api first)
bun dev                  # wrangler dev on port 3010
bun db:generate          # drizzle-kit generate (ALWAYS run this after schema changes — NEVER ask agent to generate migrations manually)
bun db:migrate           # apply migrations to local D1
bun db:migrate:prod      # apply migrations to production D1 (remote)
bun deploy               # wrangler deploy to production

# hexastral-web (cd apps/hexastral-web first)
bun dev                  # Next.js dev with Turbopack on port 3001
bun deploy               # OpenNext to Cloudflare deploy
```

---

## Adding Native Modules to hexastral-app

Always use `npx expo install` from `apps/hexastral-app/`. It auto-resolves the SDK 54-compatible version.

```bash
cd apps/hexastral-app
npx expo install expo-camera        # resolves correct SDK 54 version
# bun add expo-camera@latest        # may install SDK 55+ -> native module errors
```

---

## Notes

- Run `bun format:fix && bun lint:fix` before every commit
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Do NOT create summary markdown files unless explicitly requested
- `packages/ai-engine` is Zhop Pages legacy — hexastral-app does not consume it


## CodeSeeker MCP Tools - MANDATORY FOR CODE DISCOVERY

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
- "Show me the error handling" → `search({query: "error handling patterns", read: true})`

| Task | MUST Use | NOT This |
|------|----------|----------|
| Find code by meaning | `search({query: "authentication logic"})` | ❌ `grep -r "auth"` |
| Search + read files | `search({query: "error handling", read: true})` | ❌ `grep` then `cat` |
| Show dependencies | `analyze({action: "dependencies", filepath: "..."})` | ❌ Manual file reading |
| Find patterns | `analyze({action: "standards"})` | ❌ Searching manually |
| Understand a file | `search({filepath: "..."})` | ❌ Just Read alone |

### When to Use grep/glob (EXCEPTIONS ONLY)

Only fall back to grep/glob when:
- Searching for **exact literal strings** (UUIDs, specific error codes, magic numbers)
- Using **regex patterns** that semantic search can't handle
- You **already know the exact file path**

### Why CodeSeeker is Better

```
❌ grep -r "error handling" src/
   → Only finds literal text "error handling"

✅ search("how errors are handled")
   → Finds: try-catch blocks, .catch() callbacks, error responses,
     validation errors, custom Error classes - even if they don't
     contain the words "error handling"
```

### Available MCP Tools (3 consolidated)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `search({query})` | Semantic search | First choice for any "find X" query |
| `search({query, read: true})` | Search + read combined | When you need file contents |
| `search({filepath})` | File + related code | Reading a file for the first time |
| `analyze({action: "dependencies", filepath})` | Dependency graph | "What uses this?" |
| `analyze({action: "standards"})` | Project patterns | Before writing new code |
| `analyze({action: "duplicates"})` | Find duplicate code | Code cleanup |
| `analyze({action: "dead_code"})` | Find unused code | Architecture review |
| `index({action: "init", path})` | Index a project | If project not indexed |
| `index({action: "sync", changes})` | Update index | After editing files |
| `index({action: "status"})` | Show indexed projects | Check if project is indexed |

### Keep Index Updated

After using Edit/Write tools, call:
```
index({action: "sync", changes: [{type: "modified", path: "path/to/file"}]})
```

## Claude Code Best Practices (from 2000+ hours of expert usage)

### Subagent Strategy for Complex Tasks
- For multi-step or complex tasks, spawn subagents using the **main model** (not cheaper/smaller models) instead of cramming everything into one context
- Pattern: "Orchestrator coordinates + focused subagents execute" >> "Single massive context"
- Use subagents MORE than you think necessary, especially for large codebases
- Each subagent gets fresh, focused context = better quality output

### Context Hygiene - Prevent "Lost in the Middle"
- Quality degrades as context grows - the "lost in the middle" problem is real
- Use **double-escape (Esc Esc)** to time travel when context gets polluted with failed attempts
- Compact strategically and intentionally, not automatically
- When output quality drops, consider starting fresh rather than adding more context

### Error Attribution Mindset
- Issues in AI-generated code trace back to **prompting or context engineering**
- When something fails, ask "what context was missing?" not "the AI is broken"
- Log failures mentally: prompt → context → outcome. Patterns will emerge.
- Better input = better output. Always.

