# `<BirthInfoForm>` — spec for the unified core-ui birth-info entry

> **Status**: design spec (decisions locked); implementation = Phase J.1.1.
> **Created**: 2026-05-19.
> **Decision records**: [ADR-0008](decisions/0008-three-layer-architecture.md) (three-layer rule), [phase-j-plan.md §1.1](phase-j-plan.md#11--birth-info-entry-continue-y4).
> **Audit input**: comparative read of hexastral-app `(birth)/*`, yuan-app `(onboarding)/*`, yuan-app `fill-other.tsx`, feng-app `(new-site)/*` (2026-05-19 session transcript).

## 0. Goals

1. **One shared birth-info entry flow** consumed by hexastral-app + yuan-app + (optionally) future apps that need 八字 input.
2. **Per-app brand identity preserved** via accent color + optional decorative crown — without forking the form.
3. **Higher data quality** than the current state: lunar/solar toggle on date, mandatory review step, lunar conversion baked in.
4. **Defines the HexAstral family visual baseline** — structural rhythm (5-step + review + hairline progress) becomes the publisher's recognizable signature across apps.

## 1. Architectural shape

Lives in `packages/core-ui/src/components/birth-info/`. Public exports:

```ts
export { BirthInfoForm } from './BirthInfoForm'
export type {
  BirthInfoFormProps,
  BirthInfoValue,
  BirthInfoStep,           // 'date' | 'time' | 'gender' | 'place' | 'review'
  BirthInfoCopy,
} from './BirthInfoForm'

// Step components also exported for apps that want to compose a custom flow
// (e.g. yuan-app's fill-other dense single-screen variant).
export { BirthDateStep } from './BirthDateStep'
export { BirthTimeStep } from './BirthTimeStep'
export { BirthGenderStep } from './BirthGenderStep'
export { BirthPlaceStep } from './BirthPlaceStep'
export { BirthReviewStep } from './BirthReviewStep'
export { BirthProgressIndicator } from './BirthProgressIndicator'
```

The composite `<BirthInfoForm>` is the **default 5-step + review flow**.
The standalone step components let yuan-app's fill-other-style power-user
screen compose them inline without buying into the multi-screen flow.

## 2. Visual identity (locked)

Hybrid synthesis per audit:

### Typography (from yuan-app's scale)

| Token | fontSize | fontWeight | letterSpacing | Use |
|---|---|---|---|---|
| `hero` | 32 | 400 | -0.5 | Welcome / intro only |
| `stepTitle` | 26 | 500 | 0.4 | Each step's title |
| `stepSubtitle` | 14 | 300 | 0 | Step explanatory copy |
| `sectionLabel` | 11 | 700 | 4 (uppercase) | Field labels in review |
| `value` | 16 | 400 | 0 | Review row values |
| `input` | 18 | 500 | 0 | Text inputs (place, name) |
| `cta` | 14 | 500 | 1.4 (uppercase) | Next / Submit button |
| `secondaryCta` | 13 | 300 | 0 (underline) | Skip / "I don't know" |

These extend (don't replace) core-ui's existing `TYPOGRAPHY` tokens — add
a `birth.*` namespace if collision risk exists.

### Color tokens (from hexastral's auto-theme)

Form chrome reads from `useTheme()` (existing CoreUIProvider):
- `colors.bg` — screen background
- `colors.text` — primary text
- `colors.secondary` — subtitle, captions, muted labels
- `colors.separator` — hairline borders, progress segments
- `colors.card` — review card surface

The form does **NOT** read `colors.accent` directly. Instead, accent comes
via prop (see §3) so per-app branding stays explicit and overridable.

### Progress indicator

Lifted from hexastral-app's pattern: 5 segments, each 24×1px, gap 6px,
positioned at the top of every step screen.

```
██ ██ ▢▢ ▢▢ ▢▢     ← step 2 active
```

Active segment: `colors.text`. Inactive: `colors.separator`. Becomes the
HexAstral visual signature — same shape across hexastral-app, yuan-app,
feng-app (the latter for site flow if it adopts).

### Spacing + radius

All from core-ui's existing `SPACING` + `BORDER_RADIUS`. No new tokens.

## 3. `BirthInfoFormProps`

```ts
interface BirthInfoFormProps {
  /** Existing draft (resume) or empty (fresh entry). */
  value: Partial<BirthInfoValue>

  /** Called on every step's commit; commits to app's draft store. */
  onChange: (next: Partial<BirthInfoValue>) => void

  /** Called when the user taps Submit on the review screen. */
  onSubmit: (final: BirthInfoValue) => Promise<void>

  /** Per-app brand color used for: active progress segment override, link
   *  accents, success states. Required — no default. Examples:
   *    yuan: '#9B2226' (cinnabar) — see hexastral-tokens cinnabar.seal
   *    hexastral: undefined → falls back to colors.text (mono-accent)
   *    feng: '#B08D5B' (copperGold) — see FENG_PALETTE.copperGold
   */
  accent: string

  /** Optional decorative element rendered above the welcome step title.
   *  yuan passes <YuanSeal mode='breathing' size={120} />, feng could pass
   *  a compass glyph, etc. Skip if you don't want a crown. */
  crown?: ReactNode

  /** Localized strings. App provides via i18n; defaults provided for en/zh. */
  copy: BirthInfoCopy

  /** Search callback for the place step — typically a geocode API wrapper.
   *  Shape matches CityPicker's existing `search` prop. */
  searchCity: (query: string) => Promise<CityRecord[]>

  /** Optional override of the top-cities offline fallback list. */
  topCities?: CityRecord[]

  /** What CityPicker subtitle locale labels are shown in. Defaults to
   *  device locale. */
  locale?: string

  /** Hide step(s) entirely. Use case: fill-other screen needs gender but
   *  no review; pass ['review']. Default = []. */
  skipSteps?: BirthInfoStep[]
}
```

```ts
import type { LunarDate } from '@zhop/astro-core'

interface BirthInfoValue {
  /** ISO 8601 date YYYY-MM-DD. Always solar (server-canonical). */
  solarDate: string
  /** Lunar date if user entered lunar, else undefined. Echo-back of what
   *  the user typed so the review screen renders "甲辰年正月初一" when
   *  they entered lunar, not the converted solar form. Uses the existing
   *  `LunarDate` type from `@zhop/astro-core` (includes year, month, day,
   *  isLeap, monthName, dayName, yearGanZhi, zodiac — all useful for the
   *  review row). */
  lunarDate?: LunarDate
  /** 0–11 shichen index, or null if user skipped. */
  timeIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | null
  /** '男' | '女'. No 'unknown' affordance — 八字 mandates one. */
  gender: '男' | '女'
  /** City name as shown on review (localized). */
  city: string
  /** Decimal lat/lng + IANA timezone. Required for 真太阳时 correction. */
  lat: number
  lng: number
  timezone: string
}
```

## 4. The 5 steps + review

### 4.1 BirthDateStep

- **Hero**: ProgressIndicator (1/5).
- **Title**: copy.dateTitle (e.g. "你的出生日期").
- **Subtitle**: copy.dateSubtitle, optional.
- **Toggle row** (new, neither app has): two pills "公历 / Solar" · "农历 / Lunar".
  Default: solar. On lunar select, the picker switches to lunar columns
  and the commit value converts to solar via [`@zhop/astro-core/lunar`](../packages/astro-core/src/lunar.ts)
  (verify the helper exists; if not, add it as part of J.1.1).
- **Picker**: native `DateTimePicker` (inline / spinner on iOS, calendar
  on Android). Default 1990-01-01. Min 1900-01-01. Max today.
- **Footer**: Next CTA right (disabled until valid). Back uses native
  navigation gesture.

### 4.2 BirthTimeStep

- **Hero**: ProgressIndicator (2/5).
- **Title**: copy.timeTitle (e.g. "你出生的时辰").
- **Subtitle**: copy.timeSubtitle (optional explanation of why precision matters).
- **Body**: existing `<ShichenPicker>` from core-ui (Y4 extract).
  Accent color = the form's `accent` prop.
- **Footer**: Skip left ("我不知道"), Next right.
- Persists `timeIndex` on Next; persists `null` on Skip.

### 4.3 BirthGenderStep

- **Hero**: ProgressIndicator (3/5).
- **Title**: copy.genderTitle.
- **Body**: 2-column equal-width buttons (男 / 女). Each shows the
  CJK character (fontSize 32, fontWeight 500) above an uppercase label
  (fontSize 11, letterSpacing 1.4).
- **Behavior**: tap-to-advance (hexastral pattern). No separate Next.
  Auto-routes to place step. Haptic selection on tap.

### 4.4 BirthPlaceStep

- **Hero**: ProgressIndicator (4/5).
- **Title**: copy.placeTitle.
- **Body**: existing `<CityPicker>` from core-ui (Y3 extract). Accent =
  form's accent prop.
- **Footer**: Next right (disabled until city picked). No skip.
- Persists city + lat + lng + timezone.

### 4.5 BirthReviewStep

- **Hero**: ProgressIndicator (5/5).
- **Title**: copy.reviewTitle.
- **Body**: review card with `ReviewRow` per field:
  - 公历日期 / 农历日期 (both shown if lunar was entered)
  - 时辰 (or "未知" if skipped)
  - 性别
  - 出生地 (city name + small subtitle showing IANA timezone)
- Each row tappable → returns to that step (re-renders with current
  values pre-filled). Pattern from hexastral's `birth-review.tsx`.
- **Footer**: filled Submit button (accent bg, white text, fontSize 16,
  fontWeight 600, paddingVertical spacing.lg, borderRadius 12). Shows
  loading state during submission. Disabled if any required field missing.
- Calls `onSubmit(final)`; on success the caller routes away (form does
  not navigate post-submit).

## 5. `BirthInfoCopy` shape

```ts
interface BirthInfoCopy {
  dateTitle: string
  dateSubtitle?: string
  dateSolarLabel: string             // "公历" / "Solar"
  dateLunarLabel: string             // "农历" / "Lunar"
  timeTitle: string
  timeSubtitle?: string
  timeSkipLabel: string              // "我不知道"
  genderTitle: string
  genderMale: string                 // "男"
  genderFemale: string               // "女"
  placeTitle: string
  reviewTitle: string
  reviewSubtitle?: string
  reviewLabels: {
    solarDate: string
    lunarDate: string
    timeIndex: string
    gender: string
    city: string
  }
  reviewSubmit: string               // "确认提交"
  reviewSubmitLoading: string        // "提交中…"
  reviewEditCue: string              // "edit ›" or "编辑"
  next: string                       // "下一步"
}
```

Default `en` + `zh` dictionaries ship with the component. Apps override
via prop for per-locale or per-brand voice (yuan can be more literary,
hexastral can be terser).

## 6. Adoption checklist (Phase J.2.1)

After `<BirthInfoForm>` lands in core-ui:

- [ ] **hexastral-app** `(birth)/*` — replace the 6 step files with a
      single host screen that mounts `<BirthInfoForm>`. Pass
      `accent={undefined}` (or `colors.text`) to keep its mono aesthetic.
      Result: ~600 LOC deleted from hexastral-app.
- [ ] **yuan-app** `(onboarding)/birth-date.tsx`, `birth-time.tsx`,
      `birth-place.tsx`, `name.tsx` (the self flow) — replace with
      `<BirthInfoForm accent={yuanLight.accent} crown={<YuanSeal/>}/>`.
      The name + mode steps stay yuan-specific (they're outside birth-info).
      Result: ~400 LOC deleted from yuan-app.
- [ ] **yuan-app** `fill-other.tsx` — keep the dense single-screen layout
      BUT swap inline date/gender controls for the step components imported
      individually. Re-uses logic without buying into the multi-screen UX.
- [ ] **feng-app** — does NOT consume `<BirthInfoForm>` directly today
      (feng collects site info, not personal birth). Skipped unless a
      future "personal_fit" chapter UX collects user birth on-screen.

## 7. Lunar/solar toggle — implementation notes

**Conversion utility: `@zhop/astro-core/lunar`** (verified usable 2026-05-19).

Existing exports — use directly:

```ts
import { solarToLunar, lunarToSolar, type LunarDate } from '@zhop/astro-core'
// or sub-path: from '@zhop/astro-core/lunar'

const lunar: LunarDate = solarToLunar(2024, 2, 10)
//   → { year: 2024, month: 1, day: 1, isLeap: false,
//       monthName: '正月', dayName: '初一',
//       yearGanZhi: '甲辰', zodiac: '龙' }

const solar: Date = lunarToSolar(2024, 1, 1, false)
//   → Date object for 2024-02-10
```

Implementation traits:
- Compressed-table approach covering **1900-2100** (throws `RangeError`
  outside this range — fine for birth dates; the form's min/max are
  already 1900-01-01 / today).
- Returns auxiliary fields (`monthName` 正月 · `dayName` 初一 ·
  `yearGanZhi` 甲辰 · `zodiac` 龙) — the review row can render these
  directly instead of building strings from numbers.
- Handles leap months (`isLeap` flag + `getLeapMonth(year)` helper).
- Zero external deps; ~5 KB compiled. Beats yuan-app's existing
  `lib/domain/lunarCalendar.ts` (which wraps the ~50 KB `lunar-javascript`).
- Already tested: `packages/astro-core/src/__tests__/index.test.ts:126-150`
  passes 3 lunar fixtures (Chinese New Year 2024, CNY 2025, mid-year date).
  Full suite: 26/26 pass at the time of this audit.

Acceptance criteria for v1:
- Toggle is visible on the date step
- Default = solar
- Switching to lunar shows year / month / day / leap-month columns
- Commit always stores `solarDate` (canonical) AND `lunarDate` (if user
  entered lunar) — so the review screen can echo back the user's input
- Conversion is **client-side** via `@zhop/astro-core` (offline-safe,
  no roundtrip)
- Out-of-range dates: if the user tries to enter a lunar date that
  converts outside the 1900-2100 window, fall back gracefully (show
  inline error + auto-switch to solar). Realistically won't happen with
  the existing date-picker min/max.

Action for J.1.1:
- Add `@zhop/astro-core` to `packages/core-ui/package.json` dependencies
  (currently not present — verify before starting).
- Replace any uses of yuan-app's `lib/domain/lunarCalendar.ts` with
  `@zhop/astro-core` imports during the J.2.1 adoption pass; delete the
  yuan-app shim once nothing imports it.

## 8. Decorative crown slot

Rendered above the welcome / first step's title. Pass any ReactNode.

Recommended per app:
- **yuan-app**: `<YuanSeal mode='breathing' size={120} />`
- **hexastral-app**: nothing (mono aesthetic) OR a tiny 八字盘 svg glyph
- **feng-app**: 罗盘 ring icon (24山 glyph) if adopted later
- **numerology-app**: a number-glyph if adopted later

Spec leaves this open — each app owns its visual hallmark.

## 9. Validation gates for J.1.1

- `bun typecheck` clean across `packages/core-ui` + adopting apps
- `bun lint` zero net new failures in core-ui
- Manual: hexastral-app and yuan-app both walk through their existing
  onboarding successfully with the new form mounted
- Manual: lunar/solar toggle commits the right values (test fixture:
  `2024-02-10` solar = `2024-01-01` lunar)
- Manual: review-step edit shortcuts route back correctly with values
  pre-filled
- Accessibility: each step's primary controls have correct
  `accessibilityRole` + `accessibilityState` (the existing component
  patterns already do this — preserve)

## 10. Out of scope for v1

- Birth city auto-detect via current location (feng-app does this for
  sites; not needed for birth-info)
- Western zodiac / star sign selectors (different flow)
- Name input (each app collects it differently — name is not part of
  this form)
- Edit-after-submit flow (each app handles its own re-entry)
- Server-side lunar conversion (client-side handles v1)

## 11. Open questions to resolve at implementation

1. ~~Does `@zhop/astro-core` already export a solar↔lunar conversion?~~
   ✅ **Resolved 2026-05-19**: yes, see §7. `solarToLunar` / `lunarToSolar`
   already in production with passing tests. Use directly.
2. Do we want the date step to support BC dates / dates older than 1900?
   `@zhop/astro-core/lunar` throws RangeError outside 1900-2100; this is
   fine for realistic birth dates (oldest living humans ~115 years).
   Min date stays 1900-01-01.
3. Should the review step's edit shortcut animate (re-stack the screen)
   or replace? Behavior decision for nav feel.
4. ~~Is the existing `lib/domain/lunarCalendar.ts` in hexastral-app the
   canonical lunar utility, or is it superseded by astro-core?~~
   ✅ **Resolved 2026-05-19**: astro-core supersedes. yuan-app's
   `lib/domain/lunarCalendar.ts` (a `lunar-javascript` wrapper) is
   deprecated; J.2.1 adoption pass removes it.
5. Localizing the gender labels — do we ever need anything beyond 男/女?
   (No, per the audit; just confirming.)
