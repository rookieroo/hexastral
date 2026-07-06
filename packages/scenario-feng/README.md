# @zhop/scenario-feng

Shared types, hooks, and components for the **Fēng (風) feng-shui flagship**
and the **Compass (羅) satellite**.

## Status

**v0.1.0** — types scaffold (Phase E Week 1).

Hooks and components will be filled in Phase E Week 4-5 once the API surface
in `apps/hexastral-api/src/routes/feng.ts` and `services/svc-feng/` are
in place. See [docs/apps/feng/fix-plan.md](../../docs/apps/feng/fix-plan.md) for the full plan.

## Layout

```
src/
├── types.ts           Domain types — FengSite, FengReport, FengChapter,
│                      ShaObservation, MapRenderRequest, CompassBearing.
├── index.ts           Top-level barrel + setup docs.
├── components/        (placeholder) UI components — FacingCalibrator,
│                      BaguaCompassOverlay, FlyingStarsGrid, etc.
└── hooks/             (placeholder) useFengSite, useFengReport, useFlyingStars,
                       useCompassBearingLog.
```

## Compute primitives live elsewhere

Pure-function feng-shui math (24山 lookup, 玄空飞星, 八宅) is in
[`@zhop/astro-core/feng/*`](../astro-core/src/feng/) so it can be imported by
both the React Native apps and the Cloudflare Workers backend without a
network hop. The Compass satellite needs this offline for its core feature.

## Brand context

- Fēng is a **flagship** in the HexAstral matrix — premium pricing, full
  ChapterPager report.
- Compass is the first **utility satellite** with a CJK alias (羅) per
  [ADR-0003](../../docs/decisions/0003-compass-satellite.md).
- Both surfaces share the bagua / 24山 visual identity via
  `BaguaCompassOverlay` (to be implemented).

## Related packages

- `@zhop/astro-core/feng` — pure compute
- `@zhop/hexastral-client` — typed RPC client
- `@zhop/hexastral-tokens` — palette / typography (墨青 #2E4756 + 铜金 #B08D5B
  proposed for Fēng; see plan §1)
- `@zhop/scenario-kindred` — sibling flagship package, share the same
  ChapterPager design
