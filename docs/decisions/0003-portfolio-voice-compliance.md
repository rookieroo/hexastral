# ADR-0003: Portfolio Voice Compliance SSOT

## Status

Accepted — 2026-07-07

## Context

Apple App Review 4.3(b) samples **actual report body content**, not only ASO. HexAstral spans four satellite apps plus web funnels; LLM prompts lived in `hexastral-api`, `svc-astro`, and `svc-feng` with drift risk.

## Decision

1. **North Star**: entertainment, cultural exploration, personal reflection — not prediction, not professional advice, no guaranteed outcomes (Terms §3).
2. **Code SSOT**: `@zhop/portfolio-voice` exports:
   - `buildComplianceInstructionBlock(locale)` — inject into every LLM system prompt
   - `buildPortfolioVoiceInstructionBlock(locale)` — Yaul / dream Daoist voice
   - `PORTFOLIO_VOICE_FORBIDDEN_SUBSTRINGS` (hard) + soft list
   - `auditHardForbiddenHits()` + `buildForbiddenRewriteSuffix()` for post-gen retry
3. **Golden regression**: `apps/hexastral-api/src/lib/portfolio-voice-golden.json` + tests
4. **Label policy**: keep JSON `kind` keys stable (`monthly_outlook`); change display labels only (`本月相处参考` / `Monthly rhythm`).

## Forbidden tiers

| Tier | Examples | Production action |
|------|----------|-------------------|
| Hard | 注定、铁口直断、一定发财、guaranteed | Retry once, then stub |
| Feng synthesis (hard) | 金蟾、文昌塔、铜葫芦、提升运势、增强财气、贵人运 | Retry once (svc-feng), then fallback stub |
| Soft | 运势、预测、吉凶、择日 | Log only (phase 2 tighten) |

## Review demo paths

| App | Path |
|-----|------|
| Yuel | New bond → six chapters → chat |
| Yuun | Timeline deep read → chart chat |
| Yaul | Cast → result → paywall |
| Kanyu | Site analyze → flying stars chapter → chat |
| Web | `/yuan` teaser, `/hehun/[token]`, onboarding pairing |

## References

- [screenshot-direction.md](../publish/screenshot-direction.md) §4.3(b)
- [terms.en.json](../../apps/hexastral-web/lib/legal/data/terms.en.json) §3
- Gold-standard prompt: `services/svc-astro/src/routes/timeline.ts`
