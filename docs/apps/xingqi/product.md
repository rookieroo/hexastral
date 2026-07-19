# Xingqi — product spine

Client app: [`apps/xingqi-app`](../../apps/xingqi-app). Architecture: [ADR-0028](../../decisions/0028-face-oracle-dual-track.md).

**Shell:** Yuel-quality chrome (Sign-In / BirthForm / Settings / report density), assembled greenfield — not a dirty kindred rsync.  
**Display brand:** Xingqi · `com.hexastral.xingqi` · scheme `xingqi`.  
**API / RC opaque ids:** portfolio target `faceoracle`, SKUs `faceoracle_*` (unchanged server catalog).

**i18n:** four locales only — `zh` / `zh-Hant` / `en` / `ja` (not the monorepo 9-locale satellite default).

## Funnel

1. Biometric consent  
2. Three-photo wizard (left palm → right palm → face)  
3. Birth Form (`BirthForm`, `fieldPrefix='self'`)  
4. Paywall (single ≥ $9.99 **or** Pro)  
5. Reading

## Tracks

| | One-shot | Pro (`faceoracle_pro`) |
|---|---|---|
| SKU | `faceoracle_reading` | `faceoracle_pro_*` |
| Result | Full chaptered report once | Same + 划词 chat (free-taste then Pro) |
| History / 档案 | — | Reading snapshots + period briefs |
| Quota | 1 credit / purchase | **Photos:** 6 slots / UTC month (3 per new photo reading). **Report regen:** 3 / UTC month (same photos, new locale/body; `regen: true`) |
| Events | Written once | Refreshed each reading; drives push + period / 形气窗口 strip |
| Life axis | — | Yuun-parity git-graph (`/timeline`) via `/api/physiognomy/cycle/*` |
| What-if | — | Yuun-parity forks (`/makeif`) via same facade |

**Do not** call Yuun `/api/auspice/*` from Xingqi. Shared cycle compute only behind faceoracle-owned routes + `faceoracle_pro` server gate.

## Locale policy

- **Generation language** = device locale at enqueue → stored on `faceoracle_jobs.locale` / `portfolio_readings.locale`. Body is frozen.
- **Chrome** (chapter titles, layer labels, History list titles) follows **current** device locale.
- **Switching locale never auto-regenerates** stored readings.
- **Explicit regen** (Living FAB → “Regenerate in this language”) costs **1 report regen**, not photo slots; bypasses `features_unchanged`.
- Prompt uses Route-B language blocks (`faceoracle-locale.ts`); `zh-Hant` → Traditional; en/ja reject/retry on CJK-heavy drift.
- Report numerals are **Yuel 积画** SVG (locale-independent), not Unicode 一二三 / Arabic.

## LLM stack

| Path | Tier / model |
|---|---|
| Reading text | CF Workers AI **flagship** via `@zhop/ai-vision` (`callWithFallback`: Kimi → Qwen3 → GLM; non-zh leads Llama) |
| VLM extract | Gemini `gemini-3.1-pro-preview` |
| Yuun explain / Yuel chapters | Same router, usually **`standard`** (parallel call shape) |

Xingqi keeps flagship for the single monolithic 6-chapter JSON; prompt engineering aligns with svc-astro Route B / guardrails.

## Naming

- **History / 档案** — list of past readings (home).  
- **Timeline / 人生时间线** — Life axis screen only.  
- **What-if / 假如** — alternate forks screen.

## Copy rules

Cultural study framing — no deterministic fate language (see ADR-0003).

## Cache layers

Privacy: **never** cache source images (ADR-0028). Only hashes + derived JSON.

| Layer | Key | Store | Hit behavior | Invalidate |
|---|---|---|---|---|
| **L0 Client** | photo mtime+size / featureIds | AsyncStorage stamp | Block duplicate **reading** start | Replace any period photo |
| **L1 VLM** | `SHA-256(bytes\|type\|model\|schemaVer)` per user | D1 `user_physiognomy_features.content_hash` | Skip Gemini; reuse `featureId`; no free upload quota | Bump `FACEORACLE_VLM_MODEL` / `FACEORACLE_VLM_SCHEMA_VERSION` |
| **L2 Job** | featureId triple | jobs + last reading `inputJson` | In-flight → 202 `deduped`; done/same → 409 `features_unchanged` (unless `regen`) | New featureId after photo change; or Pro `regen: true` |
| **L2b Report regen** | user + UTC month | D1 `faceoracle_report_regens` | Cap 3; charge on `regen` enqueue | Month rollover |
| **L3 Timeline** | birth context | D1 `life_timeline_cache` | Return payload | Birth change; `TIMELINE_CACHE_VERSION` |
| **L3 Explain** | owner + node + locale | `timeline_readings` | Return stored reading | New node / locale / guard app |
| **L3 Make-if** | birth + shape + locale | GUARD_KV + `makeif_forks` | KV narrate TTL; forks CRUD | Shape change; user delete fork |
