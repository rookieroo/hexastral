# ADR-0018: HexAstral Design Language

- **Status**: Accepted
- **Date**: 2026-05-31
- **Supersedes (in part)**: ADR-0010 §UI (per-app tab IA — bottom tabs deprecated)
- **Related**: ADR-0015 (Product Doctrine v2), ADR-0004 (Satellite Funnel Pattern), ADR-0006 (Satellite Tiers)

## Context

For the past several months development focused exclusively on `ming-pan-app`
(was `fate-app`) so it could serve as the reference implementation for the
matrix's shared **风格 UI 模块** — animations, transitions, the Me design, the
"no bottom tab bar" structural decision. As the next four V1 apps (cycle, feng,
yuan v2, MingPan release) and the three V1.5 apps (Coincast, FaceRead,
DreamRead) come online, they need to inherit that vocabulary instead of
re-deriving their own.

The user mandate, verbatim:

> 再继续之前，首先说明一个背景：之前一直专注于fate-app的开发是因为想拿它作为
> 应用风格和公用模块的基础，现在Auspice 也需要使用fate-app 摸索固定好的风格 UI
> 模块，包括不限于各种动画效果，转场设计，Me的设计，去底部导航栏等设计，这都是
> 可以沿用，一以贯之的设计风格，也是这个玄学矩阵的调性，我希望 所有的应用保持
> 其内核不变的同时也统一应用的风格，减少元素堆叠，突破固定底部导航栏的范式，
> 极简可用，实用第一，如果这个app是漏斗app更要注意这些，flagship也要做到极简
> 易用，不要留广告位，不要复杂设计，不要堆叠元素

Decoded:

- **ming-pan-app is the canonical design + shared-module baseline.**
- All apps inherit ming-pan's UI vocabulary: animations, transitions, the Me
  surface, **the removal of the bottom tab bar**.
- The matrix has **one tone** ("玄学矩阵的调性"). **内核不变 + 统一风格**: each
  app keeps its semantic core and palette; structure + motion are unified.
- **减少元素堆叠** — reduce element stacking.
- **突破固定底部导航栏的范式** — break the fixed-bottom-tab-bar paradigm.
- **极简可用，实用第一** — minimalism, utility first.
- **Funnel apps especially** must follow this. **Flagships too — 不要留广告位
  (no ad slots), 不要复杂设计 (no complex design), 不要堆叠元素 (no stacking).**

## Decision

The following ten rules constitute the HexAstral Design Language and are
**enforceable matrix-wide** (cycle, feng, yuan v2, MingPan, Coincast, FaceRead,
DreamRead). New code that violates a rule is a blocker; legacy violations are
tracked for migration in the relevant sprint plan.

### 1. No bottom tab bar

The home of every satellite/flagship app is a single `Stack`, not a
`SatelliteTabLayout` (bottom tabs) or any other persistent-chrome navigator.

```tsx
// canonical (ming-pan-app/app/(tabs)/_layout.tsx, cycle-app/app/(tabs)/_layout.tsx):
<Stack screenOptions={{ headerShown: false, contentStyle: { bg } }}>
  <Stack.Screen name='index' />
  <Stack.Screen name='me' options={{ animation: 'slide_from_right' }} />
  {/* + any drill-in routes the app needs (`month`, `chart`, …) */}
</Stack>
```

`@zhop/satellite-ui/SatelliteTabLayout` remains exported for legacy callers but
is **deprecated for new use** and will be retired once feng + yuan v2 + V1.5
have migrated.

### 2. Left-swipe-to-Me + ⋯ accessibility fallback

Me is reached from home by **swiping left** (primary, power-user) and by a
**top-right ⋯ button** (accessibility fallback — required because
`Gesture.Pan()` can't be triggered by VoiceOver / Switch Control / Voice
Control).

Tuning constants and the commit threshold are centralised in
`@zhop/satellite-ui/SWIPE_TO_ME` so every app's gesture feels identical and
muscle-memory carries between them. Each app destructures the values and
wires its own `Gesture.Pan()` (the contract is dependency-free data — no
gesture-handler / reanimated import in `satellite-ui` itself).

```ts
import { SWIPE_TO_ME } from '@zhop/satellite-ui'
const { activeOffsetX, failOffsetY, commitDx, maxDy } = SWIPE_TO_ME
const swipeToMe = useMemo(
  () =>
    Gesture.Pan()
      .activeOffsetX(activeOffsetX)
      .failOffsetY(failOffsetY)
      .onEnd((e) => {
        if (e.translationX < commitDx && Math.abs(e.translationY) < maxDy)
          runOnJS(goToMe)()
      }),
  [goToMe, activeOffsetX, failOffsetY, commitDx, maxDy]
)
```

The ⋯ button: 44pt tap target per HIG, `accessibilityRole='button'`,
`accessibilityLabel={t.meTab}`, positioned in the safe-area top-right corner,
colour `colors.secondary` (subtle, out of the hero's visual hierarchy).

### 3. Drill-in is the depth pattern; tabs are not

Depth in the IA is reached either by:

- **Drill-in route** in the Stack (slide-in from right, native edge-swipe back).
  Use this for content with its own gesture surface (calendar grid, chart
  detail, settings hierarchies) and for any screen that has follow-on
  drill-ins of its own.
- **In-place overlay** (see ming-pan's `ReadingOverlay`) — an absolute view
  that animates in over the live home so the primary content reveal doesn't
  flash through a router transition. Use this when (a) the overlay's content
  is the primary reveal of the app and (b) it doesn't need its own
  gesture-conflicting affordance.

**Never use a bottom tab bar for depth**, and never use a hamburger / drawer
either. Both are persistent chrome that contradicts 减少元素堆叠.

### 4. Sparse home

Home is the daily-return surface. It leads with **one** clear primary content
block (the app's daily utility), holds **at most one** quiet group of
drill-in nav rows, and has nothing else. No marketing inserts. No flagship
upsells. No promotional banners. No persistent chrome.

When the primary content already carries date / identity context (e.g. cycle's
`TodayHeroCard` inside `DayView`), the home **must not** stack a redundant h1
title above it.

### 5. No ad slots — anywhere

There are no flagship-upsell cards, promo banners, "you might also like…"
inserts, or any other ad-like surface on **home**, **flagship surfaces**, or
**funnel surfaces**. This is the explicit interpretation of *不要留广告位*.

Flagship discovery (cross-app links to yuan / feng / MingPan / etc.) is
permitted **only** in Me, **and only as a collapsed disclosure** ("Discover" /
"探索矩阵" / "ほかのアプリ"), expanded by an explicit tap. The collapsed state
is one row of label + chevron — no copy, no preview, no badges.

### 6. One transition vocabulary

| Transition                | Implementation                                                |
| ------------------------- | ------------------------------------------------------------- |
| Splash → home (magic-move) | `useMagicMove` + `V15Moon` from `@zhop/core-ui/motion`        |
| Home ↔ Me                 | Stack `animation: 'slide_from_right'`                         |
| Home ↔ drill-in           | Stack `animation: 'slide_from_right'`                         |
| In-place overlay reveal   | reanimated v4 shared values + `withTiming`/`withSpring`       |
| Brush-stroke seal reveal  | `SealStamp` / `UnsealReveal` from `@zhop/core-ui/motion`      |
| Ink-bloom content reveal  | `InkWipeReveal` / `InkBloomMask` from `@zhop/core-ui/motion`  |

All motion uses **reanimated v4** + **expo-haptics**. RN `Animated` is
forbidden for new code (it was already a CLAUDE.md house rule; this ADR
re-affirms it).

### 7. V15Moon is the matrix visual anchor

The 15th-day moon (`V15Moon` from `@zhop/core-ui/motion`) is the shared visual
identity across the matrix. Apps that use a splash or hero anchor use V15Moon;
apps that don't (e.g. utility-dominant cycle) at minimum carry V15Moon in
share posters and Me. Per-app palette around the moon is free; the moon
itself is the through-line.

### 8. Per-app palette kept; structure + motion unified

Apps preserve their semantic palette (their *内核*):

| App      | Palette / mode default          | Rationale                                        |
| -------- | ------------------------------- | ------------------------------------------------ |
| MingPan  | ink / dark only                 | Lifelong-chart contemplation; reference imp.    |
| cycle    | 朱泥 terra / paper, defaults light | 黄历 is a daily-use almanac, read in daylight   |
| feng     | TBD — paper-leaning             | Site / room readings happen in lit environments |
| yuan v2  | TBD                             | (Sprint plan-time decision)                     |
| Coincast | TBD — dark-leaning              | Divinatory ritual surface                       |
| FaceRead | TBD                             | Capture + analysis flow                         |
| DreamRead| dark / nocturnal                | Dream journaling — used at night                |

What is **shared** across all of them: the structural rules (1, 3, 4, 5),
the transitions (6), the V15Moon anchor (7), and the Me chrome pattern (10).

### 9. Accessibility is a first-class constraint, not an afterthought

Every gesture-driven navigation **must** ship with a `Pressable` fallback that
exposes `accessibilityRole='button'` and an `accessibilityLabel`. The fallback
is not optional — it's why ⋯ exists.

Every interactive surface meets the 44pt tap target (use `hitSlop` when the
visual is smaller). Colour contrast follows WCAG AA against each per-app
palette; the `colors.dim` / `colors.secondary` tokens in
`@zhop/hexastral-tokens` are tuned for AA across both modes.

### 10. The Me chrome pattern

Me is a `ScrollView` of grouped cards. Every Me has:

1. A top-left **back affordance** (`BackArrowIcon` from
   `@zhop/hexastral-icons/action`) — Me is now pushed, not a tab, so the
   iOS edge-swipe alone is not discoverable (Android needs the visible
   chevron anyway).
2. The app title (the `t.meTab` string).
3. The app's data cards (birth info / settings / language / push).
4. **Account** card (sign-in / sign-out / bind email / delete account /
   sync — depending on tier).
5. **Discover** disclosure (collapsed; see rule 5).
6. **Privacy + Terms** rows (required by App Store 5.1.1 + GDPR).
7. **Danger zone** (delete account, if signed in).
8. **Dev** card (only under `__DEV__`).

Tier-3 satellites (cycle, feng) skip 4 and 7 (no account, nothing to delete
server-side). All other rows are mandatory.

## Shared modules

| Module                                       | What it provides                                                |
| -------------------------------------------- | --------------------------------------------------------------- |
| `@zhop/satellite-ui` `SWIPE_TO_ME`           | The swipe-to-Me tuning contract (rule 2). Pure data, zero deps. |
| `@zhop/core-ui/motion` `useMagicMove`        | Splash → home FLIP magic-move (rule 6).                         |
| `@zhop/core-ui/motion` `V15Moon`             | The matrix visual anchor (rule 7).                              |
| `@zhop/core-ui/motion` `AutoMoonPhaseLoader` | Loading state matching the moon vocabulary.                     |
| `@zhop/core-ui/motion` `InkWipeReveal` etc.  | The ink / brush motion vocabulary (rule 6).                     |
| `@zhop/hexastral-icons/action`               | `BackArrowIcon`, `ChevronDownIcon`, `ChevronRightIcon` (rule 10) |
| `@zhop/hexastral-tokens/palette`             | Per-mode `ModeTokens` per-brand palette (rule 8).               |

**Reference implementation**: `apps/ming-pan-app/app/(tabs)/index.tsx` and
`apps/ming-pan-app/app/(tabs)/me.tsx`. Read these before writing any new
satellite/flagship home.

## Per-app migration status (snapshot 2026-05-31)

| App         | Status                | Notes                                                |
| ----------- | --------------------- | ---------------------------------------------------- |
| MingPan     | ✅ Reference          | Inline-then-extracted: now consumes `SWIPE_TO_ME`. |
| cycle       | ✅ Migrated this ADR  | Tab bar removed; Today + Me + month under the rules. Splash + magic-move polish deferred to Sprint 2 (motion pass). |
| feng        | ⏳ Pending            | Sprint plan to update to the no-tab pattern.        |
| yuan v2     | ⏳ Pending            | Greenfield — adopt directly.                         |
| Coincast    | ⏳ Pending (V1.5)     | Greenfield — adopt directly.                         |
| FaceRead    | ⏳ Pending (V1.5)     | Greenfield — adopt directly.                         |
| DreamRead   | ⏳ Pending (V1.5)     | Greenfield — adopt directly.                         |

## PR compliance checklist

Reviewers MUST check the following on any PR touching a satellite/flagship's
navigation, home, or Me:

- [ ] `(tabs)/_layout.tsx` is a `Stack`, not `SatelliteTabLayout`.
- [ ] Home registers **no** `Tabs` / no persistent bottom chrome.
- [ ] Home wires `SWIPE_TO_ME` from `@zhop/satellite-ui` (no inline literal
      `-24` / `-28` / `-56` / `80` thresholds anywhere).
- [ ] ⋯ button on home: `accessibilityRole='button'`, `accessibilityLabel`,
      `hitSlop` ≥ 12, 44×44 tap target.
- [ ] Home contains **no** `FlagshipUpsell*` / `SatelliteFlagshipUpsellCard` /
      `SatellitePromoCard` / any other discovery card.
- [ ] If flagship discovery is needed: it lives in Me, in a `Discover` /
      `t.discover` collapsed disclosure, expanded by an explicit tap.
- [ ] All drill-in screens registered with `animation: 'slide_from_right'`.
- [ ] Me has a `BackArrowIcon` at top-left → `router.back()`.
- [ ] No `import .* from 'react-native/.*\bAnimated\b'` (use reanimated v4).
- [ ] Per-app palette respected: cycle/feng remain paper-capable; MingPan
      stays dark-only.

## Consequences

**Positive**:

- One navigation vocabulary across the matrix means users transferring from
  cycle to feng to MingPan use the same muscle memory.
- The reviewer-visible surfaces (home, Me) become demonstrably less
  ad-anchored, which helps Apple 4.3(b) "abundance" / "lacks unique value"
  reviews — there's no cluttered upsell chrome to flag.
- Reducing element stacking + standardising motion makes screenshots /
  marketing renders cleaner with no per-app art-direction overhead.
- `SatelliteTabLayout` becomes deletable once feng + yuan v2 migrate,
  shrinking `@zhop/satellite-ui`'s API surface.

**Negative**:

- Each app's home needs a (small) rework — gated by careful per-app PRs
  rather than one big-bang refactor.
- Gestures need an accessibility fallback every time (rule 9). This is
  discipline cost; tooling can lint for the presence of `accessibilityRole`
  on the ⋯ button but can't fully verify behaviour.
- Motion polish (splash magic-move, swipe-hint fade-in) **cannot** be
  verified in CI or in this agent's harness — it needs simulator /
  Expo Go human verification per app. Sprint plans must explicitly
  schedule a "motion pass" with simulator time.
- Bottom-tab discoverability is real and we're trading it for swipe +
  ⋯ button + drill-in rows. The ⋯ button is the safety net; the
  swipe-hint (fade-in after `SWIPE_TO_ME.hintDelayMs`) is the secondary
  discoverability for power users.

## Cross-references

- The reference implementation: `apps/ming-pan-app/app/(tabs)/index.tsx`,
  `apps/ming-pan-app/app/(tabs)/me.tsx`, `apps/ming-pan-app/app/(tabs)/_layout.tsx`.
- The shared swipe contract: `packages/satellite-ui/src/swipe-nav.ts`.
- Auspice's adoption (the second consumer, validating the abstraction):
  `apps/auspice-app/app/(tabs)/_layout.tsx`, `…/(tabs)/index.tsx`,
  `…/(tabs)/me.tsx`, `…/(tabs)/month.tsx`.
- ADR-0015 Product Doctrine v2 — the "utility-anchored + classical-cosmology"
  product brief this design language operationalises.
- ADR-0004 Satellite Funnel Pattern — the funnel direction; this ADR adds
  the rule that funnel UIs **must** avoid ad slots on home.
