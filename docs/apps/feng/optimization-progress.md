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
| 楼体中心 pin | ✅ | Draggable dot on satellite; `geocodeLat/Lng` anchor + offset |

Key paths:

- `apps/hexastral-api/src/lib/feng-analyze.ts` — `includeFlyingStars` gate
- `apps/hexastral-api/src/lib/feng-interior-compute.ts` — `parseSiteFloorplan.centerNorm`
- `services/svc-feng/src/prompts/interior.ts` — prompt v2
- `packages/scenario-feng/src/lib/map-pixel-offset.ts` — geo offset helper
- `apps/feng-app/components/NewSiteFacingStep.tsx` — building pin + orient UX

**Deploy**: `hexastral-api`, `svc-feng` (interior cache invalidated by prompt v2), `feng-app`.

### 4. Premium tier (residence-type pricing + street gate)

| Area | Path / notes |
|------|----------------|
| Pricing SSOT | `apps/hexastral-api/src/lib/feng-pricing.ts` — apartment $9.99 / flat·villa $39.99 |
| Schema | `feng_sites.residence_type` + migration `0020_outgoing_dracula.sql` |
| Street gate | `feng-analyze.ts` — Mapillary only for flat/villa; floor attenuation for 大平层 |
| Image cap | `maxFloorplanImagesFor()` — apartment=1, flat/villa=6 |
| Client IAP | `feng-pricing-client.ts`, tier-aware paywall + review `/price` |
| Provision flag | `PREMIUM_SKU_PROVISIONED = false` until ASC + RC `hexastral_feng_premium` |

**Deploy**: `hexastral-api` (incl. D1 migration), `feng-app` EAS rebuild.

### 5. WP3 / WP3b / P1 (2026-07-08)

| WP | Status | Summary |
|----|--------|---------|
| WP3b Street cache | ✅ | `/street/sha` coverage preflight + R2 grid cache; maxImages 2 |
| WP3 Attribution | ✅ | Footer + external_landform inline + share PNG; Gemini privacy note in §6 |
| P1 Vision audit | ✅ | `auditVisionHits` + forbidden retry on exterior/interior vision |
| P1 Facing hints | ✅ | Compass vs satellite warn; review 兼向/替卦 hint |
| Onboarding 6→4 | ✅ | address+orient merged; birth → review card only |

---

## Practitioner-duty audit (2026-07-08)

| Priority | Gap | Status |
|----------|-----|--------|
| P0 | `unknown` 建运 vs 玄空 | ✅ fixed |
| P0 | `centerNorm` ignored | ✅ fixed |
| P0 | 地址点 ≠ 楼体中心 | ✅ fixed (pin) |
| P1 | 卫星 vs 罗盘偏差警告、兼向提示 | ✅ |
| P1 | Mapillary 街景 + 归因 UI | ✅ (token still gated) |
| P1 | Vision JSON 后验审计 | ✅ |
| P2 | `floor` 字段未参与计算 | ✅ street 形煞 attenuation for 大平层 |
| P2 | 宅卦 vs 命卦双轨 room verdict | ✅ `room-ba-zhai` + synthesis |
| P2 | Review 数据质量门禁 | ✅ client blockers + review checklist |
| P2 | 缺角入 synthesis | ✅ `interiorQueJiao` in compute + prompt |
| P2 | 户型恢复 + orientConfirmed | ✅ GET floorplan + draft guards |
| P2 | 录入 inputScore + step guards | ✅ `deriveDataQuality` + `useNewSiteGuard` |
| P2 | Vision geometry audit + confidence | ✅ `auditVisionGeometry` + split VLM passes |
| P2 | Prefetch road bearing + 路冲校验 | ✅ Tilequery roads 150m |
| P2 | Golden harness (10 sites) | ✅ `feng-golden-sites.ts` + integration test |
| P2 | Chat room 白名单 | ✅ `feng-chat-context` appendix |

### 6. Input quality & practitioner-duty hardening (2026-07-08)

| Phase | Status | Summary |
|-------|--------|---------|
| 1.1–1.2 | ✅ | `facingConfirmed` / `floorplanOrientConfirmed` client block + API `z.literal(true)` |
| 1.3–1.4 | ✅ | POST `/sites` floorplan key ownership; address re-geocode; pin offset >2km → 400 |
| 2.1–2.2 | ✅ | `feng_sites.input_meta` migration `0021`; `deriveDataQuality` pin/orient/facing notes |
| 2.3–2.4 | ✅ | `synthesis-compute-audit` + `mustSoften` payload; synthesis temp 0.45 |
| 3.1–3.2 | ✅ | Apartment floor warn; `inferResidenceHeuristic` dataQuality note |
| 3.3–3.5 | ✅ | Interior VLM gate; vision low-confidence short TTL; golden/docs |

Key paths:

- `apps/hexastral-api/src/routes/feng/sites.ts` — create schema + `input_meta`
- `apps/hexastral-api/src/lib/feng-floorplan-access.ts` — `assertUserOwnsFloorplanKeys`
- `apps/hexastral-api/src/lib/feng-analyze.ts` — interior gate + `mustSoften`
- `services/svc-feng/src/lib/synthesis-compute-audit.ts` — post-synthesis whitelist
- `apps/feng-app/lib/draft-quality.ts` — facing/orient blocks + apartment floor warn

**Deploy**: `hexastral-api` (incl. D1 migration `0021`), `svc-feng`, `feng-app` EAS.

---

## Mapillary (街景形煞) — diligence summary

**Not legal advice.** Engineering read for go/no-go before `MAPILLARY_TOKEN`.

### What it does

- `services/svc-feng` → Mapillary Graph API (bbox probe + up to 2× `thumb_1024`)
- One Gemini Vision call → structured 形煞 JSON (no user-facing photos)
- Merged into `vision.形煞` → formLi + synthesis
- **Premium only** (flat/villa); apartment skips the pass entirely

**Default**: OFF without token (fail-open degraded).

### Legal risk (V1 text-only)

| Risk | Level | Mitigation |
|------|-------|------------|
| CC BY-SA attribution | Medium | Footer + chapter inline + share PNG when imagery used |
| SA “derivative work” on text labels | Low–Medium | Do not display/redistribute thumbnails |
| Privacy (Gemini processes street imgs) | Low–Medium | Disclose in App Privacy (§6 deploy-acceptance) |

### Cost (marginal per premium report @ $39.99)

| Component | Direct $ | Notes |
|-----------|----------|-------|
| Mapillary API | ~$0 | Rate limits only at V1 volume |
| Gemini street pass | ~$0.01 | Cached on ~50m grid; preflight skips empty bbox |
| **Cache** | ✅ | R2 `feng-street` prefix in ANNOTATED_CACHE |

**Pricing**: Tiered by **user-declared residence type** ([feng-pricing.ts](../../apps/hexastral-api/src/lib/feng-pricing.ts)). Street is bundled into premium, not a separate SKU.

---

## Next work packages

| ID | Package | Depends on |
|----|---------|------------|
| Human | ASC + RC: `hexastral_feng_premium` ($39.99); flip `PREMIUM_SKU_PROVISIONED` | products live |
| Human | D1 migration `0020` on prod | deploy approval |
| Human | `MAPILLARY_TOKEN` + legal sign-off §6 | WP3 UI ✅ |
| Human | Staging spot-check: apartment / flat / villa each 1 report | deploy |
| Human | 风水师 sample-output sign-off §8 | sample harness |
| P2 | 宅卦 vs 命卦双轨 room verdict | ✅ shipped |
| P2 | Review 数据质量门禁 | — |

---

## Verification commands

```bash
bun typecheck
cd apps/hexastral-api && bun test src/lib/feng-pricing.test.ts
cd packages/scenario-feng && bun test src/lib/report-digest.test.ts src/lib/map-pixel-offset.test.ts
cd apps/hexastral-api && bun test src/lib/feng-chat-*.test.ts src/lib/portfolio-voice.golden.test.ts
cd packages/astro-core && bun test  # feng suites
cd services/svc-feng && bun run typecheck
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
