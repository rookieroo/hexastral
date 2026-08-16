# Yuun + Yuel — 上架总清单（按顺序勾选）

> **只读这一份。** 外链 = 控制台网页；仓库路径仅作「从哪复制文案」的提示，不再跳其它文档。  
> **发行**：UseONE, LLC · Team ID `L9Z47DW56X`（证书 / ASC / IAP / TestFlight / 提审全用 LLC，不用个人发行方）。  
> **提审顺序**：先 **Yuun** → **Approved 当天**再提 **Yuel**（勿同日同时塞进审核队列）。  
> **版本**：商店 `1.0`（见各 app `aso-metadata.json` / `app.json`）。

Last updated: 2026-08-02.

---

## 控制台入口

| 用途 | 打开 |
|---|---|
| App Store Connect | https://appstoreconnect.apple.com |
| 协议 / 税 / 银行 | https://appstoreconnect.apple.com/agreements |
| 用户 / 角色 / 沙盒测试员 | https://appstoreconnect.apple.com/access/users |
| Apps 列表 | https://appstoreconnect.apple.com/apps |
| Apple Developer Identifiers | https://developer.apple.com/account/resources/identifiers/list |
| Apple Developer Keys（Push 等） | https://developer.apple.com/account/resources/authkeys/list |
| RevenueCat | https://app.revenuecat.com |
| Expo / EAS | https://expo.dev |
| Cloudflare Dashboard | https://dash.cloudflare.com |

---

## MVP 对照（与代码一致，填表时别跑偏）

| | Yuun · `apps/auspice-app` · Bundle `com.hexastral.yuun` | Yuel · `apps/kindred-app` · Bundle `com.hexastral.yuel` |
|---|---|---|
| 商店类目 | Primary **Reference** · Secondary **Lifestyle** | Primary **Lifestyle** · Secondary **Education** |
| 分级 | **12+** | **12+** |
| 订阅 Product ID | `auspice_pro_monthly` · `auspice_pro_annual` | `kindred_pro_monthly` · `kindred_pro_annual` |
| RC Entitlement | `auspice_pro` | `kindred_pro` |
| 消耗型 Product ID | 无 | `hexastral_compatibility`（**不**挂 entitlement） |
| RC Offering（设为 Current） | `auspice_default` | `yuan_default` |
| 参考价 | $4.99/mo · $39.99/yr | $7.99/mo · $47.99/yr · 合盘 $6.99 |
| 登录 | 黄历可匿名；**订阅时** Sign in with Apple/Google | 记 bond 需登录；Paywall 同 |
| Support / Marketing | `https://useone.tech` · `https://yuun.hexastral.com` | `https://useone.tech` · `https://yuel.hexastral.com` |
| Privacy（en） | `https://yuun.hexastral.com/privacy/yuun` | `https://yuel.hexastral.com/privacy/yuel` |
| Terms（en） | `https://yuun.hexastral.com/terms` | `https://yuel.hexastral.com/terms` |
| Copyright | `© 2026 UseONE, LLC` | 同左 |
| iPad / App Clip / iMessage | **无**（`supportsTablet: false`） | **无** |
| 加密问卷 | `ITSAppUsesNonExemptEncryption: false` → 选 **No** | 同左 |

**商店显示名**可用 Yuun Pro / Yuel Pro；**Product ID 必须用上表工程名**（客户端与 webhook 字面匹配）。  
**MVP 禁止创建**：`universe_pro_*`、`hexastral_personal`、把 ID 改成 `yuel_*` / `yuun_*`、App 内广告 SDK、自建家庭席位 SKU。

---

## 0. 开干前（一次）

> **No-IAP 先发**（当前策略，`EXPO_PUBLIC_IAP_ENABLED=false`）：§0 的 Paid Agreements /
> 税务银行、以及整个 §8（订阅/IAP/RC/密钥）**全部跳过**——免费无 IAP 的 App 不需要
> 收款协议。银行就绪后，用「新版本 + 订阅」一次补齐 §8 再提交。§7 隐私/法务、§6 文案、
> §9-§12 冒烟提审对 no-IAP 版本照常执行。

1. 打开 https://appstoreconnect.apple.com/agreements  
   - [ ] **Paid Applications Agreement** = Active（仅 IAP 版本需要；no-IAP 跳过）  
   - [ ] 税务 / 银行信息完整（仅 IAP 版本需要）  
2. 打开 https://appstoreconnect.apple.com/access/users  
   - [ ] 本人角色 ≥ **App Manager**（隐私 / IAP / 提审）  
   - [ ] 需要内测的同事已邀请进 LLC 团队（Internal Testing 只能加 ASC Users）
3. 确认登录的是 **LLC 组织**，不是个人 Team。

---

## 1. Apple Developer — App ID 与能力

入口：https://developer.apple.com/account/resources/identifiers/list → **+** → App IDs → App

### 1.1 Yuun

- [ ] Bundle ID：`com.hexastral.yuun`（Explicit）  
- [ ] Description：如 `Yuun (HexAstral almanac)`  
- [ ] Capabilities 勾选并配置：  
  - [ ] **Sign In with Apple** → Enable as Primary App ID  
  - [ ] **Push Notifications**  
  - [ ] **App Groups** → `group.com.hexastral.yuun`（Widget / 扩展共用；没有组先 Create）  
  - [ ]（若用）Associated Domains — 也可仅在 Expo `app.json` 声明，与 Portal 一致即可  

### 1.2 Yuel

- [ ] Bundle ID：`com.hexastral.yuel`  
- [ ] Description：如 `Yuel (HexAstral synastry)`  
- [ ] Capabilities：  
  - [ ] **Sign In with Apple** → Primary  
  - [ ] **Push Notifications**  
  - [ ] Associated Domains 与 `app.json` 一致（含 `yuel.hexastral.com` 等 applinks）

### 1.3 签名与沙盒

- [ ] Capability 变更后：EAS 托管签名再拉一次 profile，或本机重新生成 provisioning  
- [ ] https://appstoreconnect.apple.com/access/users → **Sandbox** → 至少一个 Tester  
  真机测买：**设置 → App Store → 沙盒账户**（勿用正式 Apple ID）

Push 若走 APNs Key：https://developer.apple.com/account/resources/authkeys/list（按现有推送方案配置；与 Expo / 服务端一致即可）。

---

## 2. ASC — 新建两个 App 记录

入口：https://appstoreconnect.apple.com/apps → **+** → **New App**（各做一次）

| 字段 | Yuun | Yuel |
|---|---|---|
| Platforms | ☑ **iOS** | ☑ **iOS** |
| Name（Connect 内部名） | `Yuun` | `Yuel` |
| Primary Language | **English (U.S.)** | **English (U.S.)** |
| Bundle ID | `com.hexastral.yuun` | `com.hexastral.yuel` |
| SKU（创建后不可改） | 如 `yuun-ios-2026` | 如 `yuel-ios-2026` |
| User Access | Full Access（或按团队） | 同左 |

- [ ] Yuun 创建成功  
- [ ] Yuel 创建成功  
- [ ] 各 App → **App Information** → 记下数字 **Apple ID**  
  → 写入 `apps/auspice-app/eas.json` / `apps/kindred-app/eas.json` 的 `submit.production.ios.ascAppId`（替换 `REPLACE_WITH_ASC_APP_ID`）  
  → 确认同文件 `appleTeamId` = `L9Z47DW56X`

---

## 3. ASC — App Information（每个 App）

路径：App → **General → App Information**

| 字段 | Yuun | Yuel |
|---|---|---|
| Primary Category | **Reference** | **Lifestyle** |
| Secondary Category | **Lifestyle** | **Education** |
| Content Rights | 不含未授权第三方内容（按实际） | 同左 |
| License Agreement | Apple 标准 EULA（除非自备） | 同左 |
| Age Ratings | 见下一节 → 目标 **12+** | **12+** |

- [ ] Yuun App Information 保存  
- [ ] Yuel App Information 保存  

Subtitle / 商店 Name **不在**此页全局填 → 在各语言本地化填。

---

## 4. 年龄分级问卷

路径：App Information → **Age Ratings** → Edit  

按 Connect **实时题目**填写；共性建议：

| 类型 | 建议 |
|---|---|
| 暴力 / 色情 / 脏话 / 烟酒毒 / 赌博 | **None** |
| 恐怖 | None 或 Infrequent（无恐怖素材则 None） |
| 医疗 / 治疗宣称 | **None**（非医疗建议） |
| 未受管制的网页内容 / 命理类（题目以当时文案为准） | 如实；目标算出 **12+** |

- [ ] Yuun 保存后显示约 **12+**  
- [ ] Yuel 保存后显示约 **12+**  

---

## 5. 定价与销售范围

路径：App → **Pricing and Availability**（或 Monetization / Pricing）

- [ ] 价格：**Free (0)**  
- [ ] 含 App 内购买：是（有订阅 / IAP）  
- [ ] Availability：默认 **除中国大陆外的全部地区**，或至少 US · JP · TW · HK · SG · MY · TH  
- [ ] Pre-order：**关**  
- [ ] Yuun / Yuel 各保存一次  

说明：Primary Language = en-US 只影响**未本地化商店的文案回退**；可售地区与有没有本地化语言无关。
**中国大陆（国区）勿勾**：外国主体（UseONE, LLC）+ 无 ICP 备案无法在国区上架——Apple 自 2023 年起强制国区 App 填 ICP 备案号，境外主体拿不到备案，勾了也会被移除/拒审；国区合规是 Phase-2（中国主体 + App 备案 + 软著）。

---

## 6. 商店本地化文案（4 语言 × 2 App）

路径：App → **iOS App 版本（如 1.0）** → App Store → 语言旁 **+**

添加并填齐：

1. English (U.S.)  
2. Chinese (Simplified)  
3. Chinese (Traditional)  
4. Japanese  

| ASC 字段 | 复制来源 | 限制 |
|---|---|---|
| Name | `aso-metadata.json` → `locales.*.title` | ≤30 |
| Subtitle | `subtitle` | ≤30 |
| Keywords | `keywords` | ≤100；逗号分隔、**逗号后无空格** |
| Description | `description` | ≤4000 |
| Promotional Text | `promotionalText` | ≤170（可随时改） |
| What’s New | 首发可写简短「Initial release」/ 对应语言 | — |

仓库文件：

- Yuun：`apps/auspice-app/aso-metadata.json` · 粘贴用 `apps/auspice-app/aso-paste/<locale>-*.txt`  
- Yuel：`apps/kindred-app/aso-metadata.json` · `apps/kindred-app/aso-paste/...`  

**粘贴规则**：用 TextEdit 打开 `.txt` 再复制；禁止从 JSON 直接拷（会把 `\n` 粘成字面量）。Description **禁止** `<` `>` `\`（含 `->`）。

版本页 / App Information 另填：

- [ ] **Support URL**：`https://useone.tech`  
- [ ] **Marketing URL**：Yuun `https://yuun.hexastral.com` · Yuel `https://yuel.hexastral.com`  
- [ ] **Copyright**：`© 2026 UseONE, LLC`  

- [ ] Yuun：四语 Name/Subtitle/Keywords/Description/Promo + What’s New  
- [ ] Yuel：同上  

---

## 7. 隐私 Policy URL + App Privacy 营养标签

### 7.1 URL

路径：App → **App Privacy**（顶部）及版本页法务链接  

| | Privacy Policy URL | User Privacy Choices URL | Terms（描述/设置可链） |
|---|---|---|---|
| Yuun | `https://yuun.hexastral.com/privacy/yuun` | **留空** | `https://yuun.hexastral.com/terms` |
| Yuel | `https://yuel.hexastral.com/privacy/yuel` | **留空** | `https://yuel.hexastral.com/terms` |

- [ ] 浏览器打开上述 Privacy / Terms 均为 **200**（hexastral-web 已部署）  
- [ ] 勿填 `http://example.com`  
- [ ] Yuun / Yuel ASC 字段已保存  

其它语言页若单独有隐私链：zh → `/zh/` · tw → `/tw/` · ja → `/ja/`（与 aso 描述内链接一致）。

### 7.2 营养标签（两 App 相同口径，与 `app.json` privacyManifests 逐行一致）

路径：App → **App Privacy** → Get Started / Edit → 全部答完 → **Publish**

> **此表以代码内 `NSPrivacyCollectedDataTypes` 为准**（2026-07 修订：旧版表格与
> manifest 不符——误标了 Name、给 Product Interaction 标了 Linked=Yes 和广告营销
> 用途，还漏了 Device ID）。推送指标已去标识化（`metricsDeviceKey` 加盐哈希入库），
> 因此 Product Interaction 为**不关联**。若 ASC 填的与 manifest 不一致会被拒。

总问：

- [ ] Do you or third parties collect data from this app? → **Yes**  
- [ ] Do you use data for tracking? → **No**  

对每个已勾数据类型：

| 数据类型 | Linked to identity? | Tracking? | Purposes（意图） |
|---|---|---|---|
| **User ID**（登录/匿名设备 id 用于服务端同步与推送注册） | Yes | No | **仅** App Functionality |
| **Device ID**（本地生成匿名 id：推送注册、生日提醒） | Yes | No | **仅** App Functionality |
| **Email Address**（Apple/Google 登录） | Yes | No | **仅** App Functionality |
| **Other User Content**（生辰 / 亲友 / 伴侣手输） | Yes | No | **仅** App Functionality |
| **Purchases**（订阅记录，RevenueCat） | Yes | No | **仅** App Functionality |
| **Product Interaction**（推送点击使用分析，服务端存加盐哈希、不关联身份） | **No** | No | Analytics + App Functionality |
| **Other Data Types** | Yes | No | **仅** App Functionality |

**不要添加 / 不要 Set Up**：

- Advertising Data  
- Other Usage Data  
- Crash Data / Performance Data / Other Diagnostic Data  
- Phone / Contacts / Photos / Location / Health / Sensitive Info  
- **Name**（App 不采集用户姓名；亲友称呼属 Other User Content）  
- Third-Party Advertising（意图里也不要勾）  
- Data Used to Track You  
- 不要把 Product Interaction 标成 Linked 或加 Advertising/Marketing 用途

说明：无 App 内广告 SDK；无 Sentry；服务端运维告警不是客户端 Diagnostics。

- [ ] Yuun **Publish**  
- [ ] Yuel **Publish**  

---

## 8. 订阅与 IAP（ASC → RevenueCat → 密钥）

> **No-IAP 先发阶段：整节跳过。** 不创建订阅/IAP 产品、不填 RC、不进 §8.5 密钥；
> `EXPO_PUBLIC_IAP_ENABLED=false` 的包里 paywall 显示 Coming soon。银行就绪后回到
> 本节，并**随一个新 App 版本**提交首个订阅（Apple 要求首发订阅必须挂版本）。

严格按 **8.1 → 8.5**。订阅组 = **每个 App 各自一份**（不能跨 App 共用同一组）；两边 Reference Name 都可叫 `hexastral_universe`。

### 8.0 三层（与 Paywall 对齐）

```
ASC Product ID
  → RC Product（同名）
    → Entitlement（App 查询）
      → Offering「Current」的 Monthly / Annual
        → 客户端 purchasePackage / purchaseProduct
```

Yuun 代码：`AuspicePaywallSheet` → `auspice_pro_*` + `auspice_pro`。  
Yuel 代码：`lib/iap.ts` → `kindred_pro_*` + `offerings.current`；合盘 `hexastral_compatibility` → `purchaseProduct`。

### 8.1 前置

- [ ] Paid Apps Agreement 仍为 Active（§0）

### 8.2 ASC — Yuun 订阅

入口：https://appstoreconnect.apple.com/apps → **Yuun** → **Monetization** → **Subscriptions**

1. Create **Subscription Group**  
   - Reference Name：`hexastral_universe`  
   - 组本地化显示名：如 `Yuun Pro`  
2. 组内 Create Subscription ×2：

| Product ID（创建后基本不可改） | Duration | 参考价 | Display Name |
|---|---|---|---|
| `auspice_pro_monthly` | 1 Month | $4.99 | Yuun Pro Monthly |
| `auspice_pro_annual` | 1 Year | $39.99 | Yuun Pro Annual |

每条勾完：

- [ ] Subscription Duration  
- [ ] **Subscription Prices**（Base + 各国；可用 Apple 建议价）  
- [ ] **App Store Localization**（至少 en-US Display Name + Description；建议四语）  
- [ ]（可选）Tax category / 可用性默认即可  
- [ ]（可选）**Family Sharing**：开 = 同 Apple 家庭可共享订阅；MVP 可开可关，不挡上架  
- [ ]（建议）Review Screenshot：Paywall  
- [ ] 状态 **Ready to Submit**  

权益文案：对你而言完整原因、时间轴/假如、八字紫微深读、亲友提醒上限等 — **文化参考，非预测**。

- [ ] Yuun 月 + 年均为 Ready to Submit  

首发订阅必须随 **App 版本** 一起提交审核。

### 8.3 ASC — Yuel 订阅 + 合盘消耗型

入口：同一 Apps 列表 → **Yuel** → **Monetization**

**A. Subscriptions**（新建本组，Reference Name 仍可用 `hexastral_universe`）

| Product ID | Duration | 参考价 | Display Name |
|---|---|---|---|
| `kindred_pro_monthly` | 1 Month | $7.99 | Yuel Pro Monthly |
| `kindred_pro_annual` | 1 Year | $47.99 | Yuel Pro Annual |

- [ ] 价格 + 本地化（四语更好）+ Ready  
- [ ]（可选）Family Sharing  
- [ ] 描述：**月额度** AI · 每月最多 **3** 次合盘/重算 — **禁止写无限 AI / 无限合盘**  

**B. In-App Purchases → + → Consumable**（不进订阅组）

| Product ID | 参考价 | Display Name 例 |
|---|---|---|
| `hexastral_compatibility` | $6.99 | Compatibility unlock / 合盘解锁 |

- [ ] 价格 + 本地化 + Ready to Submit  

**不要创建**：`universe_pro_*`、`hexastral_personal`、未开 Family Sharing 时不必建 Sandbox Test Family。

### 8.4 RevenueCat

入口：https://app.revenuecat.com

- [ ] Project 下添加 / 核对 iOS Apps：Bundle `com.hexastral.yuun` · `com.hexastral.yuel`  
- [ ] 按提示填 ASC **App-Specific Shared Secret**（App → App Information / Monetization 可生成）  
- [ ] **Entitlements**：`auspice_pro` · `kindred_pro`（不要 `universe_pro`）  
- [ ] **Products**：Import 5 个 ID（与 ASC 一字不差）  
- [ ] **Attach**：  
  - `auspice_pro` ← monthly + annual  
  - `kindred_pro` ← monthly + annual  
  - `hexastral_compatibility` → **不挂** entitlement  
- [ ] **Offerings**：  
  - `auspice_default`：Monthly / Annual → `auspice_pro_*` → 对该 App 设 **Current**  
  - `yuan_default`：Monthly / Annual → `kindred_pro_*` → **Current**  
- [ ] **Webhooks**：  
  - URL：`https://api.hexastral.com/webhooks/revenuecat`  
  - Authorization：`Bearer <REVENUECAT_WEBHOOK_SECRET>`  
  - 事件：`INITIAL_PURCHASE` · `RENEWAL` · `CANCELLATION` · `EXPIRATION` · `NON_RENEWING_PURCHASE`  
- [ ] 复制各 App **iOS 公开钥** `appl_…` → EAS  
- [ ] 复制 **Secret** REST API key → Worker（不是 `appl_`）

### 8.5 Worker + EAS Secrets

Cloudflare（本机已 wrangler 登录；或 Dashboard Workers → Settings → Variables）：

```bash
cd apps/hexastral-api
bunx wrangler secret put REVENUECAT_WEBHOOK_SECRET
bunx wrangler secret put REVENUECAT_API_KEY
bunx wrangler secret put CYCLE_CALENDAR_SECRET   # Yuun Pro 个人日历若启用
```

- [ ] production **`ALLOW_DEV_PRO=0`**  

Expo：https://expo.dev → 各项目 Secrets（或 `eas secret:create`）

- [ ] Yuun production：`EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_…`（禁止 `REPLACE_WITH_*`）  
- [ ] Yuel production：同上（各自 App 的 `appl_`）  
- [ ] `eas.json` 的 `ascAppId` 已是真实数字  

**沙盒自测**

- [ ] Yuun：Paywall 出月/年价 → 购买 → RC Customers 有 `auspice_pro` → Restore  
- [ ] Yuel：订阅同上 → 合盘墙购买 `hexastral_compatibility` → bond 解锁  

---

## 9. 截图与预览

路径：版本页 → **App Store 预览和截图**

| 项 | 选择 |
|---|---|
| iPhone 尺寸 | 至少填 ASC 要求的 **6.9"**（约 1320×2868）与 **6.5"**（约 1242×2688）档；以页面当前标签为准 |
| iPad | **不上传**（无 iPad） |
| App Preview 视频 | 可选，MVP 可空 |
| 语言 | en-US · zh-Hans · zh-Hant · ja **各传一套** |

**Yuun 镜位建议**：今日干支宜忌 → 月历 → 文化 →「对你而言」→ 设置/提醒。未验证 Widget/Watch 前 **勿** 在截图或文案宣称。  

**Yuel 镜位建议**：Bonds 首页 → 双盘合盘 → 时间轴 → 邀请 → Paywall（Pro + 合盘解锁）。

- [ ] Yuun 四语截图齐  
- [ ] Yuel 四语截图齐  

---

## 10. 版本页其它选项（Prepare for Submission）

路径：App → **iOS App** → 版本（1.0）

逐项确认（两 App）：

- [ ] **Build**：先空着，等 §11 上传后再选  
- [ ] **App Clip**：留空（无）  
- [ ] **iMessage App / 贴纸**：留空（无）  
- [ ] **Copyright**：`© 2026 UseONE, LLC`  
- [ ] **Routing App Coverage**：无则空  
- [ ] **Sign-in required**：可说明 anonymous-first；Pro 需登录（见审核备注）  
- [ ] **Advertising Identifier**：未用广告追踪 → 按问卷选 **No** / 未使用  
- [ ] **Export Compliance**：Uses encryption? → **No**（仅标准 HTTPS；与 `ITSAppUsesNonExemptEncryption: false` 一致）  
- [ ] 版本页勾选本次要审的 **IAP / 订阅**（Ready to Submit 的产品）  

**App Review Information**

- [ ] First / Last name · Phone · Email（可联到审核的人）  
- [ ] Demo account：无强制账号可写 none / anonymous-first  
- [ ] Notes：粘贴 §12.2 模板（按 App 删减）  

---

## 11. EAS 生产包 → 上传 → TestFlight

栈：Expo 54 · **EAS 云构建**上架（本机 `expo run:ios` 只做开发）。

前置：§8.5 密钥与 `ascAppId` 已实装。

```bash
# —— Yuun ——
cd apps/auspice-app
bunx eas-cli login
bunx eas-cli credentials   # 首次：确认 Team L9Z47DW56X，建议 EAS 托管发行证书
bunx eas-cli build --profile production --platform ios
bunx eas-cli submit --platform ios --profile production --latest

# —— Yuel（可先打好包；Submit for Review 等 Yuun Approved）——
cd apps/kindred-app
bunx eas-cli build --profile production --platform ios
bunx eas-cli submit --platform ios --profile production --latest
```

- [ ] Yuun build **Finished**（https://expo.dev）  
- [ ] Yuel build **Finished**  
- [ ] ASC → TestFlight：Processing（约 10–30 min）→ **Ready to Test**  
- [ ] Export Compliance 在 TestFlight/版本按提示选 **No**  

### 11.1 Internal Testing

1. https://appstoreconnect.apple.com/access/users → 测试员已在 People  
2. App → **TestFlight** → **Internal Testing** → 组内加 Tester + 绑当前 build  
3. 设备用同一 Apple ID 打开 **TestFlight** → Install  

- [ ] 至少一台真机装上 Yuun  
- [ ] 至少一台真机装上 Yuel  

---

## 12. 冒烟 → 提审

### 12.1 冒烟（用 TestFlight 生产包）

**Yuun**

- [ ] 今日宜忌 / 月历可读（可匿名）  
- [ ] 订阅入口 → Sign in with Apple → 沙盒购买月或年 → Pro 能力生效  
- [ ] Restore purchases  
- [ ] 设置内 Privacy / Terms 链接可开  
- [ ]（若启用）删除账号流程可用  

**Yuel**

- [ ] 登录后可建 / 查看 bond  
- [ ] Paywall 月年价格可见 → 购买 → `kindred_pro`  
- [ ] 合盘墙可买 `hexastral_compatibility` 并解锁  
- [ ] 分享邀请：Copy 内容含邀请 URL  
- [ ] Delete Account  

### 12.2 审核备注模板

```
Test account: (none required — anonymous-first)
To exercise Pro: tap any Pro element → Sign in with Apple/Google → restore purchases works for re-review.
Publisher: UseONE, LLC.

Yuun: Chinese almanac (stem-branch / yi-ji / solar terms) — cultural reference, not fortune-telling or medical advice. Sign-in primarily at subscribe.

Yuel: BaZi couples typology — entertainment / cultural reference, not matchmaking. Sign-in to store bonds. Pro: monthly AI chat allowance and up to 3 synastry unlocks or birth recomputes per month; one-time product hexastral_compatibility remains available.
```

### 12.3 Submit

路径：版本页 → **Build +** 选包 → 核对 IAP 勾选 → **Add for Review** / **Submit for Review**

- [ ] **Yuun** Submit for Review  
- [ ] 等 **Yuun → Approved**（可先 Ready for Sale / 手动发售按策略）  
- [ ] **同日**再 **Yuel** Submit for Review  

---

## 13. 提审后

- [ ] 盯 ASC Resolution Center / 拒信  
- [ ] TestFlight / 崩溃反馈  
- [ ] RevenueCat → Integrations → Webhooks → deliveries  
- [ ] Worker 日志（Cloudflare）  
- [ ] **不要**上线 `universe_pro`，直到多 App 稳定  

---

## 14. 故障速查

| 症状 | 处理 |
|---|---|
| 订阅 Missing Metadata | 协议未 Active / 缺价格 / 缺本地化 |
| Paywall 无价或买不了 | RC Offering 未设 **Current**；Product ID 不一致；EAS 仍是 `REPLACE_WITH_*` |
| `eas submit` 找不到 App | `ascAppId`；是否 LLC 团队 |
| 签名失败 | `bunx eas-cli credentials`；Team `L9Z47DW56X` |
| TestFlight 无邀请 | 人未进 ASC People（Internal 不能只填外部邮箱） |
| Build 一直 Processing | 等 10–30min；查 Compliance 邮件 |
| 隐私 404 | hexastral-web 未部署或 path 错 |
| Description 被拒字符 | 去掉 `<` `>` `\`，从 aso-paste 重贴 |
| 合盘买了仍锁 | webhook `NON_RENEWING_PURCHASE`；是否调用 bond unlock |
| 营养标签改不了 | 角色须 App Manager+；未完成的 Set Up 项先删掉或填完再 Publish |

---

## 15. MVP 之后（本清单不做，短备忘）

1. **TK / Meta / Google 广告 SDK** → 再勾 Advertising Data / Device ID、Tracking、ATT，并更新隐私标签。  
2. **转化分析** → 强化广告 / push / DDL → 订阅归因看板。  
3. **Apple Family Sharing** → 订阅开启共享 + Sandbox Test Family；不能替代 Yuel 跨 Apple ID 邀请。  
4. **`universe_pro`** → 跨 App 全家桶，多 App 稳定后再开。  
5. **Sentry / Crash** → 接客户端上报后再勾 Diagnostics。
