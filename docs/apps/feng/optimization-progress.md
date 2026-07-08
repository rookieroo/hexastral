# Feng (風) — Optimization progress log

Living record of feng report quality, input pipeline, compliance, and Mapillary
diligence. **Code on `main` is source of truth**; this doc is the navigation
index for agents and humans.

Last updated: **2026-07-08**.

---

## Shipped on `main`

### 1. Qualitative report digest (no percentile score)

| Area | Path / notes |
|------|----------------|
| Aggregation | `packages/scenario-feng/src/lib/report-digest.ts` |
| UI | `apps/feng-app/components/FengDigestCard.tsx` |
| Design | [report-digest-design.md](./report-digest-design.md) |

Chips: 格局 (+有救/待补), 宅命, 外局, optional 飞星置信. Headline from priority
rules; `digest_not_score` disclaimer.

### 2. Compliance remediation (WP0–WP2)

| WP | Status | Summary |
|----|--------|---------|
| WP0 Chat audit | ✅ | `auditFengSynthesisHits` on `readingType === 'feng'` |
| WP1 Chat persona + context | ✅ | `feng` persona in svc-astro; compute appendix in chat |
| WP1b Digest disclaimers | ✅ | `report_chapter_micro_disclaimer` + `report_legal_disclaimer` |
| WP2 Share + golden + tests | ✅ | Share footer; portfolio golden samples; digest tests |

Plan: [compliance-remediation-plan.md](./compliance-remediation-plan.md).

**Deploy**: `hexastral-api`, `svc-astro`, `feng-app`.

### 3. P0 input pipeline (practitioner-duty gaps)

| Fix | Status | Summary |
|-----|--------|---------|
| `unknown` 建运 | ✅ | Skip `computeFlyingStars`; drop `flying_stars` chapter |
| `centerNorm` 立极 | ✅ | User pin → interior Gemini prompt v2 (AUTHORITATIVE 中宫) |
| 楼体中心 pin | ✅ | Draggable dot on facing satellite; `geocodeLat/Lng` anchor + offset |

Key paths:

- `apps/hexastral-api/src/lib/feng-analyze.ts` — `includeFlyingStars` gate
- `apps/hexastral-api/src/lib/feng-interior-compute.ts` — `parseSiteFloorplan.centerNorm`
- `services/svc-feng/src/prompts/interior.ts` — prompt v2
- `packages/scenario-feng/src/lib/map-pixel-offset.ts` — geo offset helper
- `apps/feng-app/app/(new-site)/facing.tsx` — building pin UX

**Deploy**: `hexastral-api`, `svc-feng` (interior cache invalidated by prompt v2), `feng-app`.

---

## Practitioner-duty audit (2026-07-08)

Full analysis in agent session; summary of **remaining gaps** after P0:

| Priority | Gap | Status |
|----------|-----|--------|
| P0 | `unknown` 建运 vs 玄空 | ✅ fixed |
| P0 | `centerNorm` ignored | ✅ fixed |
| P0 | 地址点 ≠ 楼体中心 | ✅ fixed (pin) |
| P1 | 卫星 vs 罗盘偏差警告、兼向提示 | ⏳ |
| P1 | Mapillary 街景 + 归因 UI | ⏳ see below |
| P1 | Vision JSON 后验审计 | ⏳ |
| P2 | `floor` 字段未参与计算 | ⏳ RESERVED |
| P2 | 宅卦 vs 命卦双轨 room verdict | ⏳ |
| P2 | Review 数据质量门禁 | ⏳ |

**Strengths** (unchanged): 沈氏玄空 + 八宅 + formLi in astro-core; synthesis
compliance; digest + chat audit.

---

## Mapillary (街景形煞) — diligence summary

**Not legal advice.** Engineering read for go/no-go before `MAPILLARY_TOKEN`.

### What it does

- `services/svc-feng` → Mapillary Graph API (bbox search) → up to 4× `thumb_1024`
- One Gemini Vision call → structured 形煞 JSON (no user-facing photos)
- Merged into `vision.形煞` → formLi + synthesis

**Default**: OFF without token (fail-open degraded).

### Legal risk (V1 text-only)

| Risk | Level | Mitigation |
|------|-------|------------|
| CC BY-SA attribution | Medium | Footer `streetAttribution` when findings used; **WP3**: inline + share |
| SA “derivative work” on text labels | Low–Medium | Do not display/redistribute thumbnails; confirm with Mapillary support |
| ToS §11 (materially supplement) | Low | Analysis-only, not a Mapillary clone |
| Privacy (Gemini processes street imgs) | Low–Medium | Disclose in App Privacy |

**Recommendation**: Register free [Mapillary Developer](https://www.mapillary.com/dashboard/developers) app; complete WP3 attribution; email `support@mapillary.com` with use-case before prod token. **Defer token** if primary market is CN (weak coverage).

### Cost (marginal per paid report @ $9.99)

| Component | Direct $ | Notes |
|-----------|----------|-------|
| Mapillary API | ~$0 | Rate limits only at V1 volume |
| Gemini street pass | ~$0.01–0.02 | +15–35% vs vision-only; 4×1024 thumbs, 1 call |
| **Gap** | — | `/street/sha` has **no cache** (unlike exterior/interior vision) |

**Pricing**: Do not surcharge for street view; keep tiering by 户型图 count
([feng-pricing.ts](../../apps/hexastral-api/src/lib/feng-pricing.ts)). Street is
a differentiation lever, not a COGS threat at current scale.

### Cost controls (before enabling token)

1. Content-addressed cache on `/street/sha` (lat/lng grid + prompt version)
2. Coverage preflight (`limit=1` bbox probe; skip Gemini when no images)
3. Optional: `gemini-3.1-flash` for street pass; reduce `maxImages` 4→2
4. Urban-only gate via existing Mapbox prefetch signals

---

## Next work packages

| ID | Package | Depends on |
|----|---------|------------|
| WP3 | Mapillary attribution UI (footer always when API used; chapter inline; share PNG) | — |
| WP3b | `/street/sha` cache + coverage preflight | — |
| P1 | Facing: compass vs satellite warn; 兼向/替卦 hint on review | — |
| P1 | Vision JSON post-audit (`auditVisionHits`) | — |
| Human | Staging fresh-report spot-check per [deploy-acceptance.md](./deploy-acceptance.md) §5 | deploy |
| Human | 风水师 sample-output sign-off §8 | sample harness |

---

## Verification commands

```bash
bun typecheck
cd packages/scenario-feng && bun test src/lib/report-digest.test.ts src/lib/map-pixel-offset.test.ts
cd apps/hexastral-api && bun test src/lib/feng-chat-*.test.ts src/lib/portfolio-voice.golden.test.ts
cd packages/astro-core && bun test  # feng suites
```

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [compliance-remediation-plan.md](./compliance-remediation-plan.md) | WP0–WP2 detail |
| [report-digest-design.md](./report-digest-design.md) | Digest chips / headlines |
| [deploy-acceptance.md](./deploy-acceptance.md) | §6 Mapillary legal gate |
| [pro-grade-plan.md](./pro-grade-plan.md) | D1–D4 depth |
| [acceptance-standard.md](./acceptance-standard.md) | Deterministic rubric |
