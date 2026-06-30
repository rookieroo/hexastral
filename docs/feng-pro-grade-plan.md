# Feng (風) — Wave 4: 专业度拉满 (四维 10/10, V1 scope)

Decision (2026-06-30, user-directed): **V1 must take all four professional
domains to 10/10**, not defer them. This doc is the execution plan. Lineage is
locked to **沈氏玄空** (consistent with `astro-core/feng`), 八宅 to 八宅明镜.

Companion to `docs/feng-fix-plan.md` (Waves 1-3). Code is source of truth.

## The four dimensions and the gap to 10/10

| 维度 | now | gap to 10 | nature |
| --- | --- | --- | --- |
| 玄空飞星 | 7.5 | 组合断事 + 格局识别 + 月紫白 | **deterministic** (computable, golden-testable) |
| 八宅 | 7.0 | 宅卦游年 + 宅命合参 + 床灶门床位 | **deterministic** (+ needs room mapping) |
| 峦头/形势 | 4.0 | 多尺度 DEM(龙脉)+ 街景(形煞)+ 方位化 | **data + VLM + geo-compute** (hard) |
| 形理整合 | 5.0 | 山水×飞星 关联断语引擎 | **deterministic rule engine** (the multiplier) |

The honest risk ranking: D1/D2 are bounded engineering. **D3 is the real cost**
(new data sources, geospatial compute, coverage gaps). **D4 is the highest
leverage** — it's what turns "AI 描述" into "师傅断语". A domain-expert review
gate (one paid 风水师 validating sample outputs) is a hard prerequisite for the
word "专业" — budget for it.

---

## D1 progress (2026-06-30)
- ✅ **D1.2 格局识别引擎** — `flying-stars-patterns.ts` + `detectPatterns()`:
  旺山旺向 / 上山下水 / 双星会向 / 双星会坐 / 合十 / 父母三般卦 / 连珠三般卦 /
  全盘伏吟 / 全盘反吟. Golden-tested against published 八运 charts (子山午向→双星会向,
  巽山乾向→旺山旺向, 戌山辰向→上山下水, 午山子向→双星会坐). 七星打劫 / 城门诀
  deferred (need extra context + verified corpora). Barrel-exported; astro-core
  102/102 tests pass.
- ✅ **D1.2 pipeline integration** — `detectPatterns` now runs in `feng-analyze`,
  is persisted in `feng_reports.computeJson` + passed to synthesis as
  AUTHORITATIVE (prompt rule: name/interpret every pattern, never re-derive),
  typed through `scenario-feng` (`FengComputeJson.patterns`), and rendered as
  quality-colored 格局 chips in the report's 飞星 chapter. Full chain typecheck +
  biome clean.
- ✅ **D1.3 旺衰升级** — `classifyStar` 重写为沈氏标准 (当令 / 生气=未来一二运 /
  退气 / 死气 / 五黄永煞;5运的5为当令)。新增 `isProsperous`。修正旧测试
  (9运中 2→生气, 7→死气)。
- ✅ **D1.1 双星组合断事表** — `flying-stars-combinations.ts`:27 条沈氏紫白诀/飞星赋
  组合(文昌/斗牛煞/交剑煞/穿心/七九合辙/紫黄毒药 等),按排序对键入、当令/失令
  双读;`describePalaceCombination` 按当前元运旺衰选读。**已接管线**:feng-analyze
  逐宫算 → computeJson + synthesis(prompt 要求权威采用)→ scenario-feng 类型。
- ✅ **D1.4 月紫白** — `monthlyChart` / `monthlyCenterStar`(三元月白诀:年支定
  正月入中→逐月递减→顺飞)。引擎+测试完成;**接入待办**(需 节-month 解析喂
  annual_directions 章节做流月)。
- astro-core 761/761 测试通过;全链路 typecheck + biome clean.
- 待办:report UI 逐宫组合 chip 展示;月紫白接 synthesis;七星打劫/城门诀。

## D1 — 玄空飞星 → 10/10  (all deterministic, in `astro-core/feng`)

Target: from "correct charts" to "correct charts + reads them like a 师傅".

### D1.1 — 星曜组合断事 (山向双星 combination table)
- New `flying-stars-combinations.ts`: a curated table keyed by the **sorted
  (山星, 向星)** pair → `{ name, jixiong, 应事, condition: 当令|失令|流年触发 }`.
- Cover the canonical set from 沈氏《玄空学》/ 紫白诀: 1-4/4-1 文昌, 1-6, 2-5/5-2
  病符・大凶, 2-3/3-2 斗牛煞, 6-7/7-6 交剑煞, 3-7/7-3 穿心・盗劫, 8-6/6-8, 9-7
  回禄(火), 4-7 桃花, 2-7 火生土, etc. (~40-60 entries with 当令/失令 split).
- Per palace, combine 山+向 (and overlay 年/月 star for "今年此宫触动").
- Golden tests against published combination readings.

### D1.2 — 格局识别引擎 (deterministic predicates on the 9-charts)
New `flying-stars-patterns.ts`, each a pure predicate on
`{ periodChart, mountainChart, facingChart, sitPalace, facePalace, yuanYun }`:
- 旺山旺向 (到山到向) · 上山下水 · 双星会向 · 双星会坐
- 合十 (山盘/向盘 与运盘合十) · 父母三般卦 · 连珠三般卦
- 反吟 / 伏吟 (vs 元旦盘) · 入囚 (当运向星到中宫)
- 七星打劫 (离/坎宫打劫，需 父母三般 + 特定宫) — flag as advanced, test hard
- 城门诀 (向首左右宫可通气 + 旺向星 + 宜水) — returns 正/副城门方位
- 收山出煞 · 零神正神方 (正神宜山、零神宜水 — feeds D4)
- Output: `PatternResult[] = { pattern, severity, palaces[], note }`.
- **This is the single biggest D1 lift.** All golden-testable from published
  charts (extend the existing 八运子山午向 fixture style).

### D1.3 — 旺衰系统升级
- Replace the simplified `classifyStar` with full 生旺退死煞 relative to 元运,
  distinguishing 当令 / 进气(未来一二运为生气) / 退气 / 死气 / 煞(2,5) and
  令星. Keep back-compat export.

### D1.4 — 月紫白 (+ optional 日紫白)
- Add `monthlyChart(year, month)` (年上起月, 三元月白). Enables 流月 timing for
  化解/动土择日 (also feeds the cycle↔feng funnel in ADR-0019).
- 日/时紫白 optional; gate behind 择日 feature only.

Acceptance: 格局 + 组合 + 旺衰 + 月星 all golden-tested; report's 飞星 chapter
names the 格局 and the per-palace 双星断语.

---

## D2 progress (2026-06-30) — ✅ engines done

- ✅ **D2.1 宅卦游年 + 宅命合参** — `houseGuaFromSit` / `houseDirections`
  (宅卦大游年, 复用既有大游年表) + `zhaiMingConcord` (东四宅×东四命 相配/不配 +
  以人为本 remedy advice).
- ✅ **D2.2 床/灶/门/书桌吉位** — `furniturePlacement`: 门=生气、床头=天医、
  书桌=生气、灶=坐凶(绝命)向吉(天医) 坐凶向吉法.
- ✅ **集成**: `computeBaZhai` 现自动带 `placement` (always) + `house` / `concord`
  (有 sitPalace 时) → 经 feng-analyze 既有 baZhai 流入 computeJson + synthesis;
  prompt 第2章已要求陈述宅命合参 verdict + 念出床/灶/门 placement 方位。
  scenario-feng `BaZhaiResult` 自动更新 (astro-core 重导出)。
- astro-core 768/768 测试通过;全链路 typecheck + biome clean.
- 待办: report UI 展示 placement / 宅命合参; D2.3 大游年翻卦掌 (静宅) 选做;
  床/灶/门落到真实房间需 立极/户型映射 (cross-cutting, V1 手动 / V1.5 RoomPlan).

## D2 — 八宅 → 10/10  (`astro-core/feng/ba-zhai.ts` + room mapping)

### D2.1 — 宅卦游年 (house star assignment, not just person)
- Given the 宅卦 (from 坐山), produce the 8方 游年 stars
  (生气/天医/延年/伏位/绝命/五鬼/六煞/祸害) **for the house**.
- Add 宅命合参: 东四宅×东四命 match matrix + conflict verdict (when 宅 and 命
  disagree, state which governs and the compromise — 以床/门/灶 调整).

### D2.2 — 床/灶/门/书桌 吉凶方位 placement
- Per 命卦+宅卦 吉凶方, output placement guidance: 床头/灶向/大门/书桌 →
  best 吉方 (生气/天医/延年). Requires the **room mapping** (see Cross-cutting).
- 灶: 坐凶向吉 rule (压煞方、向吉方) — encode it.

### D2.3 — 静宅游年翻卦 (optional depth)
- 大游年翻卦 for the house's 8 宫 (the 翻卦掌). Deterministic; golden-test.

Acceptance: report's 命卦 chapter gives 宅命合参 verdict + concrete 床/灶/门 placement
tied to the user's actual rooms (D-cross).

---

## D3 progress (2026-06-30) — ✅ DEM 砂 (macro) + formLi UI

- ✅ **D3.1 大峦头 DEM 龙脉** — `svc-feng/src/lib/elevation.ts` `sampleElevationProfile`
  + `POST /terrain/profile`: samples `mapbox-terrain-v2` contour 高程 at 8 宫 points
  on a ~2.5km ring (great-circle destination math), compares to site baseline →
  per-宫 砂(高地) + 来龙方向 (laiLong). Worker-safe (Tilequery JSON, no raster
  decode). Fail-open.
- ✅ **集成**: feng-analyze calls it when prefetch flags elevation, **overlays DEM
  砂 onto `formByPalace.hasMountain`** before `correlateFormAndStars` → D4 now reads
  real height per 宫 (was VLM-guessed). `macroTerrain.laiLong` → synthesis chapter 1
  (prompt updated) + persisted in computeJson.
- ✅ **formLi report UI** — 飞星 chapter now renders per-宫 form-li verdicts
  (宫·verdict + reason, color by 吉凶) + 格局救应 notes (`report_formli_heading`,
  4 locales).
- 全链路 typecheck + biome clean;astro-core 776/776.
- Division of labor now: **砂/山 = DEM** (height, satellite can't see); **水/路/形煞
  = VLM** (visible top-down). 
- 待办 (D3 remainder): 街景形煞 (Street View/Mapillary, 小峦头 路冲/天斩) — coverage +
  ToS risk; 水系按宫归 (currently VLM-only); azimuth-from-coords for VLM features.

## D3 — 峦头/形势 → 10/10  (multi-scale, `svc-feng` + new geo step)

峦头 is multi-scale. "放大 RGB 到 10km" is wrong — macro needs **elevation**, not
a bigger photo.

### D3.1 — 大峦头 (5-10km): DEM 龙脉 + 水系
- Pull **Mapbox Terrain-RGB** tiles over a ~10km window; decode elevation
  (`-10000 + (R*65536 + G*256 + B) * 0.1`).
- Geo-compute (server-side, can reuse svc-feng wasm/CPU): hillshade + slope +
  **aspect** → derive 来龙方向 (dominant uphill ridge sector), 主山/少祖山 方位,
  high/low ground per 24山 sector around the site.
- Hydrology: Mapbox vector water + Tilequery feature coords → 大水(江河海)方位 +
  来去水口 + 远近. Compute **azimuth from site → feature** (don't let the VLM
  guess direction — compute it from coords).
- Output `MacroForm = { 来龙方位, 主山方位, 砂(按24山){高/低}, 水(按24山){有/无,远近,动静} }`.

### D3.2 — 中峦头 (~1km): 卫星 → 砂/明堂/水口
- Keep current satellite VLM but scale-specific prompt: 青龙/白虎/朝/案/玄武 砂,
  明堂开阔度, 水口, with direction cross-checked against D3.1 azimuths.

### D3.3 — 小峦头 (<300m): 形煞 (needs street-level)
- Top-down can't see 路冲/反弓/天斩煞/尖角冲射/孤峰高压. Add a street-level source:
  **Google Street View Static API** (or Mapillary fallback) — sample ~8 headings
  around the site → VLM 形煞 detection per image → 方位+severity.
- Graceful degrade where no coverage (rural): fall back to satellite-only with a
  data-quality note (extend existing `deriveDataQuality`).

### D3.4 — 方位化 + 结构化输出
- Everything峦头 emits **per-24山/per-8宫** structured features so D4 can join
  on direction. Replace the loose VLM JSON with a direction-indexed schema.

Acceptance: 砂/水/形煞 each carry a computed 24山 azimuth + 远近 + severity; macro
龙脉/水口 derived from DEM not guessed; coverage gaps surfaced honestly.

Cost/risk: Terrain-RGB + Street View are new API spend + new failure modes. Cache
aggressively in R2 (DEM windows change slowly). Street View coverage is the
biggest "10/10 can't be guaranteed everywhere" caveat — state it in the report.

---

## D4 progress (2026-06-30) — ✅ engine + integration done

- ✅ `astro-core/feng/form-li.ts` `correlateFormAndStars`:
  - **D4.1 山管人丁水管财** — per-palace verdicts (旺丁/旺财/损丁/破财/动凶/化煞):
    当旺山星见山=旺丁/见水=损丁;当旺向星见水=旺财/见山=破财;失令二五见水动=动凶;
    衰向星见水=破财;形煞 overlay。
  - **D4.2 零正神** — 正神(当运卦位)宜山、零神(合十对宫)宜水,反则警示(正神下水/零神上山)。
  - **D4.3 格局救应** — 上山下水得后水前山则救、旺山旺向得坐山向水为真旺、双星会向/坐
    宜向水/坐山。
  - (D4.4 八宅×玄空 仲裁 已由 D2 `zhaiMingConcord` 的"以人为本"覆盖)
- ✅ **集成**: feng-analyze 将 vision 的砂/水/形煞按宫名归宫(vision 本就输出八卦宫名)
  → `correlateFormAndStars`(用当前元运)→ computeJson + synthesis(prompt 要求跨
  1/3/5/6 章权威采用)→ scenario-feng `FengComputeJson.formLi`.
- astro-core 776/776 测试通过;全链路 typecheck + biome clean.
- 待办: report UI 展示 formLi 逐宫断语;形势质量仍受限于 D3(当前砂/水来自 2km 卫星
  VLM,精度待 D3 多尺度 DEM/街景提升)。

## D4 — 形理整合 → 10/10  (the multiplier — new `astro-core/feng/form-li.ts`)

Deterministic engine joining D1 charts + D3 direction-indexed form → per-palace
verdicts. The LLM then **narrates from these verdicts**, not from raw data.

### D4.1 — 山管人丁水管财 correlation
For each of the 8 宫, given its (山星, 向星, quality) and its form (山/水/形煞/空):
- 当旺**山星**方 宜见山/实/静 → 见山=丁旺; 见水/空=损丁.
- 当旺**向星**方 宜见水/动/开阔/路 → 见水=财旺; 见山/逼压=破财.
- 衰死方 宜静宜化; 见动/水(衰向星)= 破财, 见山(衰山星)反吉(出煞).
- Output per palace: `{ verdict: 旺丁|旺财|损丁|破财|平|出煞, reason, action }`.

### D4.2 — 零正神 × 峦头
- 正神方(当运卦位) 宜见山/实(靠); 零神方(合十对宫) 宜见水. Cross with D3 → 验证/警示.

### D4.3 — 格局 × 峦头 救应
- 上山下水 + 后水前山 = 救 (反之大凶); 旺山旺向 + 形势配合 = 真旺;
  城门诀 requires that 宫 actually 有水(D3). Confirm/deny each D1 pattern with form.

### D4.4 — 八宅 × 玄空 reconciliation
- When 八宅吉凶方 conflicts with 玄空旺衰, state precedence (玄空 primary for 理气;
  八宅 for 静态宜忌) and the combined recommendation.

Acceptance: synthesis prompt receives a structured `formLiVerdicts[]`; the report
says e.g. "西南向星8当旺却空荡见水不足 → 财气难聚,宜置水景/常开窗动之" — a
form-li conclusion, not a description.

---

## Cross-cutting: 立极 / 户型映射 (gates D2.2 + makes D1/D4 room-actionable)

To place stars/吉凶 in **actual rooms** you need an oriented floor outline.
- V1 path (no LiDAR): upload floor-plan image OR draw outline → manual
  rotate-to-true-north (cross-check vs satellite-drag facing) → manual 中宫 pin.
- 分宫 engine (deterministic, **lock the school + label it**): 九宫法 (3×3) as
  default; 八卦24山扇形 as option. Handle 缺角/L-form 中宫 + 缺角 detection
  (contested — pick a rule, cite it, test it).
- RoomPlan (LiDAR, AR) is the premium capture for this — **V1.5**, not V1 (native
  Swift module + LiDAR gate). V1 ships the manual path so room-mapping isn't blocked.

---

## Build order (dependency-correct) & rough effort

Solo-dev focused estimate (excludes domain-expert review + device QA):

1. **D1.2 格局 + D1.1 组合 + D1.3 旺衰** — ~1.5 wk. Pure compute, golden-tested.
   Foundation for D4.
2. **D2.1/D2.3 宅卦游年 + 合参** — ~0.5 wk. Pure compute.
3. **立极/分宫 engine + 户型 upload/draw + orient** — ~1 wk (RN + compute). Gates
   D2.2/room-actionable D1/D4.
4. **D3.1 DEM 龙脉/水 + D3.4 方位化 schema** — ~1.5 wk (geo-compute + Mapbox
   Terrain-RGB + caching). Hardest backend piece.
5. **D3.3 街景形煞** — ~1 wk (Street View/Mapillary + VLM + degrade). Coverage risk.
6. **D4 form-li engine** — ~1 wk. Joins D1+D3; the multiplier.
7. **D1.4 月紫白 + D2.2 床灶门 placement** — ~0.5 wk.
8. **Synthesis prompt rebuild** to narrate from structured verdicts — ~0.5 wk.
9. **Domain-expert validation pass** (paid 风水师 reviews N sample reports) —
   external, **gating for the "专业" claim**.

≈ **8-9 focused weeks** + expert review. This is a real V1 scope expansion vs
ADR-0019's W2 slot — flag the schedule impact to the launch plan.

## New dependencies / keys
- Mapbox Terrain-RGB (have Mapbox token; new tile usage + R2 cache).
- Google Street View Static API key (or Mapillary token) — new spend.
- Domain-expert reviewer (human, paid) — the real gate on "professional".

## Definition of done (per dimension)
- D1: 格局/组合/旺衰/月星 golden-tested; report names 格局 + per-palace 双星断语.
- D2: 宅命合参 verdict + 床/灶/门 placement tied to real rooms.
- D3: 砂/水/形煞 carry computed 24山 azimuth + 远近 + severity; 龙脉/水口 from DEM;
  coverage gaps surfaced.
- D4: structured `formLiVerdicts` drive the narrative; form-li conclusions, not
  descriptions.
- Gate: 风水师 sign-off on a sample-report batch.
