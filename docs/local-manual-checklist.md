# 本地人工清单 / Launch 关键路径

> **Last updated**: 2026-05-21 — **rewritten as a dependency-ordered launch path, aligned to ADR-0009.**
> **Audience**: 必须在本地机器完成的工作（EAS、Apple Developer、RevenueCat、Cloudflare、设计师、日语审校）。Agent / CI **不能**代替这些步骤。
> **代码侧状态**: 矩阵基本 code-complete（Phase K Waves 0–3 ✅ / Cycle C.0–C.6 ✅ / Chat 差 CC.7 手测）。**剩下的就是这份清单。**
>
> **vs 上一版（2026-05-16）的重大变化**：
> - **compass-app 已删** → 所有 Compass 步骤移除。
> - **卫星 freemium**（[ADR-0012](decisions/0012-matrix-freemium-monetization.md),取代 ADR-0009 的"无 IAP"）:Cycle / fate = 订阅;六爻 / 解梦 / 梅花 = 消耗包;`universe_pro` 解锁全矩阵;限额即付费墙。
> - **RevenueCat 产品以 `apps/hexastral-api/src/config/products.ts` 为唯一真相**；旧版各处的 `hexastral_yuan_pro_*` / `hexastral_feng_site` 等 ID 已作废。
> - **hexastral-app 退役**（不上架）。

---

## 0. Launch 现实（ADR-0009 两层矩阵）

| App | 上架? | 货币化（ADR-0012 目标 catalog） |
|-----|-------|------|
| **fate-app**（命） | ✅ | **订阅** `fate_pro_{m,a}` — 命运 timeline + 流年/流月/大运 提前推送 + 无限 chat |
| **Yuán / 緣** | ✅ | **订阅** `yuan_pro_{m,a}` — 关系 timeline + 每日合盘运势 + 无限 chat |
| **Cycle / 黄历** | ✅ | **订阅** `cycle_pro_{m,a}` — 每日黄历 + AI explain + chat |
| **Fēng / 風**（仍是旗舰品牌,但单次变现） | ✅ | **单次** `feng_site`(~$49) + 年度 `feng_refresh`(~$19);非订阅 |
| **Face Oracle / 面相** | ✅ | **消耗·高客单** `faceoracle_reading`(~$4.99)/`pack_3`;VLM 成本,非订阅 |
| coin-cast / dream / numerology | ✅ | **消耗包** `*_pack_10`（低客单） |
| **universe_pro** | — | **订阅 ~$12.99/mo** — 解锁三订阅 + 每月封顶消耗额度 + **跨 app 无限 chat** |

> **chat = 跨业务付费钩子**:免费尝 ~3 条/读 → 付费单次/包内含**有限额度** → 订阅**无限**(本 app) → universe **跨 app 无限**。完整模型见 [ADR-0012](decisions/0012-matrix-freemium-monetization.md)（品牌 tier 与变现 instrument 是两条正交的轴）。
| ~~hexastral-app~~ | ❌ 退役 | — | 见决策① |
| ~~compass-app~~ | ❌ 已删 | — | — |

**后端**（wrangler 本地 deploy）：8 services → hexastral-api(+D1) → hexastral-web + useone-tech。

---

## 1. 先做决策（这些 gate 后面所有步骤）

**① 货币化模型 — ✅ 已定（[ADR-0012](decisions/0012-matrix-freemium-monetization.md)）。** 统一 freemium + 限额即付费墙 + instrument 按互动模式 + chat 为跨业务付费钩子。**剩下的是实现**（多文件,需真机 `bun typecheck`）:`products.ts` 重排为 ADR-0012 catalog（订阅 `yuan_pro`/`fate_pro`/`cycle_pro`/`universe_pro`;单次/消耗 `feng_site`+`feng_refresh`、`faceoracle_reading`、`*_pack_10`;删 hexastral omnibus + `feng_pro_*` + `faceoracle_pro_*` + coincast legacy）→ 同步 `routes/webhook.ts`、`services/entitlements.ts`、K.4 guard 额度配置 + drop `coincast_pro_expires_at` 的 D1 migration。
> ⚠️ **两项新功能**:fate 与 Yuán 的订阅价值靠 **timeline + 提前推送**（fate 流年/流月/大运;Yuán 关系流年/纪念日/合盘变化）——目前都**未实现**（astro-core `dayun`/`jieqi`/`synastry` 可复用,推送仿 Cycle `lib/push.ts`）。

**② feng 一次性 SKU。** feng-plan §7 设计过 `hexastral_feng_site`（$59 单次）+ `feng_annual_refresh`（$19），但 `products.ts` **没有**。→ 还做不做单次/刷新?要做就先加进 products.ts。

**③ 日语审校。** hire 母语审校（约 $2–3k，[phase-f-plan §10](phase-f-plan.md)）还是把 **JP 首发降为 V1.1**、先上 en/zh-Hant/zh?这是 lead-time 决策,越早定越好。
> ⚠️ **待审：fate-app i18n** — `apps/fate-app/lib/i18n.tsx` 的 `STRINGS` 已含 4 语全覆盖,但 **`ja` 列为机器初译**,需母语审校后再上 JP 区（命理术语如 命宫/日主/格局 的 ja 习惯译法尤需确认）。

**④ hexastral-app 删除。** Wave 4 已 unblocked（Cycle 覆盖黄历）。删了再 launch 更干净（也牵动决策①）。

**⑤ 首发范围。** 全 8 app 一起,还是**旗舰优先**?→ 见 §3,**我建议旗舰优先**。

---

## 2. 关键路径（按依赖排序）

```
Wave A  外部 lead-time（Day 0 就启动,和 B 并行）
        ├─ 设计师: 各上架 app 的 icon/splash/截图（[phase-f-designer-brief.md] — 注意 brief 列的旧 8 app
        │          含 compass/hexastral,按 §0 当前清单重新对齐再发）
        └─ ja 审校（决策③）— 几周 lead,定了就启动

Wave B  后端上线（与 A 并行,风险最低、最先可做;不依赖 iOS）
        1. 预检:  bun install && bun typecheck && bun lint && bun test && bun check-deps
        2. services（各自目录 bun deploy,顺序无所谓 — 见 deploy.md）:
           svc-admin-notify / svc-astro / svc-signal / svc-notify /
           svc-geocode / svc-mailer / svc-tail / svc-feng
        3. feng 基建（svc-feng 用）: R2 桶 + secrets（见 §4）
        4. API + D1:  cd apps/hexastral-api && bun db:generate && bun db:migrate:prod（先审 SQL）&& bun deploy
        5. web:  cd apps/hexastral-web && bun deploy ; cd apps/useone-tech && bun deploy
        6. 冒烟: curl https://api.hexastral.com/api/health

Wave C  移动端 per-app 准备（各 app 并行;决策⑤决定做几个）
        对每个上架 app:  cd apps/<app> && eas init  → 回填 app.json/eas.json 的 projectId
        Apple Developer → 注册 bundle id（com.hexastral.<slug>,以各 app.json 为准）
        App Store Connect → 建 app + 语言区 listing（en / zh-Hant / zh /〔ja 视决策③〕）

Wave D  RevenueCat / ASC（按 ADR-0012 catalog;先实现 products.ts 再建后台 SKU）
        订阅:   yuan_pro / fate_pro / cycle_pro / universe_pro（各 monthly+annual）
        单次/消耗: feng_site + feng_refresh / faceoracle_reading(或 pack_3) / coincast_cast_pack_10 / dream_pack_10 / numerology_pack_10
        entitlement(仅订阅): yuan_pro / fate_pro / cycle_pro;universe_pro 授予三者 + 月度消耗额度 + 跨 app chat
        指南: [setup/revenuecat-entitlements.md];iOS public key 写入各 IAP app 的 EXPO_PUBLIC_REVENUECAT_IOS_KEY

Wave E  Build + 提审
        EAS production build（feng-app 需 dev client 测 facing 屏,勿用 Expo Go）
        TestFlight 自测 → App Store 提审（ja 区待决策③确认后再提）
```

**硬阻塞（gate 提审）**：设计资产、决策①（RC 产品）、ja（若上 JP）。其余可并行。

---

## 3. 推荐节奏：旗舰优先（而非 8 个一起上）

单人同时上 8 个 app 风险高、且 Tier-3 是**漏斗**——它们要靠旗舰活着才有 upsell 目标。建议：

1. **第一批**：yuan + feng + face-oracle（有 IAP/营收,验证付费）+ 后端全量。
2. **第二批**：5 个 Tier-3 funnel（fate / coin-cast / dream / numerology / cycle,无 IAP,上架快）。

这样最快拿到**第一批真实用户 + 第一笔营收**,再用数据决定要不要铺满。

---

## 4. Feng 专项基建（Wave B 内,仍需）

```bash
# R2
wrangler r2 bucket create feng-maps
wrangler r2 bucket create feng-annotated
# secrets（在 services/svc-feng）
cd services/svc-feng
bunx wrangler secret put MAPBOX_TOKEN
bunx wrangler secret put GEMINI_API_KEY
```

仍未实现的**代码项**（非配置,但阻塞 feng 产品承诺）：
- hexastral-web **`/[locale]/feng`** 主落地页（目前仅 `feng-shui/[slug]` SEO）
- hexastral-api **立春 流年 cron**（目前只有计算逻辑,无定时刷新）

---

## 4b. Google 登录配置（代码已接入 fate-app,凭证 **待配置**）

> 代码侧已 code-complete:`/api/portfolio/auth/google`（jose 服务端验签,复用 HMAC v2,**未配置时 503 fail-closed**）、`@zhop/satellite-ui` 的 `SatelliteGoogleAuth`、fate-app「我」页登录区。**只差凭证 + 装依赖**,且与 Apple 共用统一 `users` 表(`google_user_id`,无需 migration)。
>
> ⚠️ `@react-native-google-signin/google-signin` 在 **Expo Go 不可用**;需 dev client / App Store build。沙箱无法 `bun install`,**首次需本地 `bun install`** 拉取该依赖,否则该文件 TS2307。

1. **Google Cloud Console** → APIs & Services → Credentials,建 OAuth consent screen(External)后建 3 个 client id:
   - **iOS**(bundle `com.hexastral.fate`)→ 得 `<id>.apps.googleusercontent.com`。其**反转形式** `com.googleusercontent.apps.<id>` 填入 `apps/fate-app/app.json` 插件的 `iosUrlScheme`(替换 `REPLACE_WITH_FATE_GOOGLE_IOS_REVERSED_CLIENT_ID`)。
   - **Web application** → 得 **webClientId**(签发 idToken 的 client;idToken 的 `aud` 即此值)。
   - **Android**(package `com.hexastral.fate` + 签名 SHA-1;EAS 托管 keystore 用 `eas credentials` 取 SHA-1)→ Android 原生登录需要;**无值传入 JS**。
2. **fate-app 客户端 env**(写 `apps/fate-app/.env.local`,gitignored;模板见 `.env.example`):
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` = 上面的 iOS client id
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = 上面的 Web client id
   - 两者留空 → 登录按钮自动降级为「不可用」,**不会**硬编码任何凭证。
3. **API 服务端 secret**(`apps/hexastral-api`):
   ```bash
   cd apps/hexastral-api
   bunx wrangler secret put GOOGLE_OAUTH_AUDIENCES   # 逗号分隔的可接受 aud 列表
   ```
   - **必须包含 webClientId**(idToken 的 aud)。如多端/多 app 共用后端,把各自的 web/iOS client id 都列进去。
   - 未设置时 `/api/portfolio/auth/google` 返回 **503**(拒绝信任任何 token)。
4. **装依赖 + 重建**:`bun install` → `cd apps/fate-app && bun prebuild`(写 iOS URL scheme)→ dev client / EAS build。**勿用 Expo Go 测 Google 登录。**

---

## 5. 可选 / 低优先

| 项 | 说明 |
|----|------|
| D1 全量 reset | ROADMAP §1.2 — **仅 pre-PMF 无用户时**;有数据则跳过 |
| CF 删除 `svc-fortune` 旧资源 | ROADMAP §1.3 |
| `packages/ui-native` 物理删除 | 已无 import,可 `rm -rf`（§6.5） |
| Portfolio memory 历史回填 | ROADMAP C.4 optional indexer |

---

## 6. 文档索引

| 文档 | 用途 |
|------|------|
| [ROADMAP.md](ROADMAP.md) | 阶段总览 + Active queue |
| [deploy.md](../deploy.md) | wrangler / EAS 部署顺序（注:其 services 列表漏了 svc-feng,以本文 Wave B 为准） |
| [setup/revenuecat-entitlements.md](setup/revenuecat-entitlements.md) | RC entitlement 配置 |
| [phase-f-designer-brief.md](phase-f-designer-brief.md) | 设计 brief（按 §0 现清单重新对齐 app 列表） |
| `apps/hexastral-api/src/config/products.ts` | **RevenueCat 产品唯一真相** |
