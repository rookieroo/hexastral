# ADR-0002: HexAstral brand matrix

- Status: Accepted
- Date: 2026-05-14

## Context

The platform ships multiple consumer apps (flagships and satellites). Without an
explicit brand architecture, each new app risks reinventing identity, fracturing
marketing spend, and confusing users about which apps share infrastructure.

## Decision

Adopt a three-tier brand architecture:

```
HexAstral (master / LLC publisher)
├── Flagships — single CJK glyph + Latin transliteration
│   ├── HexAstral        — 命Kindred卦道 four-tab life navigator (current)
│   ├── Kindred  / Kindred       — relationship & compatibility
│   └── Fēng  / 風       — feng-shui (Q3+, deferred)
└── Satellites — independent Western names, shared backend
    ├── Coin Cast        — I-Ching coin divination
    ├── Face Oracle      — face reading
    └── Dream Oracle     — dream interpretation
```

### Naming rules

| Tier | Pattern | Example |
|------|---------|---------|
| Flagship | Single CJK glyph + Latin transliteration | `Kindred / Kindred` |
| Satellite | English category noun, evocative not literal | `Coin Cast` |
| Master | "HexAstral" — appears only as App Store **Seller** name and in optional flagship subtitle (e.g., "by HexAstral") | — |

### Visual coherence

All apps in all tiers consume `@zhop/hexastral-tokens`:

- Base palette: zinc + rubbing + ricePaper + cinnabar + ink
- Material vocabulary: 宣纸与焦墨 / 汉魏碑拓 / 方寸篆刻
- Iconography family: Lucide monochrome, strokeWidth 1, plus one product-specific
  CJK glyph used as hero mark

What differs between products: **proportions and usage rules**, not tokens.
Kindred uses ricePaper heavier and cinnabar at emotional peaks; HexAstral uses
rubbing heavier and cinnabar minimally; satellites pick a single accent slice of
the palette.

### Bundle / namespace rules

| Asset | Pattern | Example |
|-------|---------|---------|
| Bundle id | `com.hexastral.<slug>` | `com.hexastral.kindred` |
| App workspace | `apps/<slug>-app/` | `apps/kindred-app/` |
| Shared logic package | `packages/scenario-<slug>/` | `packages/scenario-kindred/` |
| Domain | `<slug>.hexastral.com` or sub-path on `hexastral.com` | `hexastral.com/yuan` |
| RevenueCat | `hexastral_<slug>_*` SKU prefix | `hexastral_kindred_pro_monthly` |

### App Store seller field

All apps list **"HexAstral"** (or the legal LLC name) as Seller / Publisher in
App Store Connect. This creates a discoverable family when a user taps the
seller name on any one app's listing.

## Consequences

Positive:

- Adding a new product is a checklist, not a design exercise.
- Visual coherence keeps engineering / design cost low across products.
- Seller-family discovery is a free cross-sell channel.

Negative:

- Discipline required: future engineers must extend `hexastral-tokens` instead of
  forking per-product theme files.
- Satellite Western names may be hard to clear in App Store; allow fallback to
  `<Name> by HexAstral` if pure name is taken.

## References

- ADR-0001: Kindred naming
- `packages/hexastral-tokens/src/palette.ts`
