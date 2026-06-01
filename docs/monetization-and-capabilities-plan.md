# Monetization & Capabilities Plan — flagship subscriptions, tiered one-shots, universal chat

> **Status**: **Planning / in progress** (B-fate.1 engine shipped). Global model for the whole matrix.
> **Last updated**: 2026-05-22.
> **Decision of record**: [ADR-0012](decisions/0012-matrix-freemium-monetization.md) (this plan elaborates + amends it).
> **Builds on**: ADR-0009 (two-layer matrix), ADR-0010 (Cycle), the K.4 LLM guard, the chat-context-builder.

## ▶ Current status & handover (last worked 2026-05-22) — a fresh session START HERE

**The server/engine side of the 3 subscription flagships is built + verified** (typecheck + test + biome green on the changed workspaces — `@zhop/astro-core` / `@zhop/svc-astro` / `@zhop/hexastral-api`):

- **`products.ts` catalog** — A1: `cycle_pro` + `fate_pro` subs + `universe_pro` recomposed; A2-feng: `hexastral_feng_single` (one-shot, singleSku `feng_analysis`) registered + `purchase.ts` `VALID_SKU_IDS`.
- **Timeline engines (astro-core)** — `timeline.ts` (fate 命运: 大运/流年, B-fate.1) + `relationship-timeline.ts` (yuán 关系: 双方流年 冲/合 + 大运, B-yuan.1), both golden-tested.
- **Timeline explain (svc-astro + hexastral-api; K.4-guarded, GUARD_KV-cached, deterministic `node.summary` fallback)** — `/api/timeline/explain` (B-fate.3) + `/api/relationship-timeline/explain` (B-yuan.3).
- **Multi-layer chat budget** — `ChatTier` / `CHAT_TIER_BUDGET` in `reading-context-builder.ts` (default `'pro'` = back-compat). **Chat gate is now entitlement-driven** (ADR-0013 P1): `lib/access/capabilities.ts` `resolveChatTier` + free-taste tier replace the legacy `isProUser` 402 gate.

**IAP system architecture → [ADR-0013](decisions/0013-iap-system-architecture.md)** (implements ADR-0012's model). Phased P1–P5; **P1 shipped 2026-05-22** — capability resolver (`lib/access/capabilities.ts`, pure + unit-tested) + `chat.ts` rewired off `isProUser` → `user_entitlements`, with the free-taste tier (fixes the bug where `fate_pro`/`yuan_pro`/`cycle_pro` subscribers were 402'd out of chat).

**Immediate next (pick one):**
1. ✅ **Repo typecheck cleanup** — DONE (2026-05-22): the red was a stale **gitignored** `numerology-app/.expo/types/router.d.ts` from the May-15 scaffold; deleted → green (every other satellite runs without one).
2. **Client batch** (real device / EAS) — B-fate.2 / B-yuan.2: timeline screens consuming `getTimelineNodes` / `getRelationshipTimelineNodes` + local push via `get…TimelineNotifications` (mirror `apps/cycle-app/lib/push.ts`).
3. **IAP P2** (ADR-0013) — **P2.1 ✅** `user_credits` ledger (`services/credits.ts`, migration `0002`, 6 tests). **P2.2 ✅ (2026-05-22)** catalog + fulfillment: `products.ts` gains `faceoracle_reading`/`dream_pack_10`/`numerology_pack_10` + `CreditType` + `UNIVERSE_MONTHLY_ALLOWANCE` + `ledgerCreditTypeForConsumable`; `webhook.ts` routes ledger-backed packs → `grantPurchasedCredits` and universe activate/renewal/expire → `setMonthlyAllowance`/`clearAllowance` (3 catalog tests). **P2.3 (consumption) — face flip ✅ (2026-05-22)**: `lib/access/episodic.ts` `resolveEpisodicAccess` (consume allowance-first, else 402 upsell; 4 tests); `portfolio.ts` `/linked/faceoracle` now spends a `face` credit (universe allowance → purchased pack) with a `faceoracle_pro` legacy shim, threading `faceVlmAuthorized` into the pipeline so a paid consumable user gets real VLM (not teaser). **dream/numerology gating ✅ (2026-05-22)**: `/linked` dreamoracle + numerology now run 3 free readings/month (counted from `portfolioReadings`) → ledger pack credit (`decideEpisodicQuota` + `getCreditBalance`/`consumeCredit`, consume-after-success), else 402 upsell. **coincast** is already gated (its own free-3/month → `coincastCreditsRemaining` column flow) — a clean ledger-migration follow-up (webhook `coincast_cast` + read/consume → ledger; column then dead) would unify it. **Remaining P2.3**: feng universe-allowance path (one-shot `single_purchase` already gated in `feng/sites.ts`); move `checkReadingAccess` onto entitlements; subscriptions go unlimited. (Then P3 verification hardening · P4 client paywalls · P5 legacy drop.)
4. **B-cleanup** — drop omnibus/legacy products + `FlagshipKey 'hexastral'` routing — gated on hexastral-app deletion (= ADR-0013 P5).

**Verify changes** (full `bun typecheck` is red from #1's pre-existing errors — filter to changed workspaces):
```
bun typecheck --filter=@zhop/astro-core --filter=@zhop/svc-astro --filter=@zhop/hexastral-api
bun test packages/astro-core/src/__tests__/timeline.test.ts packages/astro-core/src/__tests__/relationship-timeline.test.ts apps/hexastral-api/src/lib/reading-context-builder.test.ts
node_modules/.bin/biome check --write <changed files>   # then --diagnostic-level=error to confirm 0 errors
```
**Deploy order:** svc-astro before hexastral-api. **Of record:** [ADR-0012](decisions/0012-matrix-freemium-monetization.md) (business model) · [ADR-0013](decisions/0013-iap-system-architecture.md) (system architecture).

---

Two capabilities define subscription value across the matrix: **Timeline** (proactive 命运/关系 预警) and **multi-layer Chat**. Everything else monetizes per-use by price band, with chat available everywhere (limited).

---

## 0. TL;DR

- **3 subscription flagships** — **fate (命) · Yuán (緣) · Cycle (黄历)**. Each = Timeline + advance push + **unlimited multi-layer chat**.
- **Everyone else = per-use by price band + LIMITED chat**:
  - **High 客单** — **Fēng (风水)**: one-shot site audit (+ annual 流年 refresh).
  - **Medium 客单** — **Face Oracle (面相)**: per-reading consumable (VLM cost).
  - **Low 客单** — **Coin Cast (六爻) · Dream Oracle (解梦) · Numerology (梅花)**: consumable packs.
- **Chat is universal**, scaling by tier (free taste → limited → unlimited + deeper context).
- **`universe_pro`** = all 3 subscriptions + a capped monthly consumable allowance + cross-app chat.
- **"Flagship" here = subscription flagship** (monetization), orthogonal to brand prominence — Fēng stays a premium brand but is sold one-shot.

---

## 1. Capability & monetization matrix

| App | Instrument | 价位带 | Timeline | Chat tier |
|---|---|---|---|---|
| **fate / 命** | **订阅** `fate_pro` | — | ✅ 命运 (流年/流月/大运) | 无限 · 全多层 (L1–L4) |
| **Yuán / 緣** | **订阅** `yuan_pro` | — | ✅ 关系 (合婚流年/纪念日/合盘变化) | 无限 · 全多层 |
| **Cycle / 黄历** | **订阅** `cycle_pro` | — | (每日变体: 对你而言) | 无限 · 全多层 |
| **Fēng / 風** | 单次 `feng_site` + 年度 `feng_refresh` | **高** | — | 限额（无限* 仅经 universe） |
| **Face Oracle / 面相** | 消耗 `faceoracle_reading` | **中** | — | 限额（无限* 仅经 universe） |
| **Coin Cast / 六爻** | 消耗包 | **低** | — | 限额 |
| **Dream Oracle / 解梦** | 消耗包 | **低** | — | 限额 |
| **Numerology / 梅花** | 消耗包 | **低** | — | 限额 |
| **universe_pro** | 订阅 ~$12.99/mo | — | 三旗舰全解锁 | **跨 app 无限\*** + 月度消耗额度 |

> **\* 「无限」= unlimited-within-app, abuse-capped (K.4 daily guard), 非硬月度计量** — 见 §8.2。在 fair-use 机制落地前，对外文案（paywall/ASO）不得写裸「无限」，用「含 N 条/月 / 充足额度」。

---

## 2. Capability A — Timeline (proactive 预警)

The core recurring value: a proactive life/relationship timeline that **notifies ahead of meaningful nodes**, lead-time by node type:

| 节点类型 | 含义 | 提前推送 |
|---|---|---|
| **大运 / 大限** (life-stage) | 十年级转换 | **半年 + 一个月** 两次 |
| **流年** (annual) | 当年干支 vs 命局/关系 | **一个月** (仅显著者: 七杀/伤官/正官/正财/正印 或 冲) |
| **流月** (monthly) | 当月干支 | 仅时间轴内明细,**不主动 push**(避免与 Cycle 每日节律相撞) |

- **fate timeline** — engine: `packages/astro-core/src/timeline.ts` (**B-fate.1 ✅ shipped**): `getTimelineNodes` + `getTimelineNotifications`, 节点标注十神/冲日支/显著度 + 预设文案。
- **Yuán timeline** — reuse the same engine pattern on synastry/relationship inputs (合婚流年、关系冲合、纪念日)。**B-yuan.1**.
- **Cycle** — its "timeline" is the already-built **daily 对你而言**(C.3)+ explain(C.4)+ push(C.5);Cycle 的订阅价值已基本成形,只缺多层 chat 对齐。

## 3. Capability B — Multi-layer Chat

Chat = LLM Q&A grounded in readings via the **chat-context-builder (L1 primary · L2 user brief · L3 cross-reading · L4 cross-app memory)**. The **context scales on two axes by tier** (user's 时间长度 + 文本长度):

| Tier | 时间长度 (history span) | 文本长度 (token budget) | 层级 |
|---|---|---|---|
| **Free taste** (~3 msgs) | 当前 reading only | 短 | L1 |
| **限额** (消耗档: 面/风/六爻/解梦/梅花) | 近期 readings | 中 (`trimContextBundle` 收紧阈值) | L1 + 简版 L2 |
| **订阅** (fate/yuan/cycle) | 全历史 | 长 | 全 L1–L4 |
| **universe** | 全历史 · **跨 app** | 长 | L1–L4 + 跨 app L3/L4 (知道八字+合盘+feng 全局) |

Implementation: parameterize the chat-context-builder by entitlement — history span (L3/L4 depth) + token budget (the existing `trimContextBundle` size guard becomes tier-aware) + per-tier daily message cap via the K.4 guard. **B-chat**.

## 4. Monetization instruments (final catalog)

Per [ADR-0012](decisions/0012-matrix-freemium-monetization.md), as amended here:

- **Subscriptions** → entitlement: `yuan_pro` · `fate_pro` · `cycle_pro` · `universe_pro` (grants all 3 + allowance + cross-app chat). *(All registered in `products.ts` — A1 + existing.)*
- **One-shot / consumable by band** (each bundles a **bounded chat allowance**):
  - High: `feng_site` (~$49) + `feng_refresh` (~$19/yr). *(`hexastral_feng_single` registered — A2-feng ✅.)*
  - Medium: `faceoracle_reading` (~$4.99) — **to build** (sub→consumable flip).
  - Low: `coincast_cast_pack_10` (exists) · `dream_pack_10` · `numerology_pack_10` — **to build** (+ credit columns).
- Chat available on every app; the **limit/context depth scales by tier** (§3).

---

## 5. Build roadmap

Verifiability noted — server/engine = I can build + you `bun test`/`bun typecheck`; client = needs real-device/EAS.

### B-fate — fate timeline + explain
- **B-fate.1 ✅ DONE** — `astro-core/timeline.ts` engine + golden tests + index export.
- **B-fate.2** — *fate-app*: timeline screen consuming `getTimelineNodes` + **local push scheduling** consuming `getTimelineNotifications` (mirror `cycle-app/lib/push.ts`). **RN client → real-device/EAS verify.**
- **B-fate.3 ✅ shipped** — svc-astro `POST /timeline/explain` (prompt + `callWithFallback`) + hexastral-api `POST /api/timeline/explain` (K.4-guarded, GUARD_KV 24h cache, recomputes node server-side, deterministic `node.summary` fallback). Mirrors `/cycle/explain` exactly. Free taste vs Pro-deep via the guard's signed/anon limits + tier. **Verify: `bun typecheck` + `bun test`.**

### B-yuan — relationship timeline (mirror fate)
- **B-yuan.1 ✅ shipped** — `astro-core/relationship-timeline.ts` + golden tests: 双方逐年流年(十神 vs 两日主 + 冲/合 vs 两日支)+ 任一方大运换运,提前推送同 fate。纪念日 = app 侧日期循环(非引擎)。
- **B-yuan.2** — *yuan-app*: timeline screen + push.
- **B-yuan.3 ✅ shipped** — svc-astro `POST /relationship-timeline/explain` (dual-perspective 你/对方 prompt) + hexastral-api `POST /api/relationship-timeline/explain` (recomputes node from BOTH charts, K.4-guarded, GUARD_KV cache, `node.summary` fallback). Mirrors fate B-fate.3.

### B-chat — multi-layer chat tiering
- **✅ shipped (budget mechanism)** — `ChatTier` + `CHAT_TIER_BUDGET` in `reading-context-builder.ts`: tier sizes 文本长度 (maxContextChars/truncate) + 时间长度 (L3/L4 inclusion). `buildReadingContext` / `trimContextBundle` take a tier param (default `'pro'` = back-compat); `chat.ts` derives universe-vs-pro. +2 unit tests. Cross-app stays privacy-opt-in-gated.
- **✅ gate migrated (ADR-0013 P1, 2026-05-22)** — free-taste tier + chat gate wired to `user_entitlements` via `lib/access/capabilities.ts` `resolveChatTier` (replaces the `isProUser` 402; legacy flag kept as shim until P5). 11 capability unit tests.
- **Remaining** — consumable chat allowances (the `'limited'` tier for episodic-app one-shots/packs) → lands with the `user_credits` ledger in IAP P2.

### B-iap — per-use flows (the A2 deferred work)
- **face** (medium): sub → consumable + client purchase flow (buy→poll→consume); flip `portfolio.ts` 402 gate.
- **feng** (high): wire the analyze route to `checkReadingAccess('feng_analysis')` (product registered ✅).
- **coin/dream/numerology** (low): packs + credit columns + spend logic + client.
- **universe allowance** mechanism (capped monthly consumable credits).

### B-cleanup — gated on hexastral-app deletion
- Drop omnibus/legacy products (`hexastral_pro`, omnibus consumables/singles, `coincast_pro_*`, `coincast_pro_expires_at`), `FlagshipKey 'hexastral'` routing.

## 6. Sequencing recommendation

1. **B-fate.3** (server explain) — verifiable, unlocks fate Pro value on top of the shipped engine.
2. **B-yuan.1** (engine) — `bun test`-verifiable, mirrors fate.
3. **B-chat** budgets (server) — the other half of subscription value.
4. **Client batch** (B-fate.2 / B-yuan.2 / B-iap client flows) — done together when on a real device/EAS.
5. **B-cleanup** — with hexastral-app deletion.

## 7. Risks

- Timeline accuracy (用神-adjacent significance heuristic — keep deterministic + explainable; LLM elaborates, doesn't decide).
- Notification spam — 流月 deliberately not pushed; per-app daily cap via guard.
- Chat cost — bounded by tier caps + K.4 guard; context budget is the cost lever.
- Pricing — all bands illustrative, need market testing.
- Client purchase flows (face/packs) don't exist yet — real feature work, not config.

---

## 8. Monetization simplification + compliance (2026-05-22) — DECIDED, pre-launch

> Outcome of stress-testing the "feng/face chat → subscription" idea. Re-affirms
> [ADR-0013](decisions/0013-iap-system-architecture.md) §2 (Face episodic, `faceoracle_pro`
> retired not extended) and §3 (subs = unlimited, abuse-capped). No new ADR.

### 8.1 Final money model (keep it small)

```
订阅 (recurring value)   fate_pro · yuan_pro · cycle_pro      ← timeline + 本 app 无限* chat
Bundle                   universe_pro                          ← 三旗舰 + 跨 app 无限 chat + episodic 月度额度
按次 (episodic)          feng one-shot · face/coin/dream/numerology 消耗包  ← 每次购买附带「慷慨的限额 chat」
不做                     feng/face 单独订阅 (per-app chat sub)  ← 见 8.2
退役 (P5/B-cleanup)      hexastral_pro · coincast_pro · 以及 catalog 里 dead 的 faceoracle_pro/feng_pro 订阅产品
```
`*` "无限" = unlimited-within-app, **abuse-capped by the K.4 daily guard** (ADR-0013 §3), not a hard monthly meter.

- **Episodic apps get unlimited chat ONLY via `universe_pro`** — no per-app chat sub. Code reverted 2026-05-22: `feng`/`face` removed from `SUBSCRIPTION_ENTITLEMENT`; `ENTITLEMENT_MONTHLY_ALLOWANCE` keeps only `universe_pro`.
- **Why not feng/face chat subs**: episodic apps lack a recurring-return hook → high churn; a mid-conversation $7–20/mo wall is high-friction/predatory; and Apple **Guideline 3.1.2** likely rejects a sub that doesn't deliver "ongoing value." Power users → `universe_pro`.

### 8.2 「无限」claim ↔ code must reconcile (compliance — 立即)

Marketing "无限/unlimited" while the server enforces the legacy **200/月 chatPool** is **inaccurate (虚假宣传 risk: Apple + FTC/EU)**.

- **Target (ADR-0013 §3) — ✅ shipped 2026-05-22 (server)**: real subscribers (fate/yuan/cycle/universe entitlement) now route through the **K.4 daily guard** (`CHAT_FAIRUSE_GUARD_CONFIG` in `routes/chat.ts`, ~120/day signed ceiling) — unlimited within the app, `429 fair_use_limited` only on abuse; the metered `chatPool` is retired for them. The legacy omnibus shim (no entitlement) keeps the pool until P5. So "无限（合理使用 / fair use）" now holds server-side.
- **Still pending — user-facing copy**: paywall + ASO must reflect "无限（合理使用）" honestly (and the ~120/day ceiling), not imply a metered "N 条/月". Until the copy ships, prefer "充足额度". Planning matrix §1 footnote already aligned.

### 8.3 Privacy / 人脸 BIPA (compliance — 立即, blocks Face launch)

Face uses VLM (Gemini Vision); current pipeline already "不存原图，只存特征向量" (good). Still required:

- **Privacy policy must disclose**: (1) face-image VLM processing; (2) third-party sharing → **Google Gemini** (sub-processor); (3) retention (feature vectors only, no raw image) + deletion path.
- **Biometric law**: US **Illinois BIPA** (statutory damages — real litigation risk), TX/WA, EU GDPR Art. 9 → require **explicit opt-in consent** before the first face upload (separate consent screen, not bundled into ToS acceptance), in the relevant jurisdictions.
- Consent design: a **dedicated** opt-in flag for biometric processing — never reuse/conflate an existing flag (privacy-sensitive scope changes get their own gate).

### 8.4 EULA + Privacy hosting (answered)

- **Host in `hexastral-web` is fine** — Apple needs a valid live URL + accurate content, not a specific domain. `/[locale]/privacy` already exists; add `/[locale]/terms` (EULA) + a **face/biometric addendum** section.
- The **documents must name `useone-tech LLC`** as data controller / contracting party (domain ≠ legal entity). The LLC site links to them for corporate hygiene; the operative ASC URLs can point at hexastral-web.
- Standard IAP UI musts: **Restore Purchases**, subscription disclosure on the paywall (title/period/price/auto-renew + Terms+Privacy links), and a **Manage/Cancel** deep-link.

### 8.5 Subscription-group crossgrade — no cancel/refund (answered)

- **Never** require cancel-then-resubscribe (not the native flow; accounting mess). Use **Apple subscription groups**: put `universe_pro` + each app's own sub in the **same group within that app** → upgrade = native **crossgrade with auto-proration** (Apple refunds the unused portion, zero double-charge).
- **Cross-app edge** (e.g. `cycle_pro` bought in cycle-app → buy `universe` in fate-app = different group, can't auto-cancel): steer the **"upgrade to universe" CTA to occur inside the app the user already subscribes to** (in-group crossgrade); RevenueCat holds the account-level entitlement so there is no access gap. Few subs ⇒ fewer overlap cases.

### 8.6 Execution checklist

- [x] Revert feng/face chat-sub wiring (`capabilities.ts` / `products.ts` / tests) — 2026-05-22.
- [x] Retire metered `chatPool` for subs → K.4-guard fair-use cap (§8.2) — 2026-05-22 (`routes/chat.ts`; legacy omnibus keeps the pool until P5).
- [x] Drop dead `faceoracle_pro` / `feng_pro` subscription products + entitlement keys — 2026-05-22 (`products.ts` catalog + `EntitlementKey` + universe bundle; removed the `portfolio.ts` faceoracle_pro VLM shim so face is pure per-use; aligned client `satellite-runtime/use-entitlements.ts` to the 5-key set). Nothing to coordinate in RC/ASC (never created).
- [x] BIPA explicit-consent **server flag + gate** — 2026-05-22 (`lib/biometric-consent.ts` + `users.biometric_consent_at/_version` migration `0003` + `/linked/faceoracle` 403 gate + `POST/DELETE /api/user/:id/biometric-consent`). **Still needs**: the client consent **screen** + the `/terms` page + face biometric addendum (§8.3–8.4). *Legal review of wording recommended.*
- [x] Webhook subscription activation **BLOCKER** fixed — 2026-05-22 (`webhook.ts` listened for non-existent `INITIAL_SUBSCRIPTION`; now `INITIAL_PURCHASE` + `PRODUCT_CHANGE` (crossgrade) + `UNCANCELLATION`). New subscribers were getting nothing until renewal.
- [x] Hard-block `/api/dev/*` in production — 2026-05-22 (`index.ts` env gate; was only hmac-gated → self-grant pro / full-reset reachable).
- [x] RC entitlement reconciliation (self-heal missed webhooks) — 2026-05-22 (`services/revenuecat.ts` + `POST /api/user/:id/entitlements/reconcile`, ADR-0013 §5b). *Needs `REVENUECAT_API_KEY` secret set.*
- [x] Scheduled reconcile sweep — 2026-05-22 (`lib/reconcile-sweep.ts`, daily 04:00 UTC handler; reconciles recently-lapsed entitlements = missed-renewal catch, capped 100/run, no-op without API key).
- [x] Face refund-on-failure (ADR-0013 P3) — 2026-05-22 (`services/credits.ts` `refundCredit` + `portfolio.ts`: refunds the `face` credit to its source when the VLM degrades to teaser).
- [x] Webhook event-mapping regression test — 2026-05-22 (`classifySubscriptionEvent` extracted + `webhook.test.ts`; guards the `INITIAL_SUBSCRIPTION` class of blocker).
- [x] **Latent BLOCKER fixed — new subscribers were treated as free outside chat** — 2026-05-22. `isProUser`/`subscription_status` is still the active gate for ~14 non-chat Pro features (report/signal/natal/stellar/pair/…); only chat was migrated off it (P1). The webhook set `subscription_status='pro'` ONLY for the omnibus, so a new fate/yuan/cycle/universe subscriber had `subscription_status='free'` → blocked/degraded. Fix: `syncLegacySubscriptionShim` (`services/entitlements.ts`) DERIVES the shim from the active entitlement set; called in webhook activate+expire (multi-sub safe). *Trade-off:* `isProUser` is global → temporary cross-flagship over-grant until the per-flagship gating migration.
- [x] **Per-flagship gating migration + `isProUser` fully retired** — DONE 2026-05-22. Added `lib/access/entitlement-access.ts` (`userHasCapability` / `userHasAnySubscription`). Migrated content gates off global `isProUser` → per-capability: `report`/`signal`/`natal`/`stellar` → `'fate'`; `pair`/`annual-forecast`/`bonds` → `'yuan'`; `yiching`/`physiognomy` → `userHasAnySubscription`. Final 3 gate remnants migrated: `chart-rate-limit` → `userHasAnySubscription`; `quota` → `userHasAnySubscription`; `chat` → derives `legacyPro` from already-fetched `activeEntitlements` (redundant with `hasEntitledSub`, making omnibus pool path dead). `isProUser` function **deleted** from `access-check.ts`; `checkReadingAccess` now uses `userHasAnySubscription` internally. Zero `isProUser` references remain in hexastral-api.
  - **P5-drop of the `subscription_status`/`subscription_plan` columns** remains blocked by non-gate readers: `reading-context-builder` reads `subscriptionPlan` (plan-tier budget), `chat` reads `subscriptionPlan` (plan quota), `dev.ts` writes both, `user.ts`/`bonds.ts`/`stellar/chart.ts` return `subscriptionStatus` to client, `syncLegacySubscriptionShim` still writes. Column drop + shim removal is a P5 task.
  - **`legacyPro` param in `resolveChatTier`** is now always == `hasEntitledSub` (redundant). Can be removed in a follow-up cleanup (makes the omnibus `else` branch in chat.ts dead code; safe since no real users).
- [ ] **KNOWN GAP — consumable refund clawback**: a refunded consumable pack (face/dream/numerology) arrives as a `CANCELLATION` on the consumable path, which isn't handled → granted credits are NOT clawed back (bounded refund-abuse). Needs RC's exact consumable-refund event verified before implementing (+ partial-spend / no-negative-balance handling). *Server, deferrable.*
- [ ] Privacy/ToS: add `/terms`, face biometric addendum, client BIPA consent screen (§8.3–8.4). *Legal review recommended.*
- [ ] ASC/RC: subscription groups for crossgrade; Restore + disclosure UI; reconcile yuan-app product IDs (ADR-0013 §6). *Manual.*
