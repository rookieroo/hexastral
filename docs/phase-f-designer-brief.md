# Phase F — Designer Brief

> **Status**: brief **ready to send** (written Week 3). **Deliverables not received** as of 2026-05-16.  
> **Delivery deadline**: was end of Week 5 — now blocks Phase F Week 8 App Store assets.  
> **Budget envelope**: TBD — 8 apps × icon/splash + 1 illustration system.  
> **Your action**: engage designer per [local-manual-checklist.md](local-manual-checklist.md) §2.5 / §6.

The HexAstral metaphysics matrix needs production-ready visual assets across 3 flagships + 5 satellites. Brand directions are locked (per [ADR-0004](decisions/0004-satellite-funnel-pattern.md)); this brief specifies deliverables and constraints.

---

## 1. Brand identity at a glance

The HexAstral matrix follows **金石玄学** (gold-stone metaphysics) aesthetic — Chinese seal-script meets editorial minimalism. Each app has a single ownable color family that does not clash with siblings.

| App | Tier | Glyph | Brand color | Surface | Aesthetic note |
|---|---|---|---|---|---|
| **HexAstral** | Flagship | (master mark) | ink black + ivory + gold #C4A882 | rice paper or rubbing | Anchor identity — most restrained |
| **Yuán** | Flagship | 緣 | cinnabar #9B2226 + ink gold | rice paper ivory | Two seals connecting — relationship warmth |
| **Fēng** | Flagship | 風 | 墨青 #0F1E26 + copper #B08D5B | rice or ink-teal | Editorial / architectural |
| **Compass / 羅** | Satellite (Fēng feeder) | 羅 | shares Fēng palette | dark ink-teal | Instrument feel — precision |
| **Coin Cast** | Satellite | 卦 / three coins | amber #B8741F + wood-grain | parchment #F2E5C8 | Ritual — bronze coin tossed on wood |
| **Face Oracle** | Satellite | 面 or eye glyph | jade #3F7B5C + ink-wash | rice paper warm | Classical jade reading |
| **Dream Oracle** | Satellite | 夢 | indigo #3C3E76 + silver #C8C9D6 | dark indigo night | Nocturnal — celestial without astrology overlap |
| **Numerology** | Satellite | numeric "1" | violet #5B3F8A + blue #4A6FA5 | ivory | Western mystical — minimal, accessible |

The full token registry lives at [`packages/hexastral-tokens/src/satellites.ts`](../packages/hexastral-tokens/src/satellites.ts) — designer can pull exact hex values from there.

---

## 2. Per-app deliverables

For each of the 8 apps, deliver **icon + splash + App Store screenshots**.

### 2.1 Icon

- **Format**: PNG, transparent background NOT supported by Apple — provide full-bleed solid background per brand.
- **Sizes** (Apple App Icon spec): provide a single 1024×1024 master; we'll generate 60–1024 variants via Expo.
- **Composition rule**: brand color fills the corner-radius square; CJK glyph (or Western mark) sits center-aligned. **Read clearly at 60×60**.
- **Style**: Ink-Brutalism — square edges (no inner rounding, no inner shadows, no skeuomorphism). The Apple OS applies the squircle mask automatically.
- **CJK glyph rendering**: use a seal-script (篆書) or proper Chinese typeface — never system fallback. For Western glyphs (Numerology "1"), use a numeral-style display face.

### 2.2 Splash

- **Format**: PNG, 1284×2778 (iPhone 14 Pro Max baseline; Expo scales).
- **Composition**: solid brand-color background. CJK glyph centered, ~30 % of the canvas height. No other text, no logo wordmark, no taglines (the loading state shows the app name automatically).
- **Animation hook**: deliver a static splash; in-app boot animation (breathing seal, scale-in, etc.) is owned by `@zhop/scenario-*` packages.

### 2.3 App Store screenshots

- **Format**: 1290×2796 PNG (iPhone 14 Pro Max). Provide 3 per app, per locale. Locales:
  - HexAstral / Yuán / Fēng: en, zh-Hant, zh, ja
  - Compass: en, zh-Hant, zh, ja
  - Coin Cast / Dream Oracle / Face Oracle: en, zh-Hant, zh, ja
  - Numerology: en (primary), zh (secondary if budget allows)
- **Content** (recommended hero screens per app):
  - HexAstral — daily home with FateHomeHero + golden line
  - Yuán — chapter pager mid-reading + cinnabar share button visible
  - Fēng — annotated satellite + 6-chapter index
  - Compass — full-screen dial with 24山 ring
  - Coin Cast — coin-toss animation moment + hexagram result
  - Face Oracle — face capture screen with frame guide
  - Dream Oracle — interpretation result with night sky
  - Numerology — life-path number hero + personal-year strip
- **Copy overlay**: minimal — one short headline per screenshot, brand-color background. Designer owns layout; copy provided separately.

---

## 3. Shared illustration system

Beyond per-app icons, Phase F needs a **brand-coherent illustration library** consumed by `@zhop/core-ui` Empty/Error states. These illustrations cross apps so they must read across all 8 brand palettes.

### 3.1 EmptyState illustrations

Five illustrations, monochrome-ready (designer delivers as SVG; consumer apps color them via fill/stroke):

| Slug | Used for | Visual concept |
|---|---|---|
| `empty-data` | "Nothing here yet" — generic | Hand-drawn empty bowl or open scroll |
| `empty-bonds` | yuán-app "No bonds" | Two seals separated by a gap |
| `empty-sites` | feng-app "No sites" | A 山 (mountain) glyph minus a building |
| `empty-readings` | hexastral-app "No readings" | A blank natal-chart silhouette |
| `empty-permission` | "We need camera/location access" | Locked seal |

Each at 240×240 viewBox, single-color stroke (1.5px), no fill.

### 3.2 ErrorState illustrations

Three illustrations:

| Slug | Used for | Visual concept |
|---|---|---|
| `error-mountain` | Generic load failure | Tilted 山 with broken seal |
| `error-network` | Connectivity error | Cracked stone |
| `error-permission-denied` | Auth/permission denied | Crossed-out seal |

Each at 240×240 viewBox, single-color stroke (1.5px), no fill.

### 3.3 Delivery format

- One folder per illustration as SVG.
- Each SVG uses `currentColor` for the stroke so consumers can tint via CSS / RN `color` prop.
- Include a PDF / PNG preview sheet showing all illustrations at icon size.

---

## 4. Type assignments

**Mobile**: system fonts are acceptable for V1 (SF Pro on iOS). Branded type is desirable for V2 but not blocking. If we add a brand font in V2:
- CJK display face for flagship hero typography (Yuán's 64px hero text, Fēng's 風 mark).
- Latin sans for body — should be legible at 11–28px range, support multiple weights (regular / semibold / bold).

**Web**: web parity is part of Phase F.5. Same display + body pairing should work across `hexastral-web` landing pages.

Designer suggestion (optional): provide a 2-page font-pairing recommendation; we'll wire fonts via expo-font in Phase G if approved.

---

## 5. Timeline

| Week | Designer deliverable |
|---|---|
| Week 3 | Receive brief; share moodboard / direction-check for all 8 brand palettes |
| Week 4 | Icons + splashes for **flagships** (HexAstral, Yuán, Fēng) — these block App Store submission timeline |
| Week 5 | Icons + splashes for **5 satellites**; shared illustration library |
| Week 6 | App Store screenshots (all apps × all locales) |
| Week 7 | Revisions + handoff |
| Week 8 | Final delivery; assets dropped into `apps/<app>/assets/` |

---

## 6. Constraints + non-negotiables

- **No emojis**, ever. The brand is calligraphic — emoji would clash.
- **No glossy gradients, no neon glows, no Web-3 aesthetics**. Ink Brutalism is the rule.
- **No skeuomorphic textures** (faux paper, faux wood, faux marble) — _except_ Coin Cast's wood-grain background, which is integral to the ritual concept. Even there, keep the wood-grain subtle (≤ 8% opacity).
- **Each brand color is locked**. If a designer proposes substituting cinnabar with crimson, etc., that requires an ADR amendment.
- **CJK + Latin glyph parity**: glyphs should look stylistically related across the matrix (seal-script for CJK, classical numeral for Numerology's "1").
- **Apple HIG compliance**: app icons must meet Apple's icon guidelines (no system imagery, no Apple branding, no rounded-corner pre-rendering).
- **Accessibility**: each brand color must hit WCAG AA contrast against its primary surface (light + dark mode where applicable).

---

## 7. Reference materials

- [`docs/phase-f-plan.md`](phase-f-plan.md) — strategic context.
- [`docs/decisions/0004-satellite-funnel-pattern.md`](decisions/0004-satellite-funnel-pattern.md) — locked matrix shape + brand colors.
- [`packages/hexastral-tokens/src/satellites.ts`](../packages/hexastral-tokens/src/satellites.ts) — exact hex values for satellite palettes.
- [`packages/hexastral-tokens/src/palette.ts`](../packages/hexastral-tokens/src/palette.ts) — flagship + foundation palette.
- Existing icon placeholders in `apps/<app>/assets/README.md` files per-app.

---

## 8. Questions for the designer to confirm before starting

1. Do you have a preferred CJK seal-script reference (e.g. specific 篆書 font)? If not, we'll suggest one.
2. Are you comfortable delivering illustrations as `currentColor` SVGs? Alternative: deliver in 8 brand-color variants (1 per app).
3. What's your turnaround for the moodboard direction-check (Week 3)?
4. App Store screenshot copy — do you want us to provide finals, or do you want to suggest as part of design?
5. Budget envelope — is the full 8-app × 4-locale scope on the table, or should we descope (e.g., en + zh only for screenshots, fewer locales for satellites)?
