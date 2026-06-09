# Kindred — Status & Task Board

_Last updated: 2026-06-09. A living tracking layer over the detailed plans — it
records **what's done** and **what's next**, and points to the ADRs / plan docs
rather than restating them._

**Master context:** [ROADMAP.md](ROADMAP.md) · solo-first frame
[ADR-0021](decisions/0021-kindred-v2-solo-first-mingpan-frame.md) · bonds
timeline [ADR-0014](decisions/0014-bonds-timeline-architecture.md) · make-if
insight layer [ADR-0023](decisions/0023-timeline-makeif-insight-layer.md).

## Strategy in one paragraph

Ship **Auspice + Kindred** to the App Store (June 2026). **分轴 to dodge App
Store 4.3:** auspice = _self × time_; kindred = _relationship × time_. **Hard
rule: kindred NEVER builds a personal timeline / make-if** (that's auspice's
moat) — it always shows two people; cross-sell via the auspice⇄kindred handoff.
feng-app is deprioritized. Money = **one-time deep report** (合盘 $6.99 /
personal $4.99) **+ subscription living layer** (合盘 timeline / make-if / node
notifications / 划词 chat quota).

---

## Session 2026-06-09 — viral funnel repair + reading-experience overhaul

The invite→accept→report loop was **completing for nobody**; the report's
reading surface needed a pass. All API/web fixes are **deployed**; app fixes are
**client-only → reload** (no native rebuild except where noted).

### ✅ Viral funnel — fixed end-to-end (was 100% broken)

- **Accept page collects B's birth.** `app/accept/[token].tsx` rewritten — the
  web `/resonate` is form-LESS by design and DELEGATES the birth form to the
  app, but the app never built it → every accept 400'd "Birth data required".
  Now mounts the onboarding `BirthForm`, sends `birthData` to `respond`, and
  saves B's birth as their own self-chart.
- **Accept paywall removed.** `bonds.ts` respond → resonance is FREE for both by
  design, but the handler called `checkReadingAccess(allowBondInviteCredit)`,
  which tried to CONSUME a credit only GRANTED ~200 lines below → 403'd before
  the grant. The flow never completed for anyone. Gate removed.
- **Full report free for both.** Set `chaptersUnlocked: true` on BOTH resonance
  bonds (was asymmetric — only A got the user-level bump). $6.99 wall now lives
  only on SOLO bonds + Pro (timeline / make-if).
- **Accept returns `bondId`.** respond returned the bond as `mirrorBondId`, but
  the client navigates to `result.bondId` (undefined) → "Open the thread" routed
  to `/(bonds)/undefined`, a dead screen that looked "pending" though the accept
  fully succeeded. Now returns `bondId`.
- **B no longer trapped on the onboarding form.** Accept never marked onboarding
  complete → the launch gate bounced B to `/(onboarding)/pair-input` forever.
  Fixed two ways: accept calls `markOnboardingComplete()` (success/410/Later →
  home), and the launch gate (`app/index.tsx`) treats a **saved self-birth** as
  "returning → home" (auto-unsticks anyone with a chart).
- **Web `/resonate` redesigned** — dark `#0B0B0C` + a **faithful 水墨 moon**
  (feTurbulence+feDisplacementMap inkTerm + paper-grain overlay + the app's exact
  phase-0.25 geometry from `moon.ts`, not a smooth gradient sphere); CTA stacking
  fixed; filled gold pill. Deployed.
- **Invite locale consistency** — `resonanceInviteSchema` gained `language`; the
  app passes its locale; server priority `request.language → user.locale → 'en'`
  (never silently `zh`); `resonateUrl` is locale-prefixed so the landing matches.
- **Relationship labels** — 恋人 → **"Partner"** (kept), 合伙人 → **"Cofounder"**
  (de-collided from "Business partner") across all 5 label tables.
- **Home hero** — the obscure 天干 char (乙) replaced by the day-master's element
  as a 朱砂 `AncientSeal` (木 ancient pictograph), element word localized.

### ✅ / ☐ Report reading experience

- ✅ **Report page is clean.** `app/(bonds)/[id].tsx` multi-chapter view — removed
  ALL top chrome (back / title / "Sent · Info complete" / time / the two entries).
  Exit via edge-swipe; post-accept lands home→report so swipe-back has a home.
- ✅ **划词 SelectionActionBar v1.** Long-press a report paragraph → a bottom bar
  with **copy · chat · highlight · make-if**. Highlight = session cinnabar wash;
  copy via **expo-clipboard** (installed `@8.0.8`); chat/make-if carry the quote.
  Threaded `ChapterPager → ChapterCard`. `components/SelectionActionBar.tsx`.
- ☐ **Real text-range selection** — the user wants to select *words/sentences*
  (not just long-press a whole paragraph) with the bubble **following the
  selection**, and the bubble as a minimal **one-row of icons** (meanings in the
  primer). RN has no reliable text-range selection geometry → needs a
  selectable-text lib (e.g. `@alentoma/react-native-selectable-text`) or a native
  module. v1 is paragraph-long-press + bottom bar. **Device-QA + dep decision.**
- ☐ **水墨晕开 transition on list→report** — reuse the solo reader's `InkBloomMask`
  (`core-ui/motion/InkWipeReveal`). The report page itself can be **black bg**;
  the **list/home page needs 宣纸 (`kindredPaper`) texture** so the ink blooms on
  paper. Fix the "weird black safe-area edges" as part of this.
- ☐ **Highlight persistence** — session-local now; AsyncStorage-per-bond follow-up.
- ☐ **chat / make-if consume the `quote` param** — it now flows to both routes;
  the screens should seed their context from it.
- ☐ **Missing-name display (the "Unknown" the user saw).** Server already falls
  back to 甲方/乙方 (`hehun.ts:166`); the client must match — any place a nameless
  bond renders should show **甲 (inviter) / 乙 (you)** or the relationship, never
  the bare "Unknown" / blank. List + detail headers already do name‖relationship
  (2026-06-09); audit the report body + share card + identity line for stragglers.
  Pairs with the primer (#4), which is what *teaches* 甲=邀请方 / 乙=被邀请方.

### ☐ New feedback queue (2026-06-09) — design-led, prioritized

1. **Home ⇄ Threads merge** — promote the Threads list ONTO the home (kill the
   extra `/(bonds)` list level; home → report is one hop, not two). Dedup
   same-relation threads by **invite date → 时辰 → random 意象** when neither
   distinguishes. (`app/(reading)/index.tsx` + `app/(bonds)/index.tsx`.)
2. **Per-recipient language (#6)** — generate A's report in A's locale + B's in
   B's (two versions); the report is currently one interpretation (accepter's
   locale) shared by both. Backend: generate B's at accept-time, A's lazily so
   accept doesn't pay 2× AI latency. (`bonds.ts` respond.)
3. **Softer score (#3)** — replace the blunt number (e.g. 53) on the list with
   the **生 / 克 / 平** imagery (already derived by `deriveCenterpieceMode`).
4. **Reading primer (#2)** — a "how to read this" guide: 甲/乙 (inviter/you),
   五行, 生克, what the 意象 (centerpiece) shows, what each of the 6 chapters
   covers, what to focus on, AND the 划词 icon meanings. Shown entering the
   report (first time) + a **persistent entry on the list**. Extends the Symbol
   Glossary (already built at `app/(settings)/glossary.tsx`).
5. **Theming / skins** — report = black; list = 宣纸; (stretch) a skin config
   with several paper textures.

---

## Execution plan (sequenced 2026-06-09) — ordered to minimise rework

Device screenshots (2026-06-09 18:15) confirmed: **Home⇄Threads merge (#1) is
DONE**; the report page is clean ✅; two new bugs surfaced. Do these IN ORDER —
each phase settles something the next phase depends on, so later work doesn't
get re-done.

**New bugs from the screenshots (root-caused):**
- **B1 — the literal "Unknown".** `bonds.ts:1164` mirror-bond
  `targetName: inviter.name ?? 'Unknown'` → when the inviter has no account
  name, B sees "Unknown". Fix: fall back to the **relationship label** (never the
  bare string). Client also treats a literal `'Unknown'` as empty (belt + braces).
- **B2 — centerpiece 比和 on a 克 pair.** `InkCenterpiece.tsx:96` hardcodes
  `first_impression → 'resonate'` (太極) regardless of the real 木克土. **Decision
  needed:** keep the poetic "first meeting" 太極, OR reflect the real relation
  (transition 克→生). Settle this BEFORE the score (#3) reuses the same 生克平.
- **B3 (minor) — headline element mismatch.** goldenLine "木火相生" leads with the
  用神 (火), not the actual pair 木×土 — reads as a mismatch against the 木克土 body.
  Content/prompt tweak; low priority.

**Phase 1 — correctness bugs (small, foundational; everything sits on these)**
1. **B1 "Unknown"** — server fallback → relationship label; client guards. One
   bug, visible on list + home + report + share.
2. **B2 + settle 生克平 derivation** — decide the `first_impression` mode + confirm
   `elementRelation`/`deriveCenterpieceMode` is the single source of truth for
   生/克/平. Phase 2 reuses it, so fix it here or pay twice.

**Phase 2 — derived display**
3. **#3 Softer score** — replace the blunt 53 with 生/克/平 imagery on home+list,
   reusing the (now-correct) Phase-1 derivation.

**Phase 3 — understandability (after the visual vocabulary is FINAL)**
4. **#4 Reading primer** — teaches 甲(邀请方)/乙(被邀请方), 五行, 生克, the 意象
   (centerpiece) meanings, the 6 chapters, and the 划词 icon meanings; shown on
   first report-entry + a persistent list entry. Extends `glossary.tsx`. Done
   AFTER Phase 1–2 so it documents the final seals/centerpiece/score — no rework.

**Phase 4 — theming + transition**
5. **#5 Report = black bg, list/home = 宣纸** + the 水墨晕开 list→report transition
   (`InkBloomMask`) + fix the weird black safe-area edges.

**Phase 5 — backend (independent track, can run in parallel)**
6. **#2 Per-recipient language** — generate A's report in A's locale + B's in B's
   (B at accept-time, A lazily). No coupling to the UI phases.

**Phase 6 — polish / deferred (needs a dep or device)**
7. Real text-range 划词 selection (selectable-text dep decision) · highlight
   persistence (AsyncStorage) · chat/make-if seed from `quote` · bundle
   `NotoSerifSC` · centerpiece-morph Device QA.

---

## Workstream A — Paid synastry report redesign (the $6.99 problem)

The report was thin **by prompt**, not by schema. This workstream makes it worth
the price and gives it a hand-built 墨儀 visual identity that differentiates hard
from auspice's git-graph.

### ✅ Done

- **Backend — per-chapter 4-layer generation + unified 用神.**
  `services/svc-astro/src/services/hehun/hehun.ts`: 6 chapter calls + 1 aha call
  (parallel, `allSettled`, failed chapters drop). New optional fields on
  `SynastryChapterOutput`: `evidence / dynamic / reef + severity('low'|'mid'|'high')
  / remedy + yongshen(WuXing) / counterpoint`. `computeRelationshipYongshen(aEl,bEl)`
  = ONE deterministic 通关用神 for the whole report (克→bridge, 比和→泄秀, 相生→outlet).
  Tests + typecheck + biome clean. Legacy parser/tests kept.
- **ChapterCard → locked "chapter-en" design** (`packages/scenario-kindred`).
  碑拓 seal · 4-layer body (hanging 篆 numerals) · 朱批 severity · 朱文 用神 key ·
  hand-authored ancient numerals · whitespace structure (NO web widgets). Bilingual
  via `isCjkLocale`. On `kindredPaper`.
- **Glyph system (hand-authored vectors, licensing-safe).** `glyphs.ts`
  (GLYPHS 見言北合月永 + 五行 + NUMERALS + CHAPTER_SEAL/WUXING_GLYPH maps),
  `AncientSeal` (碑拓 + 朱文 modes), `RiskMark`, `AncientNumeral`, `ChapterMeta`.
- **Centerpiece — `InkCenterpiece` (apps/kindred-app/components/ink/).** Element-
  agnostic 水墨粒子, pure two-tone on grey, no red. **FOUR states:** merge 生 (one
  blob) · oppose 克 (two camps + IRREGULAR never-crossed no-man's-land) · resonate
  比和 (太極 swirl) · **transition 克→生** (the only animated one: a LIGHTWEIGHT
  morph — crossfade two precomputed static endpoints, animating ONLY opacity +
  translateX, GPU-side, no per-particle CPU; plays ONCE when the chapter becomes
  the active page, ~3.2s, then rests on 生). Data-driven via
  `deriveCenterpieceMode(kind, aEl, bEl, severity)`; per-`kind` salt so same-state
  chapters differ. **NOTE:** a per-particle animated sim was built first and
  REVERTED — it overheated / dropped frames on device (保体验和性能是首位).
- **Fonts (free-commercial, SIL OFL).** 4 Latin `.ttf` bundled + loaded via
  `expo-font` useFonts in `app/_layout.tsx`: Libre Baskerville, Crimson Pro (+Italic),
  IBM Plex Mono.
- **DEV preview** `app/chapter-preview.tsx` (Metal×Fire sample) — renders the locked
  card + all 4 centerpiece states + the morph; reachable from home DEV row / `/_sitemap`.
- **Centerpiece wired into the REAL report screen.** Server (`bonds.ts` GET /:id)
  computes both day-master 五行 from the stored births (`getFourPillars` + `STEM_WUXING`,
  coarse element only — Privacy D2) and attaches `personAElement` / `personBElement`
  to the interpretation (`PairInterpretation` type updated). `app/(bonds)/[id].tsx`
  reads them and feeds `ChapterPager` `aElement` / `bElement` / `locale` +
  `renderCenterpiece` (mode via `deriveCenterpieceMode`, `active = idx === chapterIndex`).
  The ink art now shows on real bonds, not just the DEV preview.
- **Settings → Symbol Glossary screen.** `app/(settings)/glossary.tsx` — a
  map-legend that decodes the six chapter 碑拓 seals, the five 五行 用神 keys, the
  three 暗礁 朱批 severities, the 1–6 积画 numerals and the 碑拓-vs-朱文 style
  contrast, on `kindredPaper`. Reuses the exact card glyph primitives (now
  exported from the `scenario-kindred` barrel: `AncientSeal` / `AncientNumeral` /
  `RiskMark` / `YongshenKey` + `GLYPHS` / `CHAPTER_SEAL` / `WUXING_GLYPH` /
  `NUMERALS` / `kindredFonts`). Linked from a new Reference section on the
  settings index. Full i18n en / zh / zh-Hant / ja.
- **ShareableChapterCard redesigned onto 墨儀.** `ShareableChapterCard.tsx` — the
  9:16 capture artefact now matches the report: 碑拓 essence seal + display/CJK
  title + ancient chapter numeral + 五行 subtitle on top; the goldenLine as the
  hero (serif/italic, CJK-aware) with one cinnabar seal-dot; a cinnabar 朱文
  Kindred seal (合) + brand at the foot (replaced the old rounded "logo bubble").
  Locale-aware fonts via `isCjkLocale`. New optional props (`locale` / `aElement`
  / `bElement` / `chapterNumber`) wired from real report data at the `[id].tsx`
  capture site; body text still never included.

### ☐ Remaining
- **Bundle CJK font.** `NotoSerifSC` (subsetted — full variable font ≈ 25 MB) for
  zh/ja; today CJK falls back to system. Latin set already bundled.
- **碑拓 / ink textures.** `AncientSeal` renders clean solid forms; the stone-rubbing
  erosion + the centerpiece's wash/飞白 texture are a Skia follow-up (not RN-SVG
  filter portable).
- **Device QA.** Centerpiece static states + the 2 transition-chapter morphs
  (complement / long_term) — confirm smooth + cool (this is the exact spot that
  overheated before). Then card layout on real device widths.

---

## Workstream B — Living layer (合盘 timeline + make-if) · the subscription moat

Kindred's _relationship × time_ surface. Detailed in
[bonds-timeline-plan.md](bonds-timeline-plan.md) ·
[timeline-makeif-gitgraph.md](timeline-makeif-gitgraph.md) ·
[ADR-0014](decisions/0014-bonds-timeline-architecture.md) ·
[ADR-0023](decisions/0023-timeline-makeif-insight-layer.md).

- ✅ **合盘 timeline (流年/大运)** — the ego-centric multi-bond axis (`composeBondsTimeline`
  + `GET /api/bonds/timeline` + `app/(timeline)/index.tsx`), privacy-projected (D2),
  gated (`userHasCapability ...'kindred'`). Always two people; never a personal timeline.
- ✅ **合盘 timeline 流月 living layer** — the near-term monthly detail (`getRelationshipLiuYueNodes`
  + `composeBondsLiuYue` + `buildEgoLiuYue` → `liuyue` on the timeline response; a
  month strip with tap-to-read on the screen). Orthogonal to the lifetime axis,
  never pushed. Free = current month taste, Pro = 12-month window. Golden-tested.
- ✅ **合盘 make-if (forward decision support)** — `planRelationshipDecision` +
  `relationshipYongshen` (astro-core) rank the bond's forward 流月 windows by
  用神 alignment + 流月 冲/合 → per-window lean/reasons + a deterministic verdict.
  `POST /api/bonds/:id/makeif` (D2-safe, Pro-gated) → `useBondMakeIf` +
  `app/(bonds)/makeif.tsx` (用神 + verdict + ranked month cards, best highlighted).
  Verdict/reasons localized client-side (en/zh/zh-Hant/ja, no Chinese in the EN
  surface). **Forward decision framing only** — no past rumination (the risky use
  the Auspice S5 cut flagged). Insight-layer per ADR-0023, NOT git-graph.
- ☐ **Relationship node notifications** — pure schedule builder (`buildTimelineNotificationPlan`)
  shipped + tested; on-device `expo-notifications` wiring deferred to the EAS/native
  batch (offline sandbox can't add the dep).
- ✅ **Gating** — solo reading stays a static on-ramp; all _living_ features require a
  bond + subscription (server-authoritative `pro`/`upsell`).

---

## Workstream C — Supporting / product

### Viral loop (病毒分裂) — audit 2026-06-08

- ✅ **Cold-install handshake (DDL) wired** — was the fatal break: B tapping A's
  `/resonate` link without the app installed lost the token on cold start and
  dropped into generic onboarding (K-factor from new users ≈ 0). Now web
  `/resonate` registers a DDL session (`DDLRedirectButton`, `payload:{kind:
  'kindred-accept', token}`) before the App Store redirect, and the app recovers
  it on first launch via `lib/ddl.ts` (`attemptKindredDdlRestore` → token resolve
  then fingerprint `matchDDLSession`) → routes to `/accept/[token]`. Logic-verified
  + unit-tested; **needs device QA to confirm the fingerprint match scan-rate**.
- ✅ **Share-card scannable install path** — the 9:16 `ShareableChapterCard` now
  bakes a SCANNABLE QR of the real per-share install URL (`createShareUrl` →
  `res.url`). Self-contained encoder `lib/qr.ts` (byte mode, ECC M, versions 1–6;
  no native dep) rendered via the existing `react-native-svg` (`components/QrCode.tsx`).
  GF(256)+Reed–Solomon core unit-tested against the published QR generator-poly
  vectors — verifiable without a scanner; **final scan confirmation is device QA**.
- Soft throttle (by design): free users cap at 3 bonds (`FREE_BOND_LIMIT`).

- ☐ **Pairing** — DDL / fingerprint / ref / mailto / contacts 合盘 backend already
  built; **email-first, contacts deferred** (see yuan-pairing notes). Front-end
  pair-input is a 3-step first-run flow (self → choose → other).
- ☐ **Quality pass** — match ming-pan's 质感; filled CTAs + Rive mascot scaffold
  shipped; keep closing the core-ui/motion gap.
- ☐ **Theme** — dark-only + 宣纸 document layer (`kindredPaper`); NOT light mode.
- ☐ **Monetization plumbing** — one-time report IAP (合盘 $6.99) + subscription
  (living layer); RevenueCat. DEV Pro toggle exists in settings.
- ☐ **Cross-sell** — auspice⇄kindred handoff (`/api/bonds/solo` receive path live).

---

## Key files (this redesign)

| Area | Path |
|---|---|
| Backend report | `services/svc-astro/src/services/hehun/hehun.ts` (+ `.test.ts`) |
| Card + pager | `packages/scenario-kindred/src/components/{ChapterCard,ChapterPager,ChapterMeta}.tsx` |
| Glyphs | `packages/scenario-kindred/src/{glyphs.ts,kindredFonts.ts}` + `components/{AncientSeal,AncientNumeral,RiskMark}.tsx` |
| Centerpiece | `apps/kindred-app/components/ink/InkCenterpiece.tsx` |
| Real report | `apps/kindred-app/app/(bonds)/[id].tsx` ← centerpiece wired |
| DEV preview | `apps/kindred-app/app/chapter-preview.tsx` |
| Share | `packages/scenario-kindred/src/components/ShareableChapterCard.tsx` (old design) |
| Design mocks (scratch, NOT in repo) | `~/Desktop/kindred-design-mock/` — `chapter-en.png`, `glossary.png`, `static-states.png`, `morph-strip.png` |
