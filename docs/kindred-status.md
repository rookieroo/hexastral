# Kindred — Status & Task Board

_Last updated: 2026-06-08. A living tracking layer over the detailed plans — it
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
