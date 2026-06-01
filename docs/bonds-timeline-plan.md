# Bonds Timeline Plan — 本我中心的多关系时间轴 (Yuán 订阅护城河)

> **Status**: **Server/engine batch SHIPPED** (BT.0–BT.4, BT.6) — `bun test` + `bun typecheck` green (astro-core 626, hexastral-api 92, repo-wide 737 pass). **BT.5 (yuan-app screen + 本地推送 + 录入表单) deferred to device/EAS batch.** MVP-scope per founder call (2026-05-22).
> **Last updated**: 2026-05-22 (post-implementation).
> **Builds on**: [monetization-and-capabilities-plan.md](monetization-and-capabilities-plan.md) §2 (Capability A — Timeline) B-yuan line ·
> [ADR-0012](decisions/0012-matrix-freemium-monetization.md) (Yuán = 订阅旗舰, value = Timeline + 多层 chat) ·
> [ADR-0013](decisions/0013-iap-system-architecture.md) (entitlement gate).
> **Decision of record**: [ADR-0014](decisions/0014-bonds-timeline-architecture.md) ✅ written (BT.0) — captures the 3 load-bearing calls below.

## ▶ Current status & handover — a fresh session START HERE

This plan turns the **pairwise** relationship timeline (B-yuan.1 engine ✅ shipped, B-yuan.3 explain ✅ shipped,
B-yuan.2 client ❌ never built) into the **ego-centric multi-bond** timeline that is Yuán's subscription moat:
one time axis weaving 本我 × 全部关联人(bonds)，主动提前推送显著节点。

**Founder calls that override the earlier "ship single-pair first / don't change schema" caution:**
1. **多关系合并直接进 MVP** — 不先发单对版。单对 timeline 在合并视图里是 N=1 的退化情形，不单独做。
2. **写时重算、绝不每天跑** — timeline 是出生盘的纯函数，仅在 bond 集合或本我生辰变更时重算 + 缓存。
3. **照 Fate 八字录入收全生辰，schema 随便改** — 无真实用户、未上生产，补精度列即可。

**Three load-bearing architecture decisions (→ ADR-0014):**
- **D1 — 两两扇出，不做 N 体一次性 reading.** 命理 synastry 本质成对(合婚=两盘干支冲合刑害)；N 体同时合盘无成熟框架，喂 LLM 必编造，违反 monetization §7「LLM 润色不决策」。合并轴 = ⋃ 每对 `getRelationshipTimelineNodes(ego, bond_i)`。
- **D2 — 服务端合并（隐私驱动）.** [schema.ts:953](apps/hexastral-api/src/db/schema.ts:953) 明文「B 的生辰命格不暴露给 A」。resonance bond 的对方原始盘在 `pair_readings`，**不能下发到本我设备**。故服务端持盘合并，只回**派生节点**(非原始盘)。solo bond 本可端上算，但服务端统一处理两种模式。
- **D3 — 推送走本地通知，不走 server cron.** 复用 cycle-app 范式([push.ts](apps/cycle-app/lib/push.ts))：服务端回「未来推送时刻表」，客户端用 expo-notifications 排滚动窗口，开 app 重排。无 push token、无 cron。

**Verifiability split** (同 B-fate/B-yuan 约定): BT.1/BT.3/BT.4/BT.6 = server/engine, `bun test`+`bun typecheck` 可验；BT.2 = schema+`db:generate`；BT.5 = 客户端，需真机/EAS。

**✅ SHIPPED this session (2026-05-22, all `bun`-verified):**
- **BT.0** ADR-0014 written.
- **BT.1** `packages/astro-core/src/bonds-timeline.ts` `composeBondsTimeline` + 12 golden tests (扇出/共位去重/排序/推送限额/确定性).
- **BT.2 (server)** schema +lng/lat/tz/历法/闰月 on `userBonds.targetBirth*` + `pairReadings.personB*`; migration `0005_strange_ultron.sql`; `personBirthSchema` + solo/respond persist precision. *Client birth-entry forms → BT.5.*
- **BT.3** `GET /api/bonds/timeline` + pure `apps/hexastral-api/src/lib/bonds-timeline.ts` (resolution + privacy投影) + tests. **Cache = compute-on-read, no KV** (§2.2 says cache非必需; eliminates §7 staleness risk).
- **BT.4 (server)** `POST /api/bonds/timeline/explain` (bondId-keyed, D2-safe) + extracted `apps/hexastral-api/src/lib/relationship-timeline-explain.ts` shared core. *Client tap-wiring → BT.5.*
- **BT.6** yuan gate inline; free-taste finalized = 当前年 + 全部(≤3)bond, 无推送; Pro = 前瞻全轴(+15y) + 推送.

**Two findings the plan under-specified (now handled):**
- **镜像 bond 非对称**: resonance 镜像 bond(本我=应邀人)里对方是 `personA` 非 `personB` — `resolveResonanceCounterpart` 按本我生辰比中 personA 决定取哪一方。
- **explain 不能纯客户端分发**: relationship-timeline/explain 需 body 带对方生辰(resonance 下客户端无权持有, 违 D2) → 改为服务端 bondId 分发, 对方盘永不出服务端。

**Next step**: **BT.5 — device/EAS batch.** yuan-app Timeline 屏 + 节点 explain sheet(打 `POST /api/bonds/timeline/explain` {bondId,year,nodeType,daYunOf})+ 本地推送(cycle `push.ts` 范式, 消费 `GET /api/bonds/timeline` 的 `notifications`)+ solo/resonance 录入表单收全精度(API 已接). 全部服务端契约就绪。**客户端类型契约也已预接** —— `packages/scenario-yuan` 加了 `BondsTimeline*` 类型 + `yuanBonds(client).timeline.{$get, explain.$post}` RPC → BT.5 = 纯 UI + hook + 推送排程 + 表单精度。

---

## 0. TL;DR

- **是什么**: yuan-app 一条「本我日历」——把本我所有关系的未来显著节点(流年冲/合、任一方大运换运)叠在同一时间轴，提前推送、点开 LLM 深解。
- **为什么是护城河**: 这是**主动预测**(Timeline 轴)，与 chat 的**被动检索**(AI Search, L1–L4 context-builder)正交 —— monetization §2 vs §3 已划好这条轴。聊天机器人给不了「跨全部关系的前瞻日历」。
- **为什么不贵**: 确定性引擎([relationship-timeline.ts](packages/astro-core/src/relationship-timeline.ts))+ 数据枚举(`/active-pairs` 已证明)都在；缺的只是一层**合并/排序/限额**纯函数 + 一个服务端读路由 + 一个客户端屏幕。

## 1. 现状盘点 (code, 2026-05-22)

| 件 | 状态 | 位置 |
|---|---|---|
| 单人 fate 引擎 (大运/流年) | ✅ | [timeline.ts](packages/astro-core/src/timeline.ts) `getTimelineNodes` / `getTimelineNotifications` |
| **双人**关系引擎 (流年冲合 + 任一方大运) | ✅ | [relationship-timeline.ts:189](packages/astro-core/src/relationship-timeline.ts:189) `getRelationshipTimelineNodes` |
| 节点深解 explain (单对 / 单人) | ✅ K.4-guarded | `/api/relationship-timeline/explain` · `/api/timeline/explain` |
| **多关系合并**引擎 | ❌ 不存在 | — (BT.1) |
| 服务端合并/缓存/读路由 | ❌ | — (BT.3) |
| 客户端 timeline 屏幕 + 本地推送 | ❌ | — (BT.5) |
| 流月节点 (你认定的日活钩子) | ❌ 未实现 | astro-core 仅 `monthGanZhi` 原语，无 `getLiuYue`；本计划**不含**流月，见 §7 |

**数据可枚举性 (BT.1/BT.3 的前提) — 已确认可行:**
- 本我生辰: `users` 表 (含 lng/lat/tz, 全精度)。
- solo bond: [schema.ts:900](apps/hexastral-api/src/db/schema.ts:900) `userBonds.targetBirth{SolarDate,TimeIndex,Gender,City}` — **缺 lng/lat/tz** (BT.2 补)。
- resonance bond: [schema.ts:312](apps/hexastral-api/src/db/schema.ts:312) `pairReadings.personB{SolarDate,TimeIndex,Gender}` — **缺 lng/lat/tz** (BT.2 补)。**仅服务端可读**(隐私 D2)。
- 关系类型: `pairReadings.relationshipCategory` (spouse/partner/parent/child/sibling/friend/colleague/boss) + `userBonds.relationshipStage` (crush/dating/committed/engaged/married/ex)。

## 2. 设计

### 2.1 合并引擎 (BT.1, 纯函数)

```
composeBondsTimeline(ego, bonds[], opts) → { nodes: MergedNode[], notifications: MergedNotification[] }
  bonds[i] = { input, gender, bondId, name, relationshipLabel }
```

1. 对每个 bond 跑 `getRelationshipTimelineNodes(ego, bond_i)`，给每个节点打 `{ bondId, name }`。
   - 注: 该引擎的「大运」节点已含本我大运(`daYunOf:'A'`)的关系化表述「你进入X大运，关系节奏转换」——**不另接单人 fate `getTimelineNodes`**，避免与 fate_pro 的本命 timeline 撞 + 蚕食 (见 §6 boundary)。
2. **共位合并**: 同 `effectiveDate` 的节点聚成一个 `MergedNode { date, kind, bonds: [{bondId,name,node}] }`。
   - 本我同年大运在 N 个 bond 里重复出现 → 共位去重成一条「你进入X大运，将影响与[A、B、C]的关系」。
3. **显著度排序**: `major`(大运) > `notable`(冲/合) > `routine`；同级按受影响 bond 数降序。
4. **推送限额 (全局/用户)**: `notifications` 取未来窗口内 `significance != routine` 节点，**套每用户上限**(e.g. ≤1 条/周 或 月度 top-N)，共位节点合成一条。lead 沿用 半年/一月([relationship-timeline.ts:224](packages/astro-core/src/relationship-timeline.ts:224))。**视图全展示，唯推送限额** —— 这是解决「N 个 bond 各自推会炸」(monetization §7)的地方。
- Golden 测试: 固定本我 + 2–3 bond，断言 共位去重 / 排序 / 限额 / UTC 确定性。

### 2.2 服务端合并 + 读路由 (BT.3)

- `GET /api/bonds/timeline` (ego-scoped, HMAC): 枚举本我 + 全部 `status='active'` bond → 各模式取生辰(本我=users; solo=userBonds; resonance=pairReadings, 服务端持盘) → `composeBondsTimeline` → 回 **{ nodes, notifications }**，**只含派生节点 + bond 名/标签/id，绝不回 personB 原始 date/time** (隐私 D2)。
- **缓存 + 失效 (写时重算, D2)**: per-user 缓存(GUARD_KV 或 `users.bonds_timeline_version` bump)。失效点 = 任一 bond 变「盘完整」或集合变更:
  - solo 创建 [bonds.ts:214](apps/hexastral-api/src/routes/bonds.ts:214) · resonance 接受(respond handler) · `PATCH /:id`(改生辰/关系) · `DELETE /:id` · 本我生辰 PUT([user.ts](apps/hexastral-api/src/routes/user.ts))。
  - 重算亚毫秒级(纯函数, N 小)，缓存只为省重复 compute，不是必需。

### 2.3 节点深解 (BT.4, 复用)

点开一个 `MergedNode` → 既有 explain：关系节点 → `POST /api/relationship-timeline/explain` (B-yuan.3 ✅)，本我大运节点 → `POST /api/timeline/explain` (B-fate.3 ✅)。均 K.4-guarded。**几乎无新服务端活，纯路由分发。**

### 2.4 客户端 (BT.5, 需真机)

- yuan-app 新 Timeline 屏: 竖向时间轴，共位节点分组卡片，点开 → explain sheet (复用既有 reading-chat/explain 范式)。
- 本地推送: 镜像 [cycle-app/lib/push.ts](apps/cycle-app/lib/push.ts) (`scheduleDailyAlmanac`/`refreshDailyPush` 范式) —— 从服务端 `notifications` 排滚动窗口，开 app 重排。全局限额已在服务端套好。

## 3. 任务分解

| ID | 内容 | 验证 | 依赖 |
|---|---|---|---|
| **BT.0** | ADR-0014: 记 D1(扇出)/D2(服务端)/D3(本地推送) 三决策 | review | — |
| **BT.1** | astro-core `composeBondsTimeline` + golden 测试 | `bun test` | — |
| **BT.2** | 生辰精度 schema: `userBonds` + `pairReadings` 补 lng/lat/tz(+历法/闰月); resonance `/resonate` 页 + solo 录入 UI 照 Fate onboarding 收全 | `bun typecheck` + `db:generate` | — |
| **BT.3** | `GET /api/bonds/timeline` 服务端合并 + 缓存失效 (派生节点 only) | `bun test` | BT.1, BT.2 |
| **BT.4** | 客户端节点 → 既有 explain 路由分发 | `bun typecheck` | BT.3 |
| **BT.5** | yuan-app Timeline 屏 + 本地推送 (cycle 范式) | 真机/EAS | BT.3 |
| **BT.6** | IAP 闸: bonds timeline = `yuan` entitlement([capabilities.ts](apps/hexastral-api/src/lib/access/capabilities.ts)); free taste 范围见 §5-Q3 | `bun test` | BT.3 |

## 4. Sequencing

```
BT.0 (ADR) ─┐
BT.1 (引擎, 可验) ──→ BT.3 (路由) ──→ BT.4 (explain 分发) ──→ BT.5 (客户端+推送)
BT.2 (schema) ──────┘                       BT.6 (闸) ──┘
```
服务端/引擎 (BT.1/2/3/4/6) 全 `bun` 可验，可在无设备环境一口气推完；BT.5 留到真机批次(与 B-fate.2/B-yuan.2 同档)。

## 5. Open questions — **ALL RESOLVED (2026-05-22)**

- **Q1 ADR-0014 要不要单写**: ✅ **写了** — [ADR-0014](decisions/0014-bonds-timeline-architecture.md).
- **Q2 缓存载体**: ✅ **不缓存, compute-on-read.** 创始人确认「纯计算不需缓存」。每请求纯函数重算(亚毫秒), 无 KV、无 cron → 永不陈旧, 消除 §7 失效点风险。日后 compute 成本显现再加 per-user KV。
- **Q3 free-taste 边界**: ✅ **当前年 + 全部(≤3 免费 resonance)bond, 无推送.** 创始人确认 3 个免费 bond 已够慷慨且奖励裂变(拉来 3 段关系的用户本年全看到)。Pro = 前瞻全轴(+15y) + 主动推送(护城河)。*注: 这放宽了原「仅第 1 个 bond」建议。*
- **Q4 本我本命层**: ✅ **确认 boundary** — 关系引擎已含本我大运的关系化表述, 不并入 fate 单人 timeline。explain 也统一走关系框架(`POST /api/bonds/timeline/explain`), 不接 fate `getTimelineNodes`。fate_pro=命运 / yuan_pro=关系, 各自表述。

## 6. fate_pro / yuan_pro 边界

| 卖点 | 归属 | 引擎 |
|---|---|---|
| 本命 大运/流年 走势 (单人前瞻) | **fate_pro** (fate-app) | `getTimelineNodes` |
| 本我 × 全关系 的关系节点日历 | **yuan_pro** (yuan-app) | `composeBondsTimeline` (本计划) |

二者共用本我大运这一锚点但**框架不同**(命运 vs 关系)，文案/UI 各自表述，不互相替代。

## 7. 不在本计划范围 / 风险

- **流月节点**: 你认定的日活/订阅钩子，但 astro-core **无 `getLiuYue`**(仅 `monthGanZhi` 月柱原语)。关系流月需真太阳时才准 —— **BT.2 现在收全 lng/lat/tz 正是为它铺路**，但流月引擎本身另开计划(成本: `getLiuYue` + 关系流月标注 + golden + 推送节流)。
- **推送刷屏**: 由 BT.1 的全局限额(§2.1-4)兜底，非每对独立推。
- **resonance 隐私**: ✅ **已逐行核.** 客户端路由 `GET /`、`GET /:id`、respond 均只回派生数据(score/grade/archetype/dimensions/interpretation), **不含 personB 原始 date/time**。唯一回原始盘的 `GET /active-pairs` 是**内部端点**(`X-Internal-Key` 服务鉴权, 供 svc-fortune 合盘 cron), 非客户端可达 → 非 D2 泄露。新 `/timeline` + `/timeline/explain` 经测试证明只回派生节点/文本。
- **远期精度**: 年级节点 date+时辰足够(日支只需日期; 大运起运依赖 节气, 已于 C.1.8 修精)；lng/tz 为流月/流日级预留。**注**: 镜像 resonance bond 的对方在 `personA`(无精度列), 年级时间轴不受影响; 流月级若要镜像 bond 精度需补 `personA` 精度列(本期未做)。
- **缓存陈旧**: ✅ **不适用** —— compute-on-read 无缓存(Q2), 无失效点。
- **email 合规 (resonance invite)**: 已审 —— 单次事务性邀请、A 署名、reply-to A、限流、7 天过期, 并补了透明度页脚(来源+用途限定)。**待补**: 实体邮寄地址(CAN-SPAM)、正式 opt-out / `List-Unsubscribe`、CASL(加拿大)前法务确认。需公司地址 + opt-out 收件箱决策。
