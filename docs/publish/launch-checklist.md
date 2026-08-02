# Launch checklist — Yuun + Yuel（可执行待办）

> **用途**：按本页勾选推进 **剩余人工 / 控制台** 工作。代码侧提审债已基本关完；阻塞几乎全是 Portal / ASC / RC / 密钥 / 截图 / 真机。  
> **提审顺序**（ADR-0019 / [ROADMAP](../ROADMAP.md)）：先 **Yuun** → 过审当天再提 **Yuel**。  
> **发行主体**：Apple Developer Program / App Store Connect 账号挂在 **UseONE, LLC** 下（Team ID `L9Z47DW56X`）。证书、ASC App、IAP、TestFlight、提审全部用这套 LLC 组织账号——不要用个人 Apple ID 当发行方。

Last updated: 2026-08-01.

---

## 怎么用这份文档

1. **自上而下勾选**；不要跳过「Paid Apps 协议」和 Bundle ID / Capability。
2. 每项格式：`做什么` → **入口**（控制台路径或 URL）→ **文案 / 数值从哪抄**（仓库文件链接）。
3. 细节逐步图以 ASC 指南 / Runbook 为准；本页是 **总控台**，避免在多个 checklist 间迷路。
4. 五 App 代码 readiness 总表：[README.md](./README.md) § Code readiness。
  未勾完的短清单：[yuel/human-residual.md](../apps/yuel/human-residual.md)。

### 文档地图（先认 SSOT，再动手）


| 要填什么                                                       | 去哪抄 / 跟哪份走                                                                                                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 永久 ID、类目、IAP 产品键                                           | [README.md](./README.md) §0 · 工程 SSOT `[products.ts](../../apps/hexastral-api/src/config/products.ts)`                                                                          |
| ASC 逐步点哪里（创建 App / IAP / 隐私 / 提审）                          | [asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md)                                                                                                                              |
| 密钥、EAS 占位、RC offering、部署顺序                                 | [yuun-yuel-launch-runbook.md](./yuun-yuel-launch-runbook.md)                                                                                                                    |
| RC entitlement / 产品挂接                                      | [revenuecat-entitlements.md](../setup/revenuecat-entitlements.md)                                                                                                               |
| **商店文案**（name / subtitle / keywords / description / promo） | Yuun: `[apps/auspice-app/aso-metadata.json](../../apps/auspice-app/aso-metadata.json)` · Yuel: `[apps/kindred-app/aso-metadata.json](../../apps/kindred-app/aso-metadata.json)` |
| 截图构图 + 叠加标题                                                | [screenshot-direction.md](./screenshot-direction.md)（与各 `aso-metadata.json` 的 `_screenshotDirection` 一致）                                                                        |
| 提审 Notes 模板                                                | 本文 § Reviewer notes · 扩展 [app-review-qa-checklist.md](./app-review-qa-checklist.md)                                                                                             |
| 真机冒烟                                                       | [yuun/pre-submit-smoke.md](../apps/yuun/pre-submit-smoke.md) · [yuel/pre-submit-smoke.md](../apps/yuel/pre-submit-smoke.md)                                                     |
| 单 App 补充说明                                                 | [yuun/launch.md](../apps/yuun/launch.md) · [yuel/launch.md](../apps/yuel/launch.md)                                                                                             |
| Widget/Watch 能否在 ASO 宣称                                    | [yuun/widget-watch-evidence.md](../apps/yuun/widget-watch-evidence.md) · [yuun/widget-watch-scope.md](../apps/yuun/widget-watch-scope.md)                                       |
| **EAS 打包 / 上传 / TestFlight 内部测试**                         | 本文 §5（Expo 54 + EAS Build → `eas submit` → Internal Testing → Submit for Review）                                                                                              |


**ASC 本地化字段 ↔ JSON key**


| App Store Connect 字段 | `aso-metadata.json` → `locales.<locale>.*` |
| -------------------- | ------------------------------------------ |
| Name                 | `title`                                    |
| Subtitle             | `subtitle`                                 |
| Keywords             | `keywords`                                 |
| Description          | `description`                              |
| Promotional Text     | `promotionalText`                          |


本地化：`en-US` · `zh-Hans` · `zh-Hant` · `ja`（四语都要贴）。粘贴前可跑（在对应 app 目录）：`node scripts/aso-charcount.mjs`（若存在）。

---



## 0. 开干前一次性检查

- [ ] **Paid Applications Agreement Active**  
  **入口**：[App Store Connect → Agreements, Tax, and Banking](https://appstoreconnect.apple.com/agreements)  
  **说明**：未 Active 时订阅会卡在 Missing Metadata。详见 [asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) §0。
- [ ] 角色够用：App Manager（ASC）+ Developer Portal 可改 Identifiers。  
  **入口**：[Users and Access](https://appstoreconnect.apple.com/access/users)

---



## 1. Apple Developer Portal

**总入口**：[Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list)

逐步字段表：[asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) §2 · 改名后核对：[post-bundle-rename-portal.md](./post-bundle-rename-portal.md)

### 1.1 App IDs + Capabilities

- [ ] **Yuun** App ID = `com.hexastral.yuun`  
  **入口**：Identifiers → `+` → App IDs  
  **勾选**：Sign In with Apple · App Groups（`group.com.hexastral.yuun`）· Push Notifications（建议）  
  **文案 / 值**：Description 可用 `Yuun (HexAstral almanac)` — [asc guide §2.1](./asc-yuun-yuel-guide.md)
- [ ] **Yuel** App ID = `com.hexastral.yuel`  
  **勾选**：Sign In with Apple · Push（建议）  
  **Associated Domains** 在 EAS/`app.json` 侧声明；Portal 无单独勾选项 — 域名见 [README.md](./README.md) §1
- [ ] Capability 变更后 **重新生成** provisioning（或交给 EAS 托管签名后再拉一次 profile）
- [ ] **Sandbox 测试账号**  
  **入口**：[Users and Access → Sandbox](https://appstoreconnect.apple.com/access/users) → Testers  
  **用途**：真机测 IAP；设备 **设置 → App Store → 沙盒账户** 登录（勿用正式 Apple ID 测买）

---



## 2. App Store Connect — 应用记录

**总入口**：[App Store Connect → Apps](https://appstoreconnect.apple.com/apps) → `+` → New App  
逐步：[asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) §3–§7


|                  | Yuun                 | Yuel                 |
| ---------------- | -------------------- | -------------------- |
| Bundle ID        | `com.hexastral.yuun` | `com.hexastral.yuel` |
| 商店名              | Yuun                 | Yuel                 |
| Primary Language | English (U.S.)       | English (U.S.)       |
| Primary category | **Reference**        | **Lifestyle**        |
| Secondary        | （可选 Education）       | Education            |
| SKU（内部）          | 自定，如 `yuun-ios`      | 自定，如 `yuel-ios`      |


- [ ] 创建 **Yuun** 记录（类目 Reference）
- [ ] 创建 **Yuel** 记录（类目 Lifestyle）
- [ ] **Content Rating → 12+**（两 App）  
  **入口**：App → App Information → Age Ratings / Content Rights  
  **问卷口径**：见 [asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) 分级节（无暴力/无赌博等）
- [ ] **定价**：Free + 含 IAP  
  **入口**：App → Monetization / Pricing and Availability
- [ ] 记下 Apple 分配的数字 **Apple ID（ascAppId）** → 稍后写入各 app `eas.json` → `submit.production.ios.ascAppId`  
  **入口**：App → App Information → Apple ID（数字串）  
  **文件**：`[apps/auspice-app/eas.json](../../apps/auspice-app/eas.json)` · `[apps/kindred-app/eas.json](../../apps/kindred-app/eas.json)`



### 2.1 商店本地化文案（四语）

**入口**：App → 左侧语言 / App Store 本地化 → 逐语言编辑  
**从哪粘贴**：


| App  | 文件                                                                                           |
| ---- | -------------------------------------------------------------------------------------------- |
| Yuun | `[apps/auspice-app/aso-metadata.json](../../apps/auspice-app/aso-metadata.json)` → `locales` |
| Yuel | `[apps/kindred-app/aso-metadata.json](../../apps/kindred-app/aso-metadata.json)` → `locales` |


- [ ] Yuun：en-US / zh-Hans / zh-Hant / ja 五字段贴齐（title…promotionalText）
- [ ] Yuel：同上  
- [ ] （可选）字数 / 与代码宣称一致性：Yuun `[aso-code-audit-matrix.md](../apps/yuun/aso-code-audit-matrix.md)`；有 script 则跑 `aso-charcount` / `aso-code-parity`



### 2.2 Privacy / Terms URL

**入口**：App → App Information → Privacy Policy URL（及版本页 / 法务链接处 Terms）  
**URL 表（按语言）**：[asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) §7.2  

示例（英文）：

- Yuun privacy：`https://yuun.hexastral.com/en/privacy/yuun` · terms：`https://yuun.hexastral.com/en/terms`
- Yuel privacy：`https://yuel.hexastral.com/en/privacy/yuel` · terms：`https://yuel.hexastral.com/en/terms`

- [ ] `curl -I` 各 URL 返回 **200**（需先部署 `[hexastral-web](../../apps/hexastral-web)`；部署需人工批准）
- [ ] ASC 字段已粘贴；App 内设置页链到同套 URL（代码已接 `privacyUrl` / `termsUrl`）



### 2.3 App Privacy（营养标签）

**入口**：App → **App Privacy** → Get Started / Edit  
**逐步勾选表**：[asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) §8  

口径摘要（两 App 相同骨架）：


| 数据类型                         | 用途                    | 关联用户？ | Tracking？ |
| ---------------------------- | --------------------- | ----- | --------- |
| Email（Apple/Google 登录）       | App 功能 / 客服 / Restore | Yes   | **No**    |
| Purchases                    | App 功能                | Yes   | No        |
| User Content（用户键入的生辰 / 亲友生日） | App 功能                | Yes   | No        |


- [ ] Yuun 营养标签 Publish
- [ ] Yuel 营养标签 Publish  
- [ ] **NSPrivacyTracking = false**；不做 ATT

---



## 3. IAP（ASC）→ RevenueCat

**产品键 SSOT**：`[products.ts](../../apps/hexastral-api/src/config/products.ts)`  
**ASC 操作**：[asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) §9  
**RC 挂接**：[revenuecat-entitlements.md](../setup/revenuecat-entitlements.md)

### 3.1 App Store Connect 产品

**入口**：App → **Monetization** → Subscriptions / In-App Purchases  


| App  | Product ID                | 类型         | 参考价       | Display Name 示例          |
| ---- | ------------------------- | ---------- | --------- | ------------------------ |
| Yuun | `auspice_pro_monthly`     | Auto-renew | $4.99/mo  | Yuun Pro Monthly         |
| Yuun | `auspice_pro_annual`      | Auto-renew | $39.99/yr | Yuun Pro Annual          |
| Yuel | `kindred_pro_monthly`     | Auto-renew | $7.99/mo  | Yuel Pro Monthly         |
| Yuel | `kindred_pro_annual`      | Auto-renew | $47.99/yr | Yuel Pro Annual          |
| Yuel | `hexastral_compatibility` | Consumable | $6.99     | Compatibility unlock（合盘） |


- [ ] 订阅组 Reference Name：`hexastral_universe`（两 App 订阅都进此组；消耗型不进组）
- [ ] Yuun 2 个订阅 Ready to Submit
- [ ] Yuel 2 个订阅 + 1 个消耗型 Ready to Submit
- [ ] **不要创建** `universe_pro_`*  
- [ ] IAP 本地化 Display Name / Description：可与各 app `aso-metadata.json` 定价段 + [revenuecat-entitlements.md](../setup/revenuecat-entitlements.md) § Yuel Pro 权益口径对齐（个人命书 / 流月 / 活层 / 月额度聊天 / 3 合盘·月；**不要写无限 AI**）



### 3.2 RevenueCat

**入口**：[RevenueCat Dashboard](https://app.revenuecat.com) → 对应 Project  


| 步骤           | 入口                                | 值 / 文档                                                                                            |
| ------------ | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| Entitlements | Project → Entitlements            | `auspice_pro` · `kindred_pro` — [RC doc §1 / §4.1](../setup/revenuecat-entitlements.md)           |
| Products     | Project → Products                | 导入上表 5 个 Product ID（ASC 先 Ready）                                                                  |
| Attach       | Entitlement → Attached products   | `auspice_pro` ← monthly/annual；`kindred_pro` ← monthly/annual；**兼容包不挂 entitlement**               |
| Offerings    | Project → Offerings               | `auspice_default` · `yuan_default` — [RC doc §4.4](../setup/revenuecat-entitlements.md)           |
| Webhook      | Project → Integrations → Webhooks | URL：`https://api.hexastral.com/webhooks/revenuecat` · Header：`Bearer <REVENUECAT_WEBHOOK_SECRET>` |
| SDK keys     | Project → API keys                | 复制 iOS `appl_*`（及如需 Android `goog_*`）                                                             |


- [ ] Entitlements + 5 products + 2 offerings 配齐
- [ ] Webhook 事件含：`INITIAL_PURCHASE` / `RENEWAL` / `CANCELLATION` / `EXPIRATION` / `NON_RENEWING_PURCHASE`
- [ ] **不要** 创建 `universe_pro`



### 3.3 Worker / EAS 密钥

命令与缺口表：[yuun-yuel-launch-runbook.md](./yuun-yuel-launch-runbook.md) §1–§4

- [ ] `cd apps/hexastral-api && bunx wrangler secret put REVENUECAT_WEBHOOK_SECRET`（与 RC webhook Bearer **同一值**）
- [ ] `bunx wrangler secret put REVENUECAT_API_KEY`（RC **Secret** REST key，非公开 `appl_`*）
- [ ] Yuun：`CYCLE_CALENDAR_SECRET`（Pro 个人 calendar）
- [ ] 确认 production vars：`ALLOW_DEV_PRO=0`
- [ ] EAS：两 App production 注入真实 `EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_…`（**勿**把 `REPLACE_WITH_`* 打进生产包）  
  **入口**：Expo dashboard → Project → Secrets，或 `eas secret:create`  
  **文件对照**：`[apps/auspice-app/eas.json](../../apps/auspice-app/eas.json)` · `[apps/kindred-app/eas.json](../../apps/kindred-app/eas.json)`
- [ ] 两 App `eas.json` 的 `submit.production.ios.ascAppId` 换成真实数字

---



## 4. Screenshots

**入口**：ASC → App → 版本页 → App Store 预览和截图（按设备尺寸 × 语言上传）  
**构图 / 叠加标题 SSOT**：[screenshot-direction.md](./screenshot-direction.md)  
**尺寸**：至少 **6.7"/6.9"** 与 **6.5"/5.5"** 档（见 screenshot-direction §0）；`supportsTablet: false` → 不传 iPad。

### Yuun（Reference）— 建议镜位

1. Hero — 今日干支 + 月相 + 宜忌
2. CalendarStrip + DayView
3. 今日文化 / 文化导览
4. PersonalCard（对你而言）— Pro 钩子
5. 节假日提醒 / 设置

**注意**：Widget / Watch 镜位 **仅** 在 [widget-watch-evidence.md](../apps/yuun/widget-watch-evidence.md) 过线后上传；否则从 ASO / 截图去掉相关宣称（见 [yuun/launch.md](../apps/yuun/launch.md)）。

### Yuel（Lifestyle）— 建议镜位

1. Bonds home（可含 Yuun carry-over 横幅）
2. Pair reading hero（合盘）
3. Bonds timeline
4. Solo-create / 邀请流
5. Subscribe / Paywall（展示 Pro + 可点到的合盘解锁路径）

Caption：一句短标题；文案表在 [screenshot-direction.md](./screenshot-direction.md)。

- [ ] Yuun 四语 × 所需尺寸上传完  
- [ ] Yuel 四语 × 所需尺寸上传完  

---



## 5. Expo 技术栈：本地开发 → EAS 生产包 → TestFlight → 提审

### 5.0 背景：LLC 账号 + 当前移动栈

| 项 | 值 |
|---|---|
| 法律实体 / 发行方 | **UseONE, LLC**（Apple Developer Program 组织账号） |
| Apple Team ID | `L9Z47DW56X`（已写在各 app `eas.json` → `submit.production.ios.appleTeamId`） |
| 登录入口 | [developer.apple.com/account](https://developer.apple.com/account) · [appstoreconnect.apple.com](https://appstoreconnect.apple.com) — 用 **被邀请进 LLC 团队** 的 Apple ID |
| 栈 | **Expo SDK 54** · RN 0.81 · Expo Router 6 · **EAS Build / Submit**（云端打 `.ipa`，不是日常靠本机 Xcode Archive 上架） |
| 包管理 | 仓库根 `bun install`；CLI 用 **`bunx eas-cli`** / app 目录下的 `eas`（**不要 `npx`**） |
| 配置 | Yuun [`apps/auspice-app/eas.json`](../../apps/auspice-app/eas.json) · Yuel [`apps/kindred-app/eas.json`](../../apps/kindred-app/eas.json) |
| Expo 云项目 | Yuun slug `auspice` · Yuel slug **`yuan`**（勿改回 `kindred`） |

**谁能操作**：Account Holder / Admin 可管协议与用户；App Manager 可建版本、TestFlight、提审。邀请同事进团队：  
**入口**：[ASC → Users and Access → People](https://appstoreconnect.apple.com/access/users) → **+** → 填邮箱 → 勾选 Apps 权限（至少挂上 Yuun / Yuel）。被邀人用自己的 Apple ID 接受邮件后，才出现在 Internal Testing 可选列表里。

**两种「编译」别混：**

| 目的 | 做法 | 产出 |
|---|---|---|
| 日常改 JS / 联调 | 本机 Metro + Dev Client | 不进商店 |
| **上架 / TestFlight / 审核** | **`eas build --profile production`**（Expo 云打包）→ **`eas submit`** | `.ipa` → ASC → TestFlight |

上架路径以 **EAS 云构建** 为准（与 monorepo / Widget 扩展一致）。本机 `expo run:ios` 只用于开发与冒烟，**不能**替代 production profile 的 store 包。

---

### 5.1 本机日常编译（开发 / 冒烟，不上架）

在仓库根已 `bun install` 的前提下：

```bash
# Yuun
cd apps/auspice-app
bun run prebuild          # 需要原生工程时；改 app.json / 原生模块后跑
bun run ios               # 模拟器
# 或真机：bun run ios:device

# Yuel
cd apps/kindred-app
bun run prebuild
bun run ios
```

开发热更：`bun run dev`（dev-client）。真机需用 **LLC 团队** 的开发证书 / 设备 UDID（首次可由 `eas build --profile development-device` 或 Xcode 自动管理）。

- [ ] 本机能起 Yuun / Yuel Dev Client（可选，不阻塞提审）

---

### 5.2 生产包：EAS Build（提审用）

**前置（未勾完不要打 production）：**

- [ ] §3：ASC IAP Ready + RC 挂接 + Worker secrets  
- [ ] `eas.json` 里 `ascAppId` 已换成真实数字  
- [ ] production 环境已注入真实 `EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_…`（EAS Secrets；勿留 `REPLACE_WITH_*`）  
- [ ] CLI 已登录 Expo：**`bunx eas-cli login`**，且账号能访问对应 Expo 项目  
- [ ] Apple 侧：`eas` 首次会要 Apple ID（**LLC 组织成员**）做凭证；推荐让 **EAS 托管** Distribution Cert + Provisioning（`bunx eas-cli credentials`）

**命令（在对应 app 目录执行）：**

```bash
# —— Yuun（先打）——
cd apps/auspice-app
AUSPICE_REQUIRE_PROD_KEYS=1 node scripts/assert-release-config.mjs   # 若脚本存在且要求 prod key
bunx eas-cli build --profile production --platform ios
# 浏览器打开 build 页等到 finished；记下 Build ID

# —— Yuel（可与 Yuun 并行打好包待命；Submit for Review 仍等 Yuun 过审）——
cd apps/kindred-app
bunx eas-cli build --profile production --platform ios
```

说明：

- `production` profile：`ios.autoIncrement: true`（build number 由 EAS / remote 递增）；marketing version 看各 app `app.json` `version`（Yuun `1.0.0` / Yuel `0.1.0`）。
- 云端编译约数十分钟；成功后产物在 [expo.dev](https://expo.dev) 该项目 Builds 列表。
- Yuun 含 Widget/Watch 扩展时：打开 archive 产物确认 targets 已嵌入，再对照 [widget-watch-evidence.md](../apps/yuun/widget-watch-evidence.md)。

- [ ] Yuun production iOS build **Finished**  
- [ ] Yuel production iOS build **Finished**

---

### 5.3 上传到 App Store Connect（`eas submit`）

把刚打好的 `.ipa` 交到 **LLC 的 ASC**（不是个人账号）：

```bash
cd apps/auspice-app   # 或 apps/kindred-app
bunx eas-cli submit --platform ios --profile production --latest
# 或：bunx eas-cli submit --platform ios --id <EAS_BUILD_ID>
```

`eas.json` → `submit.production.ios` 已含 `appleTeamId: L9Z47DW56X`；`ascAppId` 必须是该 App 在 ASC 的数字 Apple ID。  
首次可能提示 Apple 登录 / App Store Connect API Key；用 **有 App Manager 权限的 LLC 成员** 完成授权。

上传后：

1. **入口**：[App Store Connect → Apps →（Yuun/Yuel）→ TestFlight](https://appstoreconnect.apple.com/apps)  
2. 等 **Processing**（通常 10–30 分钟）→ 状态变为 **Ready to Test**  
3. 若弹出 **Export Compliance**：与 `app.json` 一致选 **No**（仅标准加密 / HTTPS；`ITSAppUsesNonExemptEncryption: false`）— 见 [asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) §10.1

- [ ] Yuun build 出现在 TestFlight 且 Ready to Test  
- [ ] Yuel build 出现在 TestFlight 且 Ready to Test  

**备选**：EAS 网页 Build → **Submit to App Store**；或本机下载 `.ipa` 后用 Transporter 上传（仍须签 LLC Distribution）。日常优先 `eas submit`。

---

### 5.4 TestFlight — 添加内部测试用户（Internal Testing）

内部测试 **不需要** Beta App Review；适合 LLC 同事 / 自己在真机冒烟。

**规则（Apple）：**

- Internal tester **必须先是** App Store Connect 上该 LLC 团队的 **Users**（角色如 Admin / App Manager / Developer / Marketing 等）。  
- 纯外部邮箱、未进 ASC 的人 → 走 **External Testing**（要 Beta Review，本清单不优先）。  
- 同一 Apple ID 在设备上打开 **TestFlight** App，接受邀请后安装。

**步骤 A — 把人加进 LLC 的 ASC（若还没有）：**

1. **入口**：[Users and Access → People](https://appstoreconnect.apple.com/access/users) → **+**  
2. 填对方 Apple ID 邮箱；选角色（内测够用：**Developer** 或 **App Manager**）  
3. **Apps** 权限勾选 Yuun / Yuel（或 All Apps）  
4. 对方收邮件 → 用该 Apple ID 接受邀请  

**步骤 B — 挂到 Internal 组并选 Build：**

1. **入口**：ASC → 你的 App → **TestFlight** → 左侧 **Internal Testing**  
2. 用默认 **App Store Connect Users** 组，或 **+** 新建 Internal Group（如 `Yuun core`）  
3. **Testers** → **+** → 勾选已在 People 里的同事  
4. **Builds** → **+** → 选刚 Ready to Test 的 production build  
5. 保存；测试员设备打开 **TestFlight** → 应看到 App → Install  

**步骤 C — 设备侧：**

- 测试员用 **同一 Apple ID**（受邀那个）登录 iPhone 的 Media & Purchases / TestFlight  
- IAP 沙盒：设备 **设置 → App Store → 沙盒账户** 使用 [Sandbox Tester](https://appstoreconnect.apple.com/access/users)（与 Internal 登录可分开）；见 [asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) 沙盒节  

- [ ] 自己 / 核心同事已进 ASC People（LLC）  
- [ ] Internal Testing 组已加 tester + 已绑当前 build  
- [ ] 至少一台真机从 TestFlight 装上 Yuun（及 Yuel）并能打开  

官方参考：[TestFlight 内部测试（Apple）](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers)。

---

### 5.5 真机冒烟（Submit 前必过）

优先用 **TestFlight production 包**（与审核同一二进制），不要只靠 Dev Client。


| App  | 清单                                                                                                              |
| ---- | --------------------------------------------------------------------------------------------------------------- |
| Yuun | [pre-submit-smoke.md](../apps/yuun/pre-submit-smoke.md)                                                         |
| Yuel | [pre-submit-smoke.md](../apps/yuel/pre-submit-smoke.md)（含 Invite UL、Pro 月额度合盘、单次解锁回落、carry-over、Delete Account） |


- [ ] Yuun smoke 全绿（或明确记录豁免）  
- [ ] Yuel smoke 全绿  

---

### 5.6 选 Build → 填审核信息 → Submit for Review

**入口**：ASC → App → **iOS App** 版本页（Prepare for Submission）→ **Build** 旁 **+** → 选 TestFlight 里已处理完的那条  

版本字段口径：[asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) §10.3（Copyright：`© 2026 UseONE, LLC`）。

**App Review Information** 文案（可按 app 删减）；扩展：[app-review-qa-checklist.md](./app-review-qa-checklist.md)

```
Test account: (none required — anonymous-first)
To exercise Pro: tap any "Pro" element → "Sign in with Apple/Google" → restore purchases works for re-review.
Publisher: UseONE, LLC.

Yuun (黄历):
- Daily Chinese almanac (干支 / 宜忌 / 节气) — deterministic, no fortune-telling, no health claims.
- Sign-in only at the subscribe step (not gating the daily content).
- Holiday reminders follow published State Council schedules where enabled; product default may keep holiday push off.

Yuel (relationships / 合盘):
- Relationship analysis using 八字 (Bazi) — entertainment / cultural reference.
- Sign-in required to record bonds (each is stored under the user's identity).
- No matchmaking / dating features.
- Daily relationship nudge (~10:00 local) is optional; not a personal almanac morning push.
- Pro includes monthly AI chat allowance and up to 3 synastry unlocks per month; one-time unlock product hexastral_compatibility remains available.
```

- [ ] Yuun 版本：Build 选中 · Notes / Contact 填齐 · **Submit for Review**  
- [ ] **等 Yuun Approved**  
- [ ] 同日：Yuel **Submit for Review**（勿与 Yuun 同时塞进队列）

---



## 6. Submission order（总序）

1. **Yuun** — Reference，确定性工具
2. **Yuel** — Lifestyle；Yuun 过审同日提
3. **Kanyu** — 等 prose P0：[feng/report-quality-plan.md](../apps/feng/report-quality-plan.md)
4. **Yaul** — [coincast/README.md](../apps/coincast/README.md) § Readiness（现 **未就绪**）
5. **Syel** — 波次后；可并行准备控制台

---



## 7. Post-submission

- [ ] 盯 Crash / TestFlight feedback  
- [ ] RC webhook 投递日志（Integrations → Webhooks → deliveries）与 Worker 日志  
- [ ] **不要** 开 `universe_pro`，直到 3+ App 稳定在线  

---



## 快速对照：还剩什么通常卡在这


| 症状                   | 先查                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------- |
| Paywall 不能买 / 静默降级   | production 是否仍是 `REPLACE_WITH_*` RC key — [runbook §1.1](./yuun-yuel-launch-runbook.md) |
| `eas submit` 找不到 App | `ascAppId` 仍是占位；确认登录的是 **LLC** ASC 而非个人团队                                         |
| 证书 / 签名失败            | `bunx eas-cli credentials`；Team 须为 `L9Z47DW56X`（UseONE, LLC）                           |
| TestFlight 看不到邀请     | 对方是否已在 ASC **People**（Internal 不能只填外部邮箱）— 本文 §5.4                                    |
| Build 一直 Processing  | ASC → TestFlight 等 10–30min；查邮件 Compliance / Missing Compliance                        |
| 订阅 Missing Metadata  | Paid Apps 协议 / 缺本地化 / 缺价格                                                               |
| 隐私链接 404             | 未部署 `hexastral-web` 或 URL 段写错 — [asc §7.2](./asc-yuun-yuel-guide.md)                    |
| ASO 写了 Widget 但包里没有  | [widget-watch-evidence.md](../apps/yuun/widget-watch-evidence.md) → 删宣称或补证据             |


