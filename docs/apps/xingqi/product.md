# Syel — product spine

Client app: [`apps/xingqi-app`](../../apps/xingqi-app). Architecture: [ADR-0028](../../decisions/0028-face-oracle-dual-track.md).

**Shell:** Yuel-quality chrome (Sign-In / BirthForm / Settings / report density), assembled greenfield — not a dirty kindred rsync.  
**Display brand:** Syel (SEE-el) · `com.hexastral.xingqi` · scheme `xingqi`. Method layer may still say 形气 / 相.  
**API / RC opaque ids:** portfolio target `faceoracle`, SKUs `faceoracle_*` (unchanged server catalog).

**i18n:** four locales only — `zh` / `zh-Hant` / `en` / `ja` (not the monorepo 9-locale satellite default).  
`zh-Hant` is a **separate copy track** (shell, alerts, chapter chrome, term glosses, push) — never substitute Simplified for Traditional. Reading body LLM already forces Traditional via `faceoracle-locale.ts`.

**Positioning:** Syel is **folk 算命 practice in app form** — face + palms **corroborated with** BaZi (日主·大运·流年), the same combined toolkit a traditional reader uses. Not a photo-chat toy; not a Yuel-style personal 命书 (BaZi-forward chapters); not a Yuun-style personal 黄历 (calendar-forward). Oneshot = sealed five-chapter brief where **形与命互证** (loci[] · three axes · computed DaYun/LiuNian). Pro = archive + qi layer (Timeline / What-if / in-report chat / period recapture). VLM quality/modality gates reject thin or mismatched extracts (`photo_quality_low` / `modality_mismatch`).

**Life axes (equal weight):** career/colleagues · love/intimacy · health/pace.  
Ban only **census 铁口** (已婚/未婚、有N个孩子、家人性格档案).  
**Require** dated 预警 + 务实一步: 关系修复、合伙人/同事维护、何时少冒进、何时抓机遇 — this is the $9.9 value, not vague “保持平衡”.

**Anti-drift (product):**
- Do **not** let natal chapters read like Yuel personality essays with photos as garnish.
- Do **not** let horizon read like Yuun day-almanac without face/palm loci.
- Every strong claim should show **both** a form locus (面/掌) **and** a chart cue (日主/大运/流年) when the chapter allows — or explicitly note where they agree / tension.
- Do **not** let 事业线 alone carry palms/period/advice while 感情/生命/气色 vanish.

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
| Result | Dense 5-chapter report (career · love · health) once | Same + period refresh |
| Living layer | **No** Timeline / What-if / Chat / Living FAB | Yes |
| History / 档案 | Current reading only | Snapshots + period briefs |
| Quota | 1 credit / purchase | **Photos:** 6 slots / UTC month (3 per new photo reading). **Report regen:** 3 / UTC month (same photos, new locale/body; `regen: true`) |
| Events | Written once | Refreshed each reading; drives push + period / 形气窗口 strip |
| Life axis | — | Yuun-parity git-graph (`/timeline`) via `/api/physiognomy/cycle/*` |
| What-if | — | Yuun-parity forks (`/makeif`) via same facade |

**Do not** call Yuun `/api/auspice/*` from Syel. Shared cycle compute only behind faceoracle-owned routes + `faceoracle_pro` server gate.

## Report architecture

- **Method:** 面相 + 掌相 + 八字 **互证** (folk 算命 stack). Form shows what is visible; chart supplies timing windows; neither path alone carries the brief.
- **Voice:** 警示 / 预告 — “形上可见…，命盘上…，气机上宜留意…” (ADR-0003; no hard fate / 铁口).
- **Palm sides (掌别):** 男 左掌=先天/本命底色 · 右掌=后天/作为；女 右掌=先天 · 左掌=后天. Both hands read; palms chapter states whether 先天 and 后天 pull 同向 or 对拉. Injected as `palmConvention` in `natalSummary` (deterministic from gender).
- **Age-anchored palm 流年:** `currentAge` + `palmLiunianHint` injected into `natalSummary`. Palms **chapter text** segments 生命线/事业线 into 已走段 → 当前段 → 下一段. Photo overlay no longer draws a schematic timeline (it cluttered mounts/lines); age windows stay in the reading prose.
- **Palm depth (7 mounts + marks):** VLM emits **per-mount** text (`mountJupiter`…`mountMars`) plus a synthesized `mounts` summary for legacy gates. Client plots **7 mount stars** + lines/shape/marks (13/hand). Per-locus readings live in top-level **`loci[]`** (SSOT). Soft log-only: `palms.cite_coverage_mounts` / `palms.cite_coverage` / `face.cite_coverage`.
- **Time horizon (五章):** `overview` = short hook; `face` / `palms` / `natal`; **`horizon`** = near-window + actions. Generated in **Pass 2** after curated loci (Pass 1).
- **Three axes every reading:** career / love / health — tagged on `events[].axis`, covered in horizon actions.
- **Health + TCM lexicon:** 中医是词典与隐喻层，不是诊断引擎. Health may borrow classical imagery (气色 ↔ 脏腑/气血之**象**) for 警示 and pacing — cultural对照 / self-observation, not diagnosis, not prescription, not a substitute for clinicians.
- **Forbidden health UI:** organ dashboards, health scores, “you have X disease”, medication / herbal dosing, acupoint treatment plans.
- **Field data ownership (anti cross-chapter copy):** the 本流年 sentence lives in `horizon.reef` only; 全人生 大运带 risk → `natal.reef`; 形/气色 risk → `face.reef`; 先天/后天掌张力 → `palms.reef`; action steps → `horizon.remedy`. **Prefer null over repeat**.
- **Reading job (Pass 0 → 1 → 2):** **Pass 0** (code) ranks clear VLM keys into **`SuggestedLoci` top ~20** (unclear excluded; mount tension / island-or-cross text / dayun↔mount / palm-side weights). **Pass 1** writes **16–20** deep `loci[]` from that shortlist (hard floors: face≥5, each palm≥5, CAUTION≥2 + one retry; prefer omit over fabricate). **Pass 2** = five chapters + soft events weaving FixedLoci. Soft observations for secondary gaps remain log-only.
- **Client display safety net:** `adaptReadingChapters` nulls out `reef`/`remedy`/`counterpoint` that merely repeat an earlier chapter (keeps first).
- **描点 → 章节打通 (loci-first):** `loci[]` = `{featureKey, part, locus, reading}` SSOT. Sheet note = `loci[].reading`. **Never** paste raw VLM feature text.
- **Landmarks:** **face + palm** coords from Moondream 3.1 `point` (+ VLM midpoint fallback; clustered / fingertip palm points dropped). Client prefers `landmarksJson`; missing keys interpolate relative to detected mounts when coverage is thin — avoid absolute canonical mix that misaligns with the photo (`FACEORACLE_VLM_SCHEMA_VERSION=xingqi-vlm-v9`).
- **Close UX:** top-right X on result (no bottom Done).
- **Capture:** HD full face + full palms; blurry/cropped → weak VLM → thin report.

## Locale policy

- **Generation language** = device locale at enqueue → stored on `faceoracle_jobs.locale` / `portfolio_readings.locale`. Body is frozen.
- **Chrome** (chapter titles, layer labels, History list titles) follows **current** device locale.
- **Switching locale never auto-regenerates** stored readings.
- **Explicit regen** (Living FAB → “Regenerate in this language”) costs **1 report regen**, not photo slots; bypasses `features_unchanged`.
- Prompt uses Route-B language blocks (`faceoracle-locale.ts`); `zh-Hant` → Traditional. Locale drift is language-split: **en** retries on CJK-heavy body/fields; **ja** retries only on Latin-heavy (English) or Han-without-kana (Chinese) leakage — never on normal kana+kanji Japanese (the old CJK-ratio guard false-positive every ja job into a ~70s rewrite).
- **Extract path:** svc-astro `/physiognomy/extract-features` + `/extract-palm-features`. Palm returns per-mount feature text + Moondream/VLM `landmarks`. Reading interpretation is a **two-pass** faceoracle queue job (loci → chapters).
- Report numerals are **Yuel 积画** SVG (locale-independent), not Unicode 一二三 / Arabic.

## LLM stack

| Path | Tier / model |
|---|---|
| Reading text | CF Workers AI **flagship** two-pass (`faceoracle_loci` then `faceoracle_chapters`) via `@zhop/ai-vision` |
| VLM extract (features) | CF **Kimi K2.6** vision primary → Gemini Flash → Llama 3.2 vision (`vlm-cascade-v1`) |
| VLM extract (coords) | Face + palm: CF **Moondream 3.1** `point` (+ feature-VLM midpoint fallback; palm cluster drop) |
| Yuun explain / Yuel chapters | Same router, usually **`standard`** (parallel call shape) |

Syel uses separate Pass 1/2 budgets so curated loci are not starved by five-chapter JSON.

## Naming

- **History / 档案** — list of past readings (home).  
- **Timeline / 人生时间线** — Life axis screen only.  
- **What-if / 假如** — alternate forks screen.

## Copy rules

Cultural study framing — no deterministic fate language (see ADR-0003).  
Reading LLM injects `@zhop/portfolio-voice` compliance + a **one-line** health direction (TCM as imagery lexicon); hard-forbidden audit rewrites once. Resonance stays via classical loci + dated windows — not ironclad verdicts or medical claims.

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
