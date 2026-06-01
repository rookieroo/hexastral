# Feng Visual Assets — design spec for the 12 形煞 sticker set

> **Status**: design-only doc; no code implementation in this repo until
> assets land. Placeholder slot in `packages/scenario-feng/src/components/`.
> **Created**: 2026-05-19 as part of Phase H · F3 Bucket A.
> **Sister doc**: [phase-h-plan.md §3](phase-h-plan.md) — pipeline + chapter wiring.

## Purpose

The feng-shui report's `remediation` chapter currently renders as text walls.
We want to surface the specific 形煞 the Gemini Vision pass identified — one
small inline glyph per type — so users immediately see _what_ they're being
warned about without reading 250 characters of prose first.

## Hand-off package per icon

Each icon must ship as **a single TSX component** with this contract:

```tsx
import { type SvgProps } from 'react-native-svg'

export function LuChongIcon(props: SvgProps) { ... }
```

- One `<Svg viewBox="0 0 64 64">` root
- Fillable via `currentColor` (component reads `props.color ?? 'currentColor'`)
- No external assets, fonts, or filters
- Stroke-only or stroke + single fill — no gradients, no shadows
- Visual weight comparable across the set (don't have one icon read 2× as
  heavy as another at the same size)

## Style brief

- **Inspiration**: ink-wash 水墨 monoline with a single copper accent stroke
- **Palette** (rendered side):
  - Primary stroke: ink teal `#0F1E26` (or `currentColor`)
  - Accent: copper gold `#B08D5B` — at most ONE accent stroke per icon
- **Line weight**: ~1.5px at 64×64 viewport (`stroke-width: 1.5`)
- **Stroke caps**: `round`
- **Negative space**: prefer open compositions; icons sit at 24×24 in the
  remediation card body so they need to read at small size

## The 12 icons

Type strings match the `ShaType` enum in
[packages/scenario-feng/src/types.ts](../packages/scenario-feng/src/types.ts).

| # | Component        | Type 字 | Meaning                                      | Visual hook                                                    |
|---|------------------|--------|----------------------------------------------|----------------------------------------------------------------|
| 1 | `LuChongIcon`    | 路冲   | Straight road aimed at the building          | Long arrow striking a square; copper arrowhead                 |
| 2 | `FanGongIcon`    | 反弓   | Reverse-bow curving road                     | Bow curve facing away from building; copper string             |
| 3 | `JianJiaoIcon`   | 尖角   | Sharp corner of neighbor building pointed in | Triangle wedge pointing at small square; copper wedge tip      |
| 4 | `TianZhanIcon`   | 天斩   | Sky-cut gap between two buildings            | Two tall verticals with thin gap; copper gap fill              |
| 5 | `GuFengIcon`     | 孤峰   | Isolated tall structure dominating skyline   | Single tall column surrounded by short ones; copper top        |
| 6 | `DianTaIcon`     | 电塔   | Power pylon                                  | Lattice tower silhouette; copper crossbar                      |
| 7 | `QiaoShaIcon`    | 桥煞   | Overpass cutting across the view             | Horizontal bridge bar over building; copper bridge edge        |
| 8 | `JianDaoIcon`    | 剪刀煞 | Y-shaped road junction (scissor effect)      | Two diverging strokes from a single point; copper outer stroke |
| 9 | `FanShuiIcon`    | 反水   | Water flowing away from site                 | Wavy line bending away; copper arrow tail                      |
| 10 | `GeJiaoIcon`    | 割脚   | Water cutting the building's base            | Wave crossing under a square; copper wave crest                |
| 11 | `YuDaiIcon`     | 玉带   | Embracing/girding water — **auspicious**     | Curved band hugging building; copper band (warm tone)          |
| 12 | `MingTangIcon`  | 明堂   | Open hall / clear front — **auspicious**     | Empty plaza in front of building; copper opening               |

Note: the last two (`玉带`, `明堂`) are **positive** signals not 煞. They
appear in the same lookup helper but should read warm/affirming, not
warning. Use copper as the primary stroke instead of ink.

## Lookup helper (code, not design)

Once icons exist, expose them via:

```ts
export function getFormShaIcon(type: string): React.ComponentType<SvgProps>
```

The helper returns the matching component or a fallback ink-dot placeholder
for unrecognized strings. This part is code; we'll ship it in the same PR
as the icon files.

## Where it gets used

- **Chapter renderer**: `remediation` chapter card iterates the
  `FengReport.vision.形煞[]` array and renders each `.type` via
  `getFormShaIcon` next to the chapter body.
- **Share card** (later): the per-chapter share screen for `remediation`
  could optionally render the first 3 sha icons as a "what was found" strip
  above the golden line.

## Out of scope for this asset pack

- Animation (icons stay static)
- Light/dark theme variants (`currentColor` handles both)
- Localized labels — the report text already provides the name
- 化解 (remedy) icons for the suggested mitigations — separate pack if/when needed
