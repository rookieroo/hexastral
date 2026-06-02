# ADR-0001: Synastry product is named Kindred (Kindred)

- Status: Accepted
- Date: 2026-05-14
- Deciders: Product owner

## Context

The HexAstral platform needs a dedicated mobile product for relationship /
compatibility readings (synastry). The flagship `hexastral-app` already has a
`(bonds)/` route group with full functionality, but consolidating synastry into a
standalone Expo app is justified by:

1. Mobile IAP conversion is 5–10× higher than web Stripe in the metaphysics
   category; web-first synastry SaaS is unviable today.
2. App Store keyword "synastry" / "compatibility" / "love compatibility" is a
   distinct traffic pool that the flagship app cannot capture.
3. The relationship-focused onboarding (one user invites another via email) is
   structurally different from the flagship's solo onboarding.

A clear product name is needed to drive store listings, package naming, domain,
icon design, and marketing.

## Decision

The product is named **Kindred** (Kindred).

- App Store listing names (locale-specific, allowed by Apple):
  - en-US: `Kindred: Eastern Astrology`
  - zh-Hans: `Kindred · 东方占星合婚`
  - zh-Hant: `Kindred · 東方占星合婚`
  - ja-JP: `縁・東洋占星相性`
- Bundle identifier: `com.hexastral.kindred`
- Workspace: `apps/kindred-app/`
- Shared logic package: `packages/scenario-kindred/`
- Web routes: `apps/hexastral-web/app/[locale]/yuan/...` (replaces `/resonate/`
  and `/hehun/` and `/invite/` viral paths with 301 redirects from old URLs)
- Email sender: `noreply@hexastral.com` via SES (existing, verified)
- Icon: cinnabar (#9B2226) ground with `Kindred` seal-script glyph in ink gold (#C4A882)
  centered. Mirrors the existing `cinnabar` material family in
  `@zhop/hexastral-tokens`.

## Consequences

Positive:

- Brand-family coherence with `hexastral-app`'s Kindred Bonds tab and existing
  `karma`/`resonate` vocabulary in the codebase.
- ASO-friendly: virtually empty keyword space versus the saturated "Resonate" /
  "Compatibility" terms.
- Visual identity is "free" — the existing cinnabar + ink-gold + seal-script
  aesthetic is already in `hexastral-tokens` and only needs a new application
  rule, not a new system.
- Locale-specific App Store names retain Western readability ("Kindred") while
  delivering native impact in CJK markets.

Negative:

- Western users need a one-time learn of pronunciation ("yoo-ahn"). Mitigated by
  Latin transliteration in store name and onboarding voice-over (optional).
- The diacritic `á` is not always typeable by users on Western keyboards. Brand
  guidelines must accept "Kindred" (no diacritic) as a valid secondary spelling.

## References

- ADR-0002: HexAstral brand matrix
- `packages/hexastral-tokens/src/palette.ts`
