# ADR-0010: Cycle (黄历 / almanac) satellite

- Status: Accepted
- Date: 2026-05-21
- Amends: [ADR-0004](0004-satellite-funnel-pattern.md) §1 (adds Cycle to the Tier-3 satellite list)
- Builds on: [ADR-0009](0009-two-layer-matrix.md) (two-layer matrix — Cycle is a Tier-3 funnel), [ADR-0008](0008-three-layer-architecture.md) (engine reuses `astro-core`)
- Companion: [cycle-satellite-plan.md](../cycle-satellite-plan.md)

## Context

老黄历 / 万年历 is one of the largest CJK app categories (tens of millions of MAU
across the field) but every incumbent is a UX cesspool: banner ads, "大师免费看"
upsells, one-character 宜/忌 labels, zero personalization, no event-search, no
internationalization.

The product wedge: **Cycle is the "Notion of 黄历"** — the same daily-utility core,
but personalized to the user's 八字, AI-explained (a paragraph, not a label),
reverse-searchable for date-picking (择日), modernly designed (zero ads), and
4-locale (zh-Hans / zh-Hant / ja / en — the EN slice targets 海外华人 + spiritual-
curious Westerners). Eight differentiation wedges are detailed in
[cycle-satellite-plan.md](../cycle-satellite-plan.md); the load-bearing ones are
personalization, AI explanation, and reverse-择日.

Cycle also fills a structural hole left by [ADR-0009](0009-two-layer-matrix.md): the
命理 product line needs a **daily-active surface**, and fate-app is deliberately a
one-time capture/funnel anchor (no DAU). Cycle is where that daily-active lives —
fed by the 命盘 fate-app captured.

## Decision

### 1. Cycle is a Tier-3 funnel satellite

Per [ADR-0009](0009-two-layer-matrix.md): anonymous-first, **no IAP / no paywall**,
one locked ASO keyword cluster, ends on a `SatelliteFlagshipUpsellCard` pointing at a
flagship. Tier-3 build contract per [ADR-0006](0006-satellite-tiers.md) (bootstrap,
no RC products).

### 2. Engine — reuse `astro-core`, extend minimally

The almanac core already exists in `@zhop/astro-core` (干支 / 节气 / 时辰 / 神煞 /
`DailyAlmanac`). Per [ADR-0008](0008-three-layer-architecture.md), Cycle does **not**
write a fresh engine — it extends the shared package for the three missing pieces
(二十八宿 + 建除十二神 + 宜忌 corpus) and the API is a thin request→package wrapper.
Coverage: 黄历日历 + 24节气 + 二十八宿 + 建除十二神 + 宜忌 + 十二时辰 + 冲煞.

### 3. Four locales out of the gate

zh-Hans, zh-Hant, ja, en. EN positions as "Eastern auspicious-day calendar."

### 4. Funnel direction

Cycle → Yuán / Fēng via `SatelliteFlagshipUpsellCard`, routed by event intent through
the K.2 discovery endpoint: wedding date-picking → **Yuán**; office-opening / move-in →
**Fēng**. Re-engagement via daily 8am push (今日宜忌 + 对你而言) + 节气 + retro-check.

### 5. AI explanation consumes the shared guard; deterministic core stays non-LLM

The deterministic engine computes facts (干支 / 建除 / 宜忌 / 时辰). The LLM is an
**explanation-only** layer (`/api/cycle/explain`) and consumes the
[K.4 shared LLM guard](../phase-k-plan.md) (Conservative Mode: hard daily limits, global
budget cap → cache/template fallback, one-time lifetime peak pass) — Cycle supplies only
its config, never a forked policy. Cycle is the guard's **first consumer**.

### 6. Brand: 朱泥 (terra / earth-red)

Evokes 黄历 paper; distinct from the other satellites (FaceOracle jade, DreamOracle
indigo, Coin Cast amber, Numerology violet, Compass copper) per ADR-0004 §7.

### 7. One data flow with fate-app, not a rival

```
fate-app (capture 命盘) → portfolio memory → Cycle (daily 对你而言) + Yuán + Fēng
```

fate-app and Cycle are **distinct ASO beachheads** (命盘 / 八字 / 紫微 vs 黄历 / 择日 /
万年历) on one data flow — they must not cannibalize each other (ADR-0004 §2). fate-app
captures the chart once; Cycle renders the daily personalized almanac off it. Cycle is
the **sole** 黄历 home; fate-app deliberately ships no almanac.

## Consequences

### Positive

- The matrix gains a genuine daily-utility surface — the 命理 line's DAU home, lifting
  retention across the portfolio.
- Reuse-first keeps the build small (~2 weeks) — most of the engine already exists.
- Clean funnel into both flagships, intent-routed.

### Negative

- Maintaining a 宜忌 corpus is ongoing work; quality depends on the source corpus
  (mitigated by sourcing a public-domain dataset + cross-checking against mainstream apps).
- 节气 precision varies by location (open question: 北京时间 baseline vs per-GPS).

### Sunset criteria

Per [ADR-0004 §7](0004-satellite-funnel-pattern.md#sunset-criteria-post-launch), Tier-3
thresholds apply. Daily utility is sticky, so a kill is unlikely; trigger review if D30
retention stays below the Tier-3 threshold three months post-launch.

## References

- [cycle-satellite-plan.md](../cycle-satellite-plan.md) — full plan (C.0–C.6)
- [ADR-0009](0009-two-layer-matrix.md) — two-layer matrix (Cycle = Tier 3)
- [ADR-0008](0008-three-layer-architecture.md) — reuse `astro-core`, package only what's shared
- [ADR-0004](0004-satellite-funnel-pattern.md) — funnel pattern + ASO + brand colors (amended here)
- [ADR-0006](0006-satellite-tiers.md) — Tier-3 build contract
