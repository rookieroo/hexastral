# Feng Report v2 — Yuel alignment

Goal: bring the feng report to Yuel's report engineering + UX bar — loaders,
意象图, a terminology layer, AI chat, what-if, and the 划词 toolbar — but with
**feng-native visual design**, not Yuel clones. Date: 2026-06-30.

## Decisions (locked with founder)

1. **Borrow Yuel's architecture, design feng-native visuals.** Do NOT copy its
   moon loader / particle centerpiece / ink imagery. Design from 风水 content
   (罗盘 / 山水 / 碑拓 / 八卦 / 洛书). → **No Skia**: feng's idiom is SVG-native,
   and adding Skia only to clone effects we don't want is wrong. Everything ships
   on the current native build (react-native-svg 15 + reanimated 4).
2. **Chaptered + horizontal pager + trailing 付费墙.** Best paywall surface; each
   feng chapter (玄空/八宅/峦头…) is visually rich enough to own a page.

## Architecture map (from research)

Yuel report = horizontal 6-page pager; each page: identity line → 碑拓 numeral →
title → prose (paragraph→sentence; tap term = `TermBubble`, long-press sentence =
`SelectionActionBar`) → `ChapterToolRow`; trailing `UnlockWall`; `PageDots`;
`ReportBloom` entrance (Skia). Chat = shared core-ui `ReadingChatScreen` (feng
already uses it). What-if = `useBondMakeIf` + `makeif.tsx` (auspice solo precedent).
Term layer = one terms table feeding both glossary + generation prompt.

Skia-only in Yuel: ReportBloom, MoonPhaseLoader, InkCenterpiece. Everything else
(pager, term layer, 划词, chat, what-if, tools, share, SVG imagery) is no-Skia →
fully replicable as-is.

## Build status

### ✅ Done (built + typecheck + lint clean; 意象图 visually verified via rsvg)
- **术语解释层 (term layer)**:
  - `lib/feng-terms.ts` — 40+ curated terms across 玄空/八宅/峦头/格局/形理, zh+en
    (zh-Hant→zh, ja→en), with 出处; `segmentFengText()` greedy longest-match.
  - `components/FengTermBubble.tsx` — tap term → 宣纸 bottom sheet (category +
    定义 + 出处 + optional "ask AI").
- **划词 toolbar**:
  - `components/FengSelectionBar.tsx` — 复制/问AI/划重点, dark 墨 bar over paper,
    FadeInDown, actions render only when wired.
  - `lib/highlights.ts` — sentence highlights persisted per reportId (AsyncStorage).
- **Prose renderer**: `components/FengProse.tsx` — paragraphs→sentences;
  long-press = 划词, inline dotted term spans, 朱砂 highlight wash. The shared
  backbone for report (and chat-quote).
- **一套意象图**: `components/FengChapterImage.tsx` — per-chapter SVG: 峦头山水 /
  八卦轮+太极 / 洛书九宫 / 流年罗盘 / 化煞葫芦 / 招财古钱. Carved-rubbing,
  铜金+朱砂, tintable.
- **一套转场 Loader**: `components/FengAnalyzing.tsx` — 罗盘 (LuopanLoader) + staged
  step ticks (地图→形势→演算→synthesis) for the analysis wait; `LuopanLoader`
  stays the generic spinner.
- **碑拓章号**: `components/SealNumeral.tsx` — 朱砂 印章 with Chinese numeral.
- **i18n**: reading_copy/chat/highlight, term_source, term_ask × 4 locales.

### ✅ Done (cont.) — report v2 shell
- **Pager report** (`app/(report)/[siteId].tsx` rewritten): horizontal 章页 pager —
  each page = 碑拓 SealNumeral + tag + FengChapterImage 意象图 + title + 朱砂 golden
  line + FengProse (term layer + 划词) + the chapter's deterministic visual
  (FlyingStarsGrid + patterns + formLi / BaZhaiWheel + concord + placement /
  AnnotatedMapSwiper) + ShareFengChapterButton; trailing **closing page** (罗盘 +
  confidence notes + attribution + chat CTA); **PageDots**; FengAnalyzing staged
  loader for the analysis wait. All prior compute rendering preserved. Overlays:
  FengSelectionBar + FengTermBubble. typecheck + lint clean.
- **Chat quote seeding**: 划词 "问AI" + TermBubble "ask" → `(report)/chat?quote=…`
  → `ReadingChatScreen` `initialDraft`. (402 still uses Alert — PaywallView swap
  deferred to W5, no RevenueCat product configured yet.)
- **Glossary screen** (`app/(glossary)`): full terms reference grouped by school,
  same `feng-terms` source; wired into Settings → tools + root layout. i18n added.

### ✅ Done (cont.) — device-QA round
- **Paywall moved client-side** (`(new-site)/review.tsx`): entitlement checked
  BEFORE the costly analyze (Gemini vision + LLM + Mapbox) — one upfront prompt,
  not a late server error. `lib/dev-flags.ts` DEV-Pro bypasses on-device. Real IAP
  purchase wires into the `!entitled` branch (W5/RevenueCat). NOTE: server still
  gates — your apple_ userId must be in `DEV_PRO_USER_IDS` for DEV-Pro to actually
  generate.
- **Settings redesigned** (Yuel/Yuun): birth is a row (no dead whitespace),
  grouped rows, destructive actions centered with 删除账号 the only red, cross-app
  memory hidden (MVP). **DEV block** (`__DEV__`): DEV-Pro toggle + Reset-intro.
- **罗盘 redesigned** — `components/LuopanDial.tsx`: gold rings on near-black
  lacquer, 24山 ring + 八卦 卦象 ring + 天池 + 朱砂 north. Replaces the rainbow-wedge
  overlay in LuopanLoader + intro. (BaguaCompassOverlay kept for the
  FacingCalibrator/live-compass utility where it overlays a photo.)
- **Intro spacing**: 風 mark now clears the 罗盘.

### ⬜ Remaining
1. **what-if (假如)** — feng-native, deterministic: `(report)/makeif` — pick a
   hypothetical (改大门向 / 进入九运 / 移床灶位) → re-run `astro-core` flying-stars /
   ba-zhai client-side → diff before/after plate, highlight changed palaces; optional
   `explainWhatIf` LLM deep-read. Stronger than Yuel's because the engines are
   deterministic (the fork needs no LLM). First check: confirm astro-core compute
   fns are importable client-side in feng-app (via @zhop/astro-core / scenario-feng).
2. **ReadingPrimer**: one-time "how to read" overlay on first report open
   (精算 vs 推断 / 点词释义 / 长按追问) + `lib/primer-seen.ts` AsyncStorage flag.
3. **i18n** for the above (makeif copy, primer copy).
4. **Term definitions zh-Hant + ja** — `feng-terms.ts` is authored zh+en
   (zh-Hant→zh, ja→en, same fallback Yuel uses for ja/ko). Full translation of the
   40+ defs is a deferred content task, not a blocker.
5. **Real IAP** — RevenueCat product `hexastral_feng_single`; wire purchase into
   the review-screen `!entitled` branch (W5, founder/account task).
