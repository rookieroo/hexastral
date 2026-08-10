# Feng (風) — V1.1 Parity Plan: 扬长避短 (lean on strengths)

**Positioning decision (2026-08-03, user-directed):** an app can never match a
master's on-site 堪舆 — and should not try to. The goal is NOT parity, it is a
**defensible subset where the app is objectively better than a master**, with
the rest explicitly cut. This doc is the V1.1 scope after re-examination;
supersedes the aspirational parts of the earlier gap analysis. Companion to
[closeout-plan.md](./closeout-plan.md) (V1) and
[optimization-progress.md](./optimization-progress.md).

## 1. What the app is genuinely better at (lean into these)

| Strength | Why it beats a master |
|---|---|
| **Deterministic engine** | 沈氏 algorithms + 150 golden tests: same input → same verdict, auditable, no drift. A master cannot reproduce his own read. |
| **Instant global 峦头** | Satellite + 8-宫 DEM 2.5km ring + Tilequery water/road — one tap vs days of travel. Works anywhere (Mapbox global). |
| **Time machine** | Any 元运/流年/流月 computable; 立春 cron keeps every report current every year. A master must re-visit. |
| **Record-keeping** | Every report persisted, shareable, comparable across time (highlights, room overrides, digest). A master's memory. |
| **Honesty by construction** | Confidence note + degraded states + vision-geometry audit (mustSoften). Masters overclaim; we under-claim on purpose. |
| **Price/access** | One-time high-ACV report vs 上门数万. Chat bundled for follow-ups. |

## 2. Market constraints (US + Southeast Asia — NOT China)

- **Mapillary street 形煞 is a US/SEA differentiator, keep it.** Coverage is
  viable in US + SG/MY (and the target markets have no China coverage issue).
  Already floor-attenuated + degraded-fallback (`feng-analyze.ts:127–136`).
  Remains gated on legal sign-off (closeout W4) — flip `MAPILLARY_TOKEN` per market.
- **WMM declination grid already matches the markets**: US/JP/SG/MY/TW/HK
  (`lib/magnetic-declination.ts`), ±0.5°. Outside grid → degraded, device
  declination via `watchHeadingAsync` fallback.
- **DEM / water / roads**: Mapbox Tilequery, global — no market dependency.
- **i18n**: existing 4 locales cover en + zh + ja; SEA = en + zh.

## 3. Cut list — 有所取舍 (explicitly NOT in scope, V1.1 or ever)

| Cut | Why | Replacement / baseline |
|---|---|---|
| **AR / RoomPlan / LiDAR** | Device coverage too low, native cost too high, MVP rejects. | Manual 立极 `centerNorm` pin + floorplan orient dial stays the neutral baseline. Data model must NOT assume AR (no new fields). |
| **五感 (wind / light / sound)** | Consumer hardware cannot sense 风/声 reliably; no honest data path. | Nothing. 急风/采光 never claimed in report — outside engine scope. |
| **分金 / 七十二龙 / 透地 / 120分金** | Needs sub-degree precision a phone compass cannot deliver; near-zero consumer comprehension in US/SEA; high golden-test effort. | 24山 (15°) + 兼向/替卦 detection already shipped. Revisit only as a future pro-tier moat with a physical 罗盘 accessory. |
| **应期 (event timing)** | "应验在何年何月" is an outcome claim → App Store 1.2 risk; the compliance layer (denylist + audit) exists precisely to avoid this. | **宅运旺衰窗口** instead: deterministic 当运/入囚/退气 periods of the house itself — a property of the 元运盘, not an event promise. |
| **家庭成员合参** | Multi-person birth-info onboarding friction vs single-user business model; room-ba-zhai dual track already covers the house-owner 命卦. | Keep single-user; V1.5 revisit if a pro tier asks for it. |

## 4. V1.1 workstreams (existing-architecture first)

Every WS below reuses shipped infra — no new engine, no new data providers.

### WS1 — 勘测记录本 (measurement log) — foundation
Wire the already-defined-but-orphaned compass RPC end to end:
- `packages/scenario-feng/src/lib/feng-api.ts:252` `compass()` exists; **no server
  route, no D1 table** (verified 2026-08-03).
- Add `GET/POST /api/feng/bearings` (HMAC v2) + `feng_bearings` table
  (siteId, pointType: door|building|balcony|room, degTrue, samples JSON, stdDev,
  devicePose, capturedAt). Reuse `feng_sites` auth/ownership pattern.
- Client: `(tabs)/compass.tsx` + facing ritual persist every capture (currently
  discards); report closing page gains a 勘测记录 line (count/points/dates).
- This is the master's 记录本 — and the foundation for WS4 复测.

### WS2 — 测量协议升级 (facing quality, client-only)
`components/NewSiteFacingStep.tsx` + `lib/facing-samples.ts`:
- Samples 3 → **5, with circular std-dev gate**: stdDev > ~4° → prompt to re-take
  (24山 boundary honesty; 兼向 already handled at ±2.5°).
- **Level/hold check via accelerometer**: `expo-sensors` is a declared-but-dead
  dependency (package.json:43, zero imports) — either use it (pitch/roll gate +
  hold-still timer) or delete it. Decide: use it, it is the only new sensor ask.
- **门向 promoted to required**: 阳宅以门立向 — the ritual must capture
  `doorDegTrue` before confirming; `sitDegTrue=facing+180` derivation
  (`sites.ts:327`) stays, door becomes the primary axis in the report.

### WS3 — 流月活盘 (interactive monthly layer, UI-only)
`monthlyStars` is already computed (`feng-analyze.ts:584–587`) and persisted in
`computeJson`, but never rendered:
- Report 流年方位 chapter: tap-to-toggle **年盘 ⇄ 月盘** nine-palace overlay
  (pure front-end render, zero engine work, zero tokens).
- Shows "本月此宫凶星入中/五黄方位勿动" style guidance — the strongest
  "师傅感" win per engineering hour in the whole plan.

### WS4 — 复测与建议跟踪 (feedback loop)
The master's business model is re-visit; ours is re-report (repeat purchase):
- Remediation 建议 → status state machine (建议 → 已执行 → 复测) stored per report.
- 复测 flow: re-run the WS1 bearing ritual on the same points → store delta vs
  original → offer a new report (existing analyze pipeline, zero new engine).
- Retention + revenue; also the honest "what changed" story.

### WS5 — 外景实拍 (ground-truth photos, photo-library first)
Satellite cannot see 电线杆/变电箱/对楼/地面明堂 — the master's main view. But
**no camera permission in MVP** (deferred per deploy-acceptance):
- Photo-library picker only (same pattern as floorplan step) — user shoots with
  the OS camera app, then picks. Zero new permission, ships today on all devices.
- 4 fixed slots: 大门外视角 / 明堂视角 / 左护右砂 / 水口方向.
- Upload via the existing floorplan pipeline pattern (EXIF/GPS strip,
  `svc-feng/routes/floorplan.ts` + R2 + ownership KV) — new content type, same infra.
- Feed into the existing vision 形煞 pass (`/vision/analyze`); azimuth from the
  site's recorded bearings (VLM overlay-claims already banned).
- Mapillary street stays the US/SEA primary; ground photos become the
  user-confirm path everywhere. Camera capture = optional V1.5 add.

### WS6 — 宅运旺衰窗口 (deterministic, compliance-safe)
- New small astro-core module: given 元运盘 + 建运年, derive the house's
  **当运期 / 退气期 / 入囚** windows (the period in which the current 旺星
  governs, and when it yields). Pure function of existing `classifyStar` /
  `yuanYunForYear` / 入囚 logic — golden-testable like everything else.
- Rendered in the 飞星 chapter + digest as "此宅当运于 2004–2023" style framing —
  a property of the house, never an event prediction.

## 5. Sequencing

| Phase | WS | Gate |
|---|---|---|
| V1.1-A (foundation) | WS1 → WS2 → WS3 | Compass log round-trip on device; 5-sample gate; 月盘 renders |
| V1.1-B (differentiation) | WS5 → WS4 | Ground-photo 形煞 in report; re-measure delta view |
| V1.1-C (moat) | WS6 | Golden tests green; report renders 当运窗口 |

## 6. Code cleanup appendix (quick wins, no behavior change)

- `expo-sensors` — consumed by WS2 or removed (it is currently dead weight).
- `useDeclination` (scenario-feng) — superseded by device `trueHeading`;
  either wire as server cross-check for US/SEA or delete.
- `lib/share.ts` (`/api/share`) — unused; chapter share ships via view-shot PNG.
  Delete or repurpose.
- `memory-preference` — chat memory opt-in, unbuilt; wire in chat or cut.
- `room-palace-overrides` / `highlights` — AsyncStorage-only today; sync to D1
  only if WS4 (复测) needs them server-side; otherwise leave device-local.
- Non-goal guardrail: **no new fields in `FengSite` for AR** — the manual
  立极 baseline must not accrete unused columns.

## 7. One-line doctrine

**理气卖确定 (deterministic engine + honesty), 峦头卖覆盖 (satellite/DEM/street),
测量卖仪式 (rigorous multi-point protocol), 时间卖更新 (annual/monthly living
report), 复测卖留存 (feedback loop).** Everything else is cut.
