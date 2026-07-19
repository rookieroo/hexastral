# Xingqi — product spine

Client app: [`apps/xingqi-app`](../../apps/xingqi-app). Architecture: [ADR-0028](../../decisions/0028-face-oracle-dual-track.md).

**Shell:** Yuel-quality chrome (Sign-In / BirthForm / Settings / report density), assembled greenfield — not a dirty kindred rsync.  
**Display brand:** Xingqi · `com.hexastral.xingqi` · scheme `xingqi`.  
**API / RC opaque ids:** portfolio target `faceoracle`, SKUs `faceoracle_*` (unchanged server catalog).

**i18n:** four locales only — `zh` / `zh-Hant` / `en` / `ja` (not the monorepo 9-locale satellite default).  
`zh-Hant` is a **separate copy track** (shell, alerts, chapter chrome, term glosses, push) — never substitute Simplified for Traditional. Reading body LLM already forces Traditional via `faceoracle-locale.ts`.

**Positioning:** Oneshot = sealed six-chapter brief (citations · three axes · computed DaYun/LiuNian) — thicker than chatty photo-reading. Pro = archive + qi layer (Timeline / What-if / in-report chat / period recapture) — not unlimited look-at-photo. VLM quality/modality gates reject thin or mismatched extracts (`photo_quality_low` / `modality_mismatch`).

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
| Result | Dense 6-chapter report (career · love · health) once | Same + period refresh |
| Living layer | **No** Timeline / What-if / Chat / Living FAB | Yes |
| History / 档案 | Current reading only | Snapshots + period briefs |
| Quota | 1 credit / purchase | **Photos:** 6 slots / UTC month (3 per new photo reading). **Report regen:** 3 / UTC month (same photos, new locale/body; `regen: true`) |
| Events | Written once | Refreshed each reading; drives push + period / 形气窗口 strip |
| Life axis | — | Yuun-parity git-graph (`/timeline`) via `/api/physiognomy/cycle/*` |
| What-if | — | Yuun-parity forks (`/makeif`) via same facade |

**Do not** call Yuun `/api/auspice/*` from Xingqi. Shared cycle compute only behind faceoracle-owned routes + `faceoracle_pro` server gate.

## Report architecture

- **Voice:** 警示 / 预告 — “形上可见…，气机上宜留意…” (ADR-0003; no hard fate).
- **Three axes every reading:** career / love / health — tagged on `events[].axis`, covered in advice.
- **Density:** face/palms citations; natal 大运/流年 injected from `@zhop/astro-core`; soft post-check retry.
- **Close UX:** top-right X on result (no bottom Done).
- **Capture:** HD full face + full palms; blurry/cropped → weak VLM → thin report.

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
| VLM extract | CF **Kimi K2.6** vision primary → Gemini Flash → Llama 3.2 vision (`vlm-cascade-v1`) |
| Yuun explain / Yuel chapters | Same router, usually **`standard`** (parallel call shape) |

Xingqi keeps flagship for the single monolithic 6-chapter JSON; prompt engineering aligns with svc-astro Route B / guardrails.

## Naming

- **History / 档案** — list of past readings (home).  
- **Timeline / 人生时间线** — Life axis screen only.  
- **What-if / 假如** — alternate forks screen.

## Copy rules

Cultural study framing — no deterministic fate language (see ADR-0003).  
Reading LLM injects `@zhop/portfolio-voice` compliance + health non-medical boundary; hard-forbidden audit rewrites once. Resonance stays via classical loci + dated windows — not ironclad verdicts.

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
