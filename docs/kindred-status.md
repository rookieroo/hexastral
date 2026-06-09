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
- ◑ **Real text-range selection — dep decision MADE; partial ship (Phase 6).**
  Two halves: (a) the *granularity* and (b) the *bubble*.
  - ✅ Granularity moved from whole-paragraph to **per-sentence**: `ChapterCard`
    `splitSentences()` makes each sentence its own `onLongPress` span, so a
    long-press picks the sentence under the finger (and only that sentence gets
    the cinnabar wash) — no dep needed.
  - ✅ The bubble is now a **minimal one-row of icons** (copy / chat / highlight /
    make-if as lucide glyphs, a11y labels retained); meanings live in the
    primer + glossary (Phase 3). `components/SelectionActionBar.tsx`.
  - ☐ **Deferred (dep):** true sub-sentence / word ranges + a bubble that
    *follows the selection* still need a native selectable-text view
    (`@alentoma/react-native-selectable-text` or equivalent). **Decision: do NOT
    add it now** — it's a native module (EAS rebuild + offline-blocked install)
    and sentence-level + icon bar already satisfies the core "select a passage,
    act on it" need. Revisit with the next native batch if users ask for it.
- ✅ **水墨晕开 transition on list→report** — DONE (Phase 4, `ReportBloom`). The
  report blooms in through `InkBloomMask` over a dark surround; the report is
  paper edge-to-edge (`kindredPaper`), which also fixed the black safe-area edges.
  No list inversion needed — `ChapterCard` is already paper. The list stays dark.
- ✅ **Highlight persistence** — DONE (Phase 6). Per-bond in AsyncStorage
  (`lib/highlights.ts`, modeled on `primer-seen.ts`): the report loads a bond's
  highlighted sentences on mount and saves on every toggle, so a marked passage
  survives navigating away. Keyed `kindred_highlights_v1_<bondId>`; best-effort
  (a storage failure degrades to no highlights, never throws into render).
- ✅ **chat / make-if consume the `quote` param** — DONE (Phase 6). Chat
  (`(bonds)/chat.tsx`) now seeds the input with the quoted sentence as an
  editable, never-auto-sent draft (`「…」\n`, capped at 140 chars), mirroring the
  solo reader's `(reading)/chat.tsx`. Make-if (`(bonds)/makeif.tsx`) shows the
  prompting sentence as a cinnabar-edged context line ("Prompted by this line" /
  「由这句而起」, i18n `makeif.fromQuote` × 4 locales) above the timing read.
- ✅ **Missing-name display (the "Unknown" the user saw).** DONE (Phase 1, B1).
  `bonds.ts:1164` mirror bond no longer stores the literal "Unknown" — it falls
  back to the relationship label, else empty, and the client resolves a graceful
  name (relationshipLabel/你). The primer (#4) teaches 甲=邀请方 / 乙=被邀请方.

### ✅ New feedback queue (2026-06-09) — resolved (see Execution plan below)

1. ✅ **Home ⇄ Threads merge** — DONE (parallel session): Threads promoted onto
   the home; home → report is one hop. Dedup by invite date → 时辰 → 意象.
2. ✅ **Per-recipient language (#6)** — DONE (Phase 5). A reads A's locale, B
   reads B's: `/invite` persists A's compose locale; accept generates B's
   synchronously and regenerates A's mirror row in A's locale in the background.
3. ✅ **Softer score (#3)** — DONE (Phase 2). The blunt number is replaced on the
   list + home by the `EssenceTag` 生 / 克 / 比和 chip (相克 softened by its 解法
   名 通关). The finer from→to read stays the report centerpiece's job (Phase 1).
4. ✅ **Reading primer (#2)** — DONE (Phase 3). One-time `ReadingPrimer` on first
   report open (甲/乙, the ink 意象, the 划词 long-press) + extended Symbol Glossary
   (roles, the four 意象, 划词 actions) reachable from a list-footer entry.
5. ✅ **Theming / skins** — DONE for the core split (Phase 4): report = paper
   document edge-to-edge, list/home stay dark, ink-bloom entrance. The
   multi-paper-texture **skin config** remains a stretch/deferred item.

---

## Execution plan (sequenced 2026-06-09) — ordered to minimise rework

> **STATUS (2026-06-09): Phases 1–6 are COMPLETE except two externally-blocked items.**
> 1–5 recap: 1 (B1 names + B2 static essence + 解法 morph), 2 (#3 essence chip), 3 (#4
> reading primer + glossary), 4 (#5 水墨晕开 + paper edges), 5 (#2 per-recipient language).
> **Phase 6 shipped this session** (everything that needed neither a new dep nor a
> device): highlight persistence (AsyncStorage, per-bond), chat + make-if quote
> seeding, the 划词 bar reworked into a minimal icon row, the B3 goldenLine
> element-mismatch prompt fix, and the real-text-range **dep decision** (defer the
> native selectable-text lib — sentence-level long-press + the icon bar is the
> shipped answer). **Only two items remain, both externally blocked:** bundling
> NotoSerifSC (needs the font binary + a subsetting pass in a networked env — the
> family-name code path is already wired) and on-device QA (centerpiece morph +
> 划词 inside MaskedView). See the Phase 6 subsection for the per-item detail.

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
  `first_impression → 'resonate'` (太極) regardless of the real 木克土.
  **DECIDED (2026-06-09, founder framework check):** the 意象 encodes the
  **static essence** of the day-master pair — fixed, three types (生→merge /
  克→oppose / 比和→resonate). The *dynamic* (how that essence is 通关 vs 无解
  across 大运/流年/流月) is **timeline + make-if's** job, NOT the report's. So:
  - **ch1 = static essence** → derive the REAL relation (drop the resonate
    hardcode; 生→merge, 克→oppose, 比和→resonate, faithfully).
  - **ch6 = 解法/dynamic** → `transition` (克→生 via 用神) — already correct
    (`long_term_advice` is `remedy` intent). 用神/解法 is needed for ALL three
    types (`computeRelationshipYongshen` already returns one for 生/克/比和),
    not just 克.
  - Report = **static essence (ch1) + 解法 (ch6)**; the living dynamic is the
    subscription layer. ch1/ch6 prompt copy should name this split + point the
    reader to timeline/make-if for "when".
  - Caveat: the 意象 is the day-master HEADLINE only (one static axis); full 合盘
    (年支生肖 / 日支夫妻宫 / 用神互补 / 十神) lives in the chapter bodies. The 意象
    is also symmetric — direction (谁克谁) stays in the body.
  - **Transitions (founder refinement 2026-06-09).** The relationship is a PATH
    `from → 解法 → to`, not a static label. (a) Generalize `InkCenterpiece`'s
    `transition` from the hardcoded oppose→merge to a parameterized `(from, to)`
    morph (`{ from: generate(fromMode), to: generate(toMode) }` — reuses
    `generate(mode)`). (b) Define the **3 pairwise morphs** (克↔生 / 平↔生 / 克↔平),
    each bidirectional → all 6 directed transitions. (c) **ch6 解法 always points
    to 生** (用神 = the flowing/generative ideal): 克→生 通关 / 平→生 泄秀引流 /
    生→生 续生. (d) The **living layer** (timeline/make-if) may morph ANY direction
    — a 大运 where 忌神/冲 dominates can degrade 生→克. Same `(from,to)` feeds both.
- **B3 (minor) — headline element mismatch.** DONE (Phase 6, prompt fix). goldenLine
  "木火相生" led with the 用神 (火), not the actual pair 木×土 — a mismatch against the
  木克土 body. `hehun.ts buildChapterPrompt` now constrains title/goldenLine to name
  the real day-master pair + its 生/克/比和, with 用神 allowed only as an explicit
  解法/通关 (never passed off as the pair's own 相生). LLM-output fix; tests green.

**Phase 1 — correctness bugs (small, foundational; everything sits on these)** — DONE (92a0200)
1. **B1 "Unknown"** — DONE. `bonds.ts:1164` mirror-bond fallback now
   `inviter.name ?? (bond?.relationshipLabel || '')` — never the literal
   "Unknown"; client guards resolve the rest. Visible on list + home + report + share.
2. **B2 + settle the `(from → 解法 → to)` model** — DONE. ch1 = real static essence
   (`first_impression` → 生/克/比和, no more hardcoded swirl); centerpiece
   `transition` is now parameterized `(from, to)` with `StaticMode` + the 3 pairwise
   morphs; `deriveTransitionEndpoints(aEl,bEl)` is the single source of truth
   (克→生 通关 / 比和→生 泄秀 / 生→生 续生). remedy chapters morph for 克 AND 比和;
   生 rests on merge. Both call sites pass the derived endpoints. Phase 2 + ch6 +
   living layer reuse this.

**Phase 2 — derived display** — DONE
3. **#3 Softer score** — DONE. The blunt 53 is gone from the threads list AND the
   home rows; both now show the `EssenceTag` 意象 chip (相生 / 比和 / 相克, with 相克
   softened by its 解法 名 通关). Server surfaces coarse `aElement`/`bElement` on the
   list payload (privacy D2: element only); chip derives the essence via the same
   `elementRelation` the centerpiece uses, so chip + ink never disagree. en locale
   gets Generative / Resonant / Tempering. The finer from→to read stays the
   report centerpiece's job (Phase 1). The detail's chapterless-fallback
   `CompatibilityScore` ring is left as-is (rare path, ceremonial reading context).

**Phase 3 — understandability (after the visual vocabulary is FINAL)** — DONE
4. **#4 Reading primer** — DONE. Two surfaces:
   - **First-report-entry overlay** (`ReadingPrimer`, gated once by
     `lib/primer-seen.ts`): teaches 甲(邀请方)/乙(被邀请方), the ink 意象 (essence not
     score), and the 划词 long-press, then a 「开始阅读」 CTA + a link into the full
     glossary. Shown over the chapter report on first open only.
   - **Extended glossary** (`(settings)/glossary.tsx`): added 3 sections — 甲/乙
     roles, the four 意象 (real `InkCenterpiece` thumbnails: merge/oppose/resonate/
     transition), and the 划词 long-press actions (copy/chat/highlight/make-if).
     The existing seals/用神/severity/numerals/seal-styles sections stay.
   - **Persistent entry**: a 宣纸-muted "Full symbol glossary" link in the threads
     list footer (always reachable, not just via Settings).
   - i18n: glossary.roles/essence/gesture.* + primer.* added across all 4 locales
     (en/zh/zh-Hant/ja). Note: 划词 actions are text labels, not icons, so the
     primer teaches the gesture + each action's meaning (not icon glyphs).

**Phase 4 — theming + transition** — DONE
5. **#5 水墨晕开 report entrance + safe-area edges** — DONE.
   - **ReportBloom** (`components/reading/ReportBloom.tsx`): wraps the 合盘 report's
     ChapterPager in a MaskedView + `InkBloomMask` (the same ink vocabulary as the
     solo ReadingOverlay). On mount the cream report blooms from centre over the
     dark surround; the feathered edge IS the 墨晕. Rests open (mask stays full →
     paging/long-press untouched); never collapses (leaving = route pop). Only the
     pager is wrapped — the off-screen share-capture target, selection bar and
     primer stay OUTSIDE the mask (a full mask would clip the off-screen capture).
   - **No list→宣纸 inversion needed**: the report cards (`ChapterCard`) already
     render on `kindredPaper.bg`, so the bloom reads paper-over-dark with the dark
     surround coming from the route's dark root — the list stays dark (ADR-0018).
   - **Black safe-area edges fixed**: the report's inner SafeAreaView is now
     `kindredPaper.bg` (was `kindredDark.bg`), so the paper reads edge-to-edge with
     no dark bands in the notch / home-indicator insets.
   - **Route**: `(bonds)/[id]` animation set to `fade` so the ink bloom is the
     transition, not a competing slide.
   - Device-QA follow-ups: confirm the horizontal ChapterPager swipe + long-press
     work inside MaskedView on device (the solo ScrollView pattern does); tune
     bloom origin/duration if the centre unfold feels off.

**Phase 5 — backend (independent track, can run in parallel)** — DONE
6. **#2 Per-recipient language** — DONE (migration-free, exploits the existing
   per-owner mirror rows).
   - **Root cause**: at resonance accept the report was generated once in B's
     `input.language` and written to BOTH mirror rows, so A read B's language. B's
     side was already correct (the accept client sends B's locale). The gap was
     A's side + an unreliable A-locale signal (the kindred client registers with
     only `{ id }`, so `users.locale` stayed the 'zh' default).
   - **A-locale signal**: the `/invite` handler now persists A's compose
     `input.language` to `users.locale` (the client already sends it). No client
     change, no migration.
   - **Generation**: B's report stays synchronous in B's locale and seeds BOTH
     rows; A's mirror row (`readingIdForInviter`) is regenerated in `inviter.locale`
     in the background (`waitUntil`) — same deterministic synastry, A's prose. The
     interpretation JSON is stamped with `language` (no schema column). Skipped
     when A and B share a locale.
   - **No GET/client change**: A's bond → A's row, B's mirror bond → B's row, so
     each viewer already fetches their own-language interpretation. Brief window
     after accept where A sees the B-language fallback until the bg regen lands
     (acceptable — "A lazily"). Solo bonds are single-viewer, already A's locale.

**Phase 6 — polish / deferred** — executed 2026-06-09; everything that needed
neither a new dep nor a device is DONE.
7. **Done this session:**
   - ✅ **Highlight persistence** — `lib/highlights.ts` (AsyncStorage, per-bond);
     loaded on mount + saved on toggle in `(bonds)/[id].tsx`.
   - ✅ **chat / make-if seed from `quote`** — chat pre-fills an editable quoted
     draft; make-if shows the prompting sentence as context (`makeif.fromQuote`).
   - ✅ **划词 bar → minimal icon row** — `SelectionActionBar` now renders lucide
     icons (copy/chat/highlight/make-if) instead of text labels; meanings in the
     primer/glossary. (The no-dep half of "real text-range 划词".)
   - ✅ **B3 goldenLine element mismatch** — prompt fix in
     `hehun.ts buildChapterPrompt`: title/goldenLine must name the **real
     day-master pair** + its 生/克/比和; 用神 may appear only as the 解法/通关 and
     must say so (no more "木火相生" on a 木克土 pair). 13/13 hehun tests still pass.
   - ✅ **Real text-range — dep decision** — defer the native selectable-text lib;
     sentence-level long-press + the icon bar is the shipped answer (see the
     reading-experience ◑ item above).
8. **Remaining — externally blocked (NOT executable offline / without a device):**
   - ☐ **Bundle `NotoSerifSC`** — the family name (`kindredFonts.cjk`) is already
     wired into the card / glossary / share artefact, so CJK falls back to the
     system serif today. To finish: drop a **subsetted**
     `apps/kindred-app/assets/fonts/NotoSerifSC-Regular.ttf` and add one
     `require(...)` to the `useFonts` block in `app/_layout.tsx` (exact TODO is in
     that comment). Blocked here: the ~25 MB binary + subsetting need a networked
     env. No code change made (a `require` of a missing asset breaks Metro).
   - ☐ **Device QA** — centerpiece static + 2 transition morphs (the spot that
     overheated before), and confirm the horizontal pager swipe + sentence
     long-press work inside `MaskedView` (ReportBloom) on a real device.

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
  zh/ja; today CJK falls back to system. Latin set already bundled. **Code path is
  wired** (`kindredFonts.cjk === 'NotoSerifSC'`, consumed by card/glossary/share) —
  only the asset + one `useFonts` `require` remain; exact TODO sits in
  `app/_layout.tsx`. Blocked offline (binary + subsetting need a networked env).
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
