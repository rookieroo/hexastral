# Yuun + Yuel App Store 上架 Runbook

> **用途**：把「还缺什么」一次性列清——环境变量、控制台手工配置、部署顺序、提审前验收。  
> **代码侧**：功能已基本就绪；阻塞项几乎全是 **密钥 / ASC / RevenueCat / EAS** 未填实。  
> **提审顺序**（ADR-0019）：先 **Yuun**（Reference，风险低）→ 过审当天再提 **Yuel**（Lifestyle）。

最后更新：2026-07-11。相关文档：

- [publish/README.md](./README.md) — 总览
- [publish/asc-yuun-yuel-guide.md](./publish/asc-yuun-yuel-guide.md) — ASC 创建应用逐步指南
- [setup/revenuecat-entitlements.md](../setup/revenuecat-entitlements.md) — IAP 产品 ID 权威表
- [apps/yuun/launch.md](../apps/yuun/launch.md) · [apps/yuel/launch.md](../apps/yuel/launch.md) — 各 app 细节
- IAP SSOT：`apps/hexastral-api/src/config/products.ts`

---

## 0. 永久标识（填错无法改）

| | **Yuun** | **Yuel** |
|---|---|---|
| 目录 | `apps/auspice-app` | `apps/kindred-app` |
| 商店显示名 | Yuun | Yuel |
| Bundle ID | `com.hexastral.yuun` | `com.hexastral.yuel` |
| 内部代号（勿对用户暴露） | auspice | kindred |
| RC Entitlement | `auspice_pro` | `kindred_pro` |
| 主类目 | Reference | Lifestyle |
| 品牌站 | `yuun.hexastral.com` | `yuel.hexastral.com` |
| Apple Team ID | `L9Z47DW56X` | `L9Z47DW56X` |
| EAS `projectId` | `269d6ab5-6462-4f8e-ad6d-69a526dcb91e`（`@useone-tech/auspice`） | `95b2e753-aeba-421c-9c87-08557d4257fa`（已存在） |

**MVP 不要创建**：`universe_pro` / `universe_pro_*` 产品及 offering（Phase 2 再上）。

---

## 1. 当前缺口总览（仓库状态 2026-07-11）

### 1.1 移动端 `eas.json` 仍为占位符

| 变量 / 字段 | Yuun (`auspice-app`) | Yuel (`kindred-app`) |
|---|---|---|
| EAS `projectId` | ✅ `269d6ab5-6462-4f8e-ad6d-69a526dcb91e` | ✅ `95b2e753-aeba-421c-9c87-08557d4257fa` |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | ❌ dev/preview 占位；**production profile 未配置 RC key** | ❌ dev/preview 占位；**production 未配置 RC key** |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | ❌ 同上（仅 Android 上架时需要） | ❌ 同上 |
| `submit.production.ios.ascAppId` | ❌ `REPLACE_WITH_ASC_APP_ID` | ❌ `REPLACE_WITH_ASC_APP_ID` |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | dev/preview 已写死 Google client；production 有 | Yuel **未配置** Google（见 §4.2） |

> Production 构建若不带 `appl_*` RC key，Paywall 会静默降级（`REPLACE_*` 检测），**无法真实购买**。

### 1.2 后端 Worker secrets（Yuun 特有 + 共用）

| Secret / Var | Worker | 用途 | Yuun | Yuel |
|---|---|---|---|---|
| `INTERNAL_KEY` | hexastral-api, svc-notify, svc-fortune | 服务间鉴权 | ✅ 需要 | ✅ 需要 |
| `REVENUECAT_WEBHOOK_SECRET` | hexastral-api | RC webhook Bearer | ✅ | ✅ |
| `REVENUECAT_API_KEY` | hexastral-api | 服务端查 entitlement（Yuun Pro 日历签名、reconcile） | ✅ **必须** | 建议（reconcile） |
| `CYCLE_CALENDAR_SECRET` | hexastral-api | Yuun Pro 个人 `webcal://` 签名 | ✅ **必须** | — |
| `GOOGLE_OAUTH_AUDIENCES` | hexastral-api **var** | Yuun Google 登录 JWT `aud` 白名单 | ✅ 若开 Google | 若开 Google |
| `GEMINI_API_KEY` | svc-astro | AI 解读（timeline / 命书 / 合盘 chat） | ✅ | ✅ |
| AWS SES keys | svc-mailer | Yuel 邀请邮件 | — | ✅ 若测 invite |
| `TURNSTILE_SECRET` | hexastral-api | Web 表单 | — | — |

生成示例：

```bash
openssl rand -hex 32   # INTERNAL_KEY, CYCLE_CALENDAR_SECRET, REVENUECAT_WEBHOOK_SECRET
```

写入生产：

```bash
cd apps/hexastral-api
bunx wrangler secret put INTERNAL_KEY
bunx wrangler secret put REVENUECAT_WEBHOOK_SECRET
bunx wrangler secret put REVENUECAT_API_KEY          # RC 控制台 → API Keys → secret key (sk_…)
bunx wrangler secret put CYCLE_CALENDAR_SECRET       # Yuun Pro 日历；仅 Yuun 需要

# Google（Yuun 已集成 Google Sign-In 插件；逗号分隔多个 client id）
bunx wrangler secret put GOOGLE_OAUTH_AUDIENCES
# 例：443209724807-xxx.apps.googleusercontent.com,443209724807-yyy.apps.googleusercontent.com
```

`GOOGLE_OAUTH_AUDIENCES` 也可写在 `wrangler.jsonc` 的 `vars`（非密钥），须与 App 内 `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` 一致。

### 1.3 控制台尚未创建（人工）

- [ ] Apple App ID ×2（见 §2）
- [ ] App Store Connect 应用记录 ×2（见 §3）
- [ ] ASC 订阅 / 消耗型 IAP 产品（见 §3.3）
- [ ] RevenueCat entitlements + products + offerings + webhook（见 §4）
- [ ] Sandbox 测试账号
- [ ] 截图 × 4 locale × 每 app 5–7 张
- [ ] `hexastral-web` 生产部署（法律页 URL 必须 200）

---

## 2. Apple Developer Portal（两个 app 各做一遍）

### 2.1 注册 App ID

| Bundle ID | Capabilities |
|---|---|
| `com.hexastral.yuun` | Sign in with Apple；**App Groups** → `group.com.hexastral.yuun`（`app.json` 已声明，Widget 后续也会用） |
| `com.hexastral.yuel` | Sign in with Apple |

> 旧文档里的 `com.hexastral.cycle` / `group.com.hexastral.cycle` 已废弃，以 `app.json` 为准。

### 2.2 Associated Domains（与 `app.json` 一致）

- **Yuun**：`applinks:hexastral.com`, `applinks:www.hexastral.com`, `applinks:yuun.hexastral.com`
- **Yuel**：`applinks:hexastral.com`, `applinks:www.hexastral.com`, `applinks:yuel.hexastral.com`

### 2.3 其他

- [ ] 能力变更后 **重新生成** Provisioning Profile
- [ ] 创建 **Sandbox Tester**（Users and Access → Sandbox）
- [ ] EAS：`eas credentials` 或首次 `eas build` 时让 EAS 管理证书

---

## 3. App Store Connect

> **逐步操作（权限、表单字段、截图、提审）**：[asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md)

### 3.1 创建应用

对每个 bundle：

- [ ] **Primary Language = English (en-US)**（未本地化商店回退英文）
- [ ] 类目：Yuun → Reference；Yuel → Lifestyle（副类见 `aso-metadata.json`）
- [ ] 内容分级：Yuun 4+；Yuel 12+
- [ ] 定价：免费 + IAP
- [ ] 记录 Apple 分配的 **Apple ID（数字）** → 填入 `eas.json` → `submit.production.ios.ascAppId`

### 3.2 商店文案（4 语言）

从仓库复制，不要手打：

- Yuun：`apps/auspice-app/aso-metadata.json`
- Yuel：`apps/kindred-app/aso-metadata.json`

提交前跑字数校验：

```bash
node scripts/aso-charcount.mjs apps/auspice-app/aso-metadata.json apps/kindred-app/aso-metadata.json
```

### 3.3 IAP 产品（App Store Connect → Monetization）

**订阅组**：创建一个组名如 `hexastral_universe`，下面放所有 **订阅**（消耗型不进组）。

| Product ID | App | 类型 | 参考价 |
|---|---|---|---|
| `auspice_pro_monthly` | Yuun | 自动续订 | $4.99/月（与 aso 文案一致，ASC 再确认） |
| `auspice_pro_annual` | Yuun | 自动续订 | $39.99/年 |
| `kindred_pro_monthly` | Yuel | 自动续订 | $7.99/月 |
| `kindred_pro_annual` | Yuel | 自动续订 | $47.99/年 |
| `hexastral_compatibility` | Yuel | **消耗型**（单次合盘解锁） | $6.99 |

每个产品：en / zh-Hans / zh-Hant / ja 显示名 + 描述。

### 3.4 隐私与法律 URL（ASC 必填）

部署 `hexastral-web` 后，用浏览器确认 **200**：

| App | Privacy | Terms |
|---|---|---|
| Yuun | `https://yuun.hexastral.com/en/privacy/yuun`（zh→`/zh/...`，tw→`/tw/...`，ja→`/ja/...`） | `https://yuun.hexastral.com/en/terms` |
| Yuel | `https://yuel.hexastral.com/en/privacy/yuel` | `https://yuel.hexastral.com/en/terms` |

App 内 Settings 链接与 ASC 字段保持一致。

### 3.5 Privacy Nutrition Labels（两 app 相同口径）

- **Tracking**：无
- **收集**：登录时 Apple/Google 邮箱；购买记录（RevenueCat）
- **Yuel 额外**：用户手输的生辰 / 伴侣生辰（非通讯录抓取）
- **不要勾选**「跨 app 关联数据」——MVP 未售 Universe Pro，`crossAppMemory` 默认关闭

### 3.6 Review Information（审核备注模板）

```
Test account: 不需要 — 匿名即可用免费功能。
测 Pro：点任意 Pro 入口 → Sign in with Apple → 沙盒账号购买；Restore purchases 可用。

Yuun：中华黄历工具，宜忌/干支为确定性文化参考，非预测、非医疗建议。登录仅在订阅步骤。

Yuel：八字关系类型分析（文化研习框架），非约会/配对应用。邀请链接为私密双人合盘。
```

---

## 4. RevenueCat Dashboard

详见 [revenuecat-entitlements.md](../setup/revenuecat-entitlements.md)。MVP 只做下表：

### 4.1 Entitlements（Identifier 必须精确匹配）

| Identifier | Display name |
|---|---|
| `auspice_pro` | Yuun Pro |
| `kindred_pro` | Yuel Pro |

### 4.2 Products → 挂到 Entitlement

| Entitlement | Products |
|---|---|
| `auspice_pro` | `auspice_pro_monthly`, `auspice_pro_annual` |
| `kindred_pro` | `kindred_pro_monthly`, `kindred_pro_annual` |

`hexastral_compatibility`：**不挂 entitlement**（webhook 按 bond 单次解锁）。

### 4.3 Offerings（设为各 app 的 Current）

| Offering ID | Packages |
|---|---|
| `auspice_default` | monthly → `auspice_pro_monthly`；annual → `auspice_pro_annual` |
| `yuan_default` | monthly → `kindred_pro_monthly`；annual → `kindred_pro_annual` |

### 4.4 Webhook

- URL：`https://api.hexastral.com/webhooks/revenuecat`
- Authorization：`Bearer <REVENUECAT_WEBHOOK_SECRET 相同值>`
- 事件：`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `NON_RENEWING_PURCHASE`

### 4.5 SDK Keys → 写入 EAS

| 环境 | Key 类型 | 写入位置 |
|---|---|---|
| 沙盒 / TestFlight 内测 | `test_*` 或 sandbox `appl_*` | `eas.json` development / preview |
| App Store 正式包 | `appl_*`（public SDK key） | `eas.json` **production** |

```bash
# 示例：在 kindred-app 目录
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxxx --type string
# 或直接编辑 eas.json production.env（与团队习惯一致即可）
```

---

## 5. 移动端环境变量完整表

### 5.1 Yuun — `apps/auspice-app`

| 变量 | production 必须？ | 说明 |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ | `https://api.hexastral.com`（已默认） |
| `EXPO_PUBLIC_ENV` | ✅ | `production` |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | ✅ | `eas init` 后 UUID |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | ✅ | `appl_*` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | 仅 Android | `goog_*` |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | 若启用 Google 登录 | 与 Google Cloud OAuth iOS client 一致 |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Android Google | 已写在 dev/preview |

本地开发可复制：

```bash
cd apps/auspice-app
cp .env.example .env   # 若存在；否则参照 eas.json development.env
```

Sign-in 路径：**portfolio auth**（`POST /api/portfolio/auth/apple`，`target_app=auspice`），不是旧的 `apple-link`。

### 5.2 Yuel — `apps/kindred-app`

| 变量 | production 必须？ | 说明 |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ | `https://api.hexastral.com` |
| `EXPO_PUBLIC_ENV` | ✅ | `production` |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | ✅ | `95b2e753-aeba-421c-9c87-08557d4257fa` |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | ✅ | `appl_*` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | 仅 Android | `goog_*` |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | 可选 | SignInSheet 支持 Google，但 **kindred `package.json` 未声明 `@react-native-google-signin/google-signin`**；MVP 可 **仅 Apple** |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | 可选 | 同上 |

Sign-in 路径：`POST /api/onboarding/apple-link`（aud = `com.hexastral.yuel`）。

---

## 6. 后端部署顺序（提审前必须完成）

```bash
# 0. 预检
bun typecheck && bun test

# 1. 内部服务（各自目录 bun deploy）
cd services/svc-astro && bun deploy      # AI 解读 — 确认 GEMINI_API_KEY 已 secret put
cd services/svc-notify && bun deploy     # 推送 — INTERNAL_KEY 与 API 一致
cd services/svc-mailer && bun deploy     # Yuel 邀请邮件（可选但建议）
cd services/svc-geocode && bun deploy
cd services/svc-signal && bun deploy
cd services/svc-admin-notify && bun deploy
cd services/svc-tail && bun deploy

# 2. API + D1（会应用所有未执行的 migration，不只 0012）
cd apps/hexastral-api
bun db:migrate:prod    # 人工看一眼 drizzle 生成的 SQL
bun deploy

# 3. Web（法律页 + 品牌站）
cd apps/hexastral-web && bun deploy
```

### 6.1 Yuun 专属：Timeline 深读 + 推送（代码已完成，需 prod 验证）

- [ ] Migration 含 `timeline_readings`、`auspice_push_subs.timeline_remind_on`
- [ ] 部署顺序：`svc-astro` → `hexastral-api` → `svc-notify`
- [ ] 真机验收（Pro + 生辰 + 流月提醒开关）：深读生成、落库、晚间 push、每月 1 号节点 push 不重复

### 6.2 生产环境自检命令

```bash
# Webhook 可达（应 401/405 而非 5xx）
curl -sI https://api.hexastral.com/webhooks/revenuecat | head -5

# 法律页 200
curl -sI https://yuun.hexastral.com/en/privacy/yuun | head -3
curl -sI https://yuel.hexastral.com/en/privacy/yuel | head -3
```

---

## 7. 构建、沙盒验收、提审

### 7.1 Yuun 构建与提交

> EAS 项目已创建（`@useone-tech/auspice`）。仍需填 `ascAppId` 与 production RC key。ASC 逐步操作见 [asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md)。

```bash
cd apps/auspice-app
# 填 eas.json：submit.production.ios.ascAppId + production EXPO_PUBLIC_REVENUECAT_IOS_KEY
eas build --profile production --platform ios
eas submit --platform ios
```

### 7.2 Yuel

```bash
cd apps/kindred-app
# 先填 production RC keys + ascAppId
eas build --profile production --platform ios
eas submit --platform ios
```

### 7.3 沙盒购买验收（每 app 各做一遍）

1. 设备退出正式 Apple ID；在 Paywall 用 **Sandbox 账号**登录
2. 买 `auspice_pro_monthly` / `kindred_pro_monthly`
3. RevenueCat → Customers 见 active entitlement
4. `POST /webhooks/revenuecat` 日志 200；D1 `user_entitlements` 有行
5. Yuel：买 `hexastral_compatibility` → 指定 bond 解锁（无 entitlement 行）
6. Yuun：Pro 个人日历 `webcal://` 可订阅（非 403/503）
7. **跨 app**：Yuun 登录 → 录一名完整亲友 → Kindred 同账号登录 → bond 出现

### 7.4 提审顺序

1. **Yuun** 先提 → 等 **Approved**
2. **同一天** 再提 **Yuel**（避免新 publisher 双 app 同时审）

---

## 8. 截图与合规（人工）

- 尺寸：6.7" 必做；5.5" 仍要求；iPad 仅当声明 iPad 支持
- 脚本：`docs/publish/screenshot-direction.md` + 各 app `aso-metadata.json` 内 `_screenshotDirection`
- 提审前：`docs/publish/app-review-qa-checklist.md`

---

## 9. MVP 故意不做（避免扩审核面）

| 项 | 说明 |
|---|---|
| `universe_pro_*` | 代码有，控制台 **不要建** |
| Yuun Widget / watchOS | 脚手架在仓内，**六月版不上**
| Yuel Google 登录 | 可 MVP 仅 Apple；要上则补 native 依赖 + `GOOGLE_OAUTH_AUDIENCES` |
| `hexastral_personal` $4.99 单次命书 | 客户端已 null-guard，ASC **不要建** |
| `ALLOW_DEV_PRO=1`（API var） | 生产建议提审前改为 `0` 或移除，避免 Feng 相关 dev bypass 误开 |

---

## 10. 建议执行顺序（Checklist）

按天可落地的最小路径：

```
Day 1 — Apple + ASC 壳子
  □ Developer Portal：两个 App ID + capabilities + sandbox tester
  □ ASC：按 asc-yuun-yuel-guide.md 创建两个 app、隐私标签、IAP、4 语言 aso-metadata

Day 2 — RevenueCat + API secrets
  □ RC：2 entitlements、5 products、2 offerings、webhook
  □ wrangler secret：INTERNAL_KEY, REVENUECAT_*, CYCLE_CALENDAR_SECRET, GOOGLE_OAUTH_AUDIENCES
  □ svc-astro GEMINI_KEY；svc-mailer SES（Yuel invite）

Day 3 — Deploy + legal 200
  □ services/* + hexastral-api migrate:prod + deploy
  □ hexastral-web deploy → curl 法律页

Day 4 — EAS + 沙盒
  □ auspice：填 RC production keys + ascAppId（EAS project 已就绪）
  □ kindred 填 RC production keys + ascAppId
  □ eas build production → TestFlight → 沙盒购买全链路

Day 5 — 截图 + 提审 Yuun
  □ 截图 4 locale
  □ Submit Yuun → 等审

Day 6+ — Yuun 过审后同日 Submit Yuel
```

---

## 11. 仍开放的代码/产品债（不挡提审但建议知悉）

- Yuun onboarding 入口体验（`apps/yuun/launch.md` § Polish）
- Yuun 部分非 zh locale 硬编码中文标签
- Yuel 从 Yuun 转入 bond 语言写死 `zh-CN`（数据层，一般不挡审）
- `scripts/sync-eas-env.mjs` **未包含** `auspice-app` / `kindred-app`（需手改 `eas.json`）
- `wrangler.jsonc` 中 `ALLOW_DEV_PRO: "1"` — 提审前评估是否关闭

---

**完成定义**：两个 app 在 TestFlight 上可沙盒订阅/恢复购买；法律 URL 生产 200；Yuun Pro 日历与 timeline 在 prod 可用；Yuel 合盘单次购买可解锁 bond；按序过审上架。
