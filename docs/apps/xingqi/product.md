# Xingqi — product spine

Client app: [`apps/xingqi-app`](../../apps/xingqi-app). Architecture: [ADR-0028](../../decisions/0028-face-oracle-dual-track.md).

**Shell:** Yuel-quality chrome (Sign-In / BirthForm / Settings / report density), assembled greenfield — not a dirty kindred rsync.  
**Display brand:** Xingqi · `com.hexastral.xingqi` · scheme `xingqi`.  
**API / RC opaque ids:** portfolio target `faceoracle`, SKUs `faceoracle_*` (unchanged server catalog).

**i18n:** four locales only — `zh` / `zh-Hant` / `en` / `ja` (not the monorepo 9-locale satellite default).  
`zh-Hant` is a **separate copy track** (shell, alerts, chapter chrome, term glosses, push) — never substitute Simplified for Traditional. Reading body LLM already forces Traditional via `faceoracle-locale.ts`.

**Positioning:** Xingqi is **folk 算命 practice in app form** — face + palms **corroborated with** BaZi (日主·大运·流年), the same combined toolkit a traditional reader uses. Not a photo-chat toy; not a Yuel-style personal 命书 (BaZi-forward chapters); not a Yuun-style personal 黄历 (calendar-forward). Oneshot = sealed six-chapter brief where **形与命互证** (citations · three axes · computed DaYun/LiuNian). Pro = archive + qi layer (Timeline / What-if / in-report chat / period recapture). VLM quality/modality gates reject thin or mismatched extracts (`photo_quality_low` / `modality_mismatch`).

**Life axes (equal weight):** career/colleagues · love/intimacy · health/pace.  
Ban only **census 铁口** (已婚/未婚、有N个孩子、家人性格档案).  
**Require** dated 预警 + 务实一步: 关系修复、合伙人/同事维护、何时少冒进、何时抓机遇 — this is the $9.9 value, not vague “保持平衡”.

**Anti-drift (product):**
- Do **not** let natal chapters read like Yuel personality essays with photos as garnish.
- Do **not** let period/advice read like Yuun day-almanac without face/palm loci.
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
| Result | Dense 6-chapter report (career · love · health) once | Same + period refresh |
| Living layer | **No** Timeline / What-if / Chat / Living FAB | Yes |
| History / 档案 | Current reading only | Snapshots + period briefs |
| Quota | 1 credit / purchase | **Photos:** 6 slots / UTC month (3 per new photo reading). **Report regen:** 3 / UTC month (same photos, new locale/body; `regen: true`) |
| Events | Written once | Refreshed each reading; drives push + period / 形气窗口 strip |
| Life axis | — | Yuun-parity git-graph (`/timeline`) via `/api/physiognomy/cycle/*` |
| What-if | — | Yuun-parity forks (`/makeif`) via same facade |

**Do not** call Yuun `/api/auspice/*` from Xingqi. Shared cycle compute only behind faceoracle-owned routes + `faceoracle_pro` server gate.

## Report architecture

- **Method:** 面相 + 掌相 + 八字 **互证** (folk 算命 stack). Form shows what is visible; chart supplies timing windows; neither path alone carries the brief.
- **Voice:** 警示 / 预告 — “形上可见…，命盘上…，气机上宜留意…” (ADR-0003; no hard fate / 铁口).
- **Palm sides (掌别):** 男 左掌=先天/本命底色 · 右掌=后天/作为；女 右掌=先天 · 左掌=后天. Both hands read; palms chapter states whether 先天 and 后天 pull 同向 or 对拉. Injected as `palmConvention` in `natalSummary` (deterministic from gender).
- **Time horizon (六章不变):** `natal` = **全人生 timeline + 未来主章** (past印证 → 当令 → future 大运带至后半场, from the full 8-step `dayunFull`/`dayunFuture`); `period` = **近窗 only** (本流年 + 当前大运余年) and owns `events[]` for push. The two must not duplicate.
- **Three axes every reading:** career / love / health — tagged on `events[].axis`, covered in advice.
- **Health + TCM lexicon:** 中医是词典与隐喻层，不是诊断引擎. Health may borrow classical imagery (气色 ↔ 脏腑/气血之**象**) for 警示 and pacing — cultural对照 / self-observation, not diagnosis, not prescription, not a substitute for clinicians.
- **Forbidden health UI:** organ dashboards, health scores, “you have X disease”, medication / herbal dosing, acupoint treatment plans.
- **Field data ownership (anti cross-chapter copy):** the 本流年 sentence lives in `period.reef` only; 全人生 大运带 risk → `natal.reef`; 形/气色 risk → `face.reef`; 先天/后天掌张力 → `palms.reef`; action steps → `advice.remedy`. **Prefer null over repeat** — a chapter with no risk/action unique to itself sets `reef`/`remedy` to null rather than pasting another chapter's line.
- **Density = structural, not word count:** no char/`字数` floors. Soft post-check retry enforces field non-echo (goldenLine/evidence/dynamic/reef/remedy each a new angle, incl. `dynamic_eq_golden`), cross-chapter distinctness (`overview_dup_face`/`golden_dup`/`natal.dup_period`/`chapters.reef_dup`/`chapters.remedy_dup`/`chapters.reef_liunian_spray`), citation breadth + honesty (`face.citations<4`/`cite.face_breadth` ≥5 distinct loci mixing support+caution/`palms.missing_innate_or_acquired`/`palms.missing_life_or_heart_line`/`cite.note_echo_body`), a future-facing natal (`natal.future_thin`), and event fuel (`events<5`/`events.near<2`/`events.axis<3`). Cherry-picking only auspicious loci is a **log-only** observation (`caution_word_absent:*`), never a retry gate — forcing caution words would push the model to fabricate negatives.
- **Client display safety net:** `adaptReadingChapters` nulls out `reef`/`remedy`/`counterpoint` that merely repeat an earlier chapter (keeps first), so legacy readings stop repeating without a re-run.
- **描点 → 章节打通:** a locus `citations[].note` is the locus reading; tapping a form-map star deep-links to the owning chapter (`face` locus → 面部章, palm locus → 双手章 via `result.tsx` `chapter` param). Cited loci (a note exists) breathe brighter with a solid core; teaching-only loci stay faint and the sheet points to the report instead of inventing a reading.
- **Landmarks:** coordinates come from a Moondream 3.1 `point` pass (12 face / 7 palm loci) with the feature-VLM landmarks as fallback; **low/empty coord counts warn but never hard-reject** a clear photo (feature-text quality still gates via `photo_quality_low`). Star markers on the form map render only from these coords.
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
| VLM extract (features) | CF **Kimi K2.6** vision primary → Gemini Flash → Llama 3.2 vision (`vlm-cascade-v1`) |
| VLM extract (coords) | CF **Moondream 3.1** `point` per locus (12 face / 7 palm); feature-VLM landmarks as fallback (`xingqi-vlm-v6`) |
| Yuun explain / Yuel chapters | Same router, usually **`standard`** (parallel call shape) |

Xingqi keeps flagship for the single monolithic 6-chapter JSON; prompt engineering aligns with svc-astro Route B / guardrails.

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
