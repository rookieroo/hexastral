# App Store Connect 创建指南 — Yuun & Yuel

> **用途**：在 [App Store Connect](https://appstoreconnect.apple.com) 从零创建两个 iOS 应用、配置 IAP、隐私标签、分级与提审表单。  
> **前置**：Apple Developer Program 已付费、Team ID `L9Z47DW56X`（UseONE, LLC）。  
> **文案 SSOT**：`apps/auspice-app/aso-metadata.json`（Yuun）、`apps/kindred-app/aso-metadata.json`（Yuel）。  
> **关联**：[yuun-yuel-launch-runbook.md](./yuun-yuel-launch-runbook.md) · [revenuecat-entitlements.md](../setup/revenuecat-entitlements.md)

最后更新：2026-07-11。

---

## 0. 你需要哪些权限

在 **Users and Access**（[appstoreconnect.apple.com/access/users](https://appstoreconnect.apple.com/access/users)）确认你的角色：

| 任务 | 最低角色 | 说明 |
|---|---|---|
| 创建 App 记录、填元数据、上传截图、提交审核 | **App Manager** 或 **Admin** | 日常上架主力 |
| 注册 Bundle ID、开关 Capability | **Admin** 或 **Account Holder** | 在 [developer.apple.com](https://developer.apple.com/account) |
| 配置 IAP 订阅组、价格 | **App Manager** + **Finance** 已签协议 | 首次 IAP 需 **Paid Applications Agreement**、税务、银行 |
| 创建 Sandbox 测试账号 | **Admin** 或 **App Manager** | Users and Access → Sandbox |
| 管理证书 / EAS 自动签名 | **Admin** 或 Developer Portal 访问权 | 通常 EAS 代管 |

**首次上架 IAP 前必做**（App Store Connect → **Agreements, Tax, and Banking**）：

- [ ] **Paid Applications** 合同状态为 **Active**
- [ ] 税务表单（W-9 / 税务信息）已提交
- [ ] 银行账户已绑定（收款）

未签 Paid Applications 时，订阅产品会一直停在 “Missing Metadata” 或无法进入审核。

---

## 1. 创建顺序（不要跳步）

```
① Apple Developer → Identifiers（Bundle ID + Capabilities）
        ↓
② App Store Connect → 新建 App ×2
        ↓
③ 每个 App → Monetization → 订阅 / 消耗型 IAP
        ↓
④ App Information + Privacy + 分级 + 定价
        ↓
⑤ 各语言 App Store 本地化（从 aso-metadata.json 粘贴）
        ↓
⑥ 版本页：截图 + 构建 + 审核信息 → Submit
```

**提审顺序**：先 **Yuun**，过审后再提 **Yuel**（同一发行主体，降低 4.3(b) 双杀风险）。

---

## 2. Apple Developer Portal — Identifiers（ASC 之前）

路径：**Certificates, Identifiers & Profiles → Identifiers → +**

### 2.1 Yuun — `com.hexastral.yuun`

| 字段 | 填写 |
|---|---|
| Type | App IDs → App |
| Description | `Yuun (HexAstral almanac)` |
| Bundle ID | **Explicit** → `com.hexastral.yuun` |

**Capabilities（勾选并 Save）**：

| Capability | 必须？ | 说明 |
|---|---|---|
| **Sign In with Apple** | ✅ | 订阅步骤登录；Configure 选 “Enable as a primary App ID” |
| **App Groups** | ✅ | 新建 Group：`group.com.hexastral.yuun`，并勾选进此 App ID（Widget 预留） |
| Associated Domains | ✅（在 Xcode/EAS 侧） | Portal 里无单独勾选项；域名在 `app.json` `associatedDomains` |
| Push Notifications | 建议 ✅ | Yuun 有本地/远程推送；勾选后 EAS 可配 APNs |

**不要勾**：iCloud（除非后续明确要 CloudKit）、HealthKit、Wallet 等未使用能力。

### 2.2 Yuel — `com.hexastral.yuel`

| 字段 | 填写 |
|---|---|
| Description | `Yuel (HexAstral bonds / synastry)` |
| Bundle ID | `com.hexastral.yuel` |

**Capabilities**：

| Capability | 必须？ |
|---|---|
| **Sign In with Apple** | ✅ |
| Push Notifications | 可选（Yuel 有通知能力时可勾） |

**不要勾**：App Groups（Yuel `app.json` 未声明）。

### 2.3 改完 Capability 之后

- [ ] 若曾用手动 Profile：删除旧 Profile，让 EAS 重新生成
- [ ] 或在 Xcode/EAS 下次 build 时自动刷新

---

## 3. App Store Connect — 新建 App（两个各做一次）

路径：**My Apps → + → New App**

### 3.1 表单字段（逐项）

| 字段 | Yuun | Yuel |
|---|---|---|
| **Platforms** | ☑ iOS | ☑ iOS |
| **Name** | `Yuun` | `Yuel` |
| **Primary language** | **English (U.S.)** | **English (U.S.)** |
| **Bundle ID** | 下拉选 `com.hexastral.yuun` | `com.hexastral.yuel` |
| **SKU** | `auspice-ios-2026`（内部用，用户不可见，创建后不可改） | `kindred-ios-2026` |
| **User Access** | Full Access（或按团队习惯限制） | 同上 |

> **Name** 是 Connect 内部名称；商店各语言 **显示名** 在本地化里用 `aso-metadata.json` 的 `title`。

创建成功后，在 **App Information** 页记下 **Apple ID**（纯数字，例如 `6750123456`）：

```bash
# 写入 eas.json
# apps/auspice-app/eas.json  → submit.production.ios.ascAppId
# apps/kindred-app/eas.json  → submit.production.ios.ascAppId
```

---

## 4. App Information（每个 App 各填一次）

路径：**App → 左侧 General → App Information**

| 字段 | Yuun | Yuel |
|---|---|---|
| **Category → Primary** | **Reference** | **Lifestyle** |
| **Category → Secondary** | Lifestyle（可选） | **Education**（可选） |
| **Content Rights** | 不含第三方内容 / 或按实际情况 | 同上 |
| **Age Rating** | 见 §6（目标 **12+**） | 见 §6（目标 **12+**） |
| **License Agreement** | Apple 标准 EULA（除非自定义） | 同上 |

**Subtitle** 不在此页全局填——在 **各语言 App Store** 本地化里填（见 §7）。

---

## 5. 定价与销售范围

路径：**Pricing and Availability**

| 项 | 建议 |
|---|---|
| **Price** | Free（0） |
| **Availability** | 默认 **所有地区** 或至少：US, CN, JP, TW, HK, SG, MY, TH |
| **Pre-orders** | 关 |

> **Primary Language = en-US** 只影响未本地化商店的**文案回退**；**可售地区**与本地化语言无关，海外用户仍可下载购买。

---

## 6. 年龄分级问卷（Age Rating）

路径：**App Information → Age Rating → Edit**

两 app 共性（按实际功能选 “None / Infrequent”）：

| 问题类型 | 建议答案 | 原因 |
|---|---|---|
| 卡通/幻想暴力 | None | 无 |
| 现实暴力 | None | 无 |
| 色情/nudity | None | 无 |
| 亵渎 | None | 无 |
| 酒精/烟草/毒品 | None | 无 |
| 赌博 | None | 无 |
| 恐怖 | None / Infrequent | 命理文案偏文化，无恐怖素材 |
| 医疗/保健 | **None** | 明确非医疗建议（Terms §3） |
| **未受管制内容**（命理/占卜类） | Yuun：**Infrequent/Mild** 或按问卷最新表述如实选；Yuel：可能略高 | 有八字/合盘文化内容，**不是**赌博 |

目标分级：

- **Yuun → 12+**（与 `apps/auspice-app/aso-metadata.json` `contentRating: "12+"` 对齐）
- **Yuel → 12+**（关系/伴侣主题）

问卷每年可能调整，以 Connect 实时题目为准；填完后确认计算结果接近目标再 Save。

---

## 7. App Store 本地化（4 语言 × 2 App）

路径：**App → [iOS App 版本，如 1.0] → App Store → 语言旁的 +**

添加语言：

1. **English (U.S.)** — 主语言，必做  
2. **Chinese (Simplified)**  
3. **Chinese (Traditional)**  
4. **Japanese**

### 7.1 从仓库复制（不要改写营销触发词）

```bash
# 提交前校验字数
node scripts/aso-charcount.mjs apps/auspice-app/aso-metadata.json apps/kindred-app/aso-metadata.json
```

**粘贴方式**：不要从 `.json` 源文件直接复制 `description`（会把字面量 `\n` 粘进 ASC）。用解析后的纯文本：

```bash
# Yuun（已生成）
open apps/auspice-app/aso-paste/en-US-description.txt
# 或临时打印
python3 -c "import json;print(json.load(open('apps/auspice-app/aso-metadata.json'))['locales']['en-US']['description'])"
```

每个语言页字段对应 `aso-metadata.json` → `locales`：

| ASC 字段 | JSON 键 | 限制 |
|---|---|---|
| **Name** | `title` | ≤30 字符 |
| **Subtitle** | `subtitle` | ≤30 |
| **Promotional Text** | `promotionalText` | ≤170（可随时改，无需新版本） |
| **Description** | `description` | ≤4000 |
| **Keywords** | `keywords` | ≤100，**逗号分隔、逗号后无空格** |
| **Support URL** | — | `https://useone.tech` 或 `mailto:support@useone.tech` 落地页 |
| **Marketing URL** | 可选 | `https://yuun.hexastral.com` / `https://yuel.hexastral.com` |

### 7.2 法律链接（**每个语言都要填对路径**）

部署 `hexastral-web` 后，用浏览器确认 200，再粘贴：

**Yuun**

| 语言 | Privacy Policy URL | Terms of Use URL |
|---|---|---|
| en-US | `https://yuun.hexastral.com/privacy/yuun` | `https://yuun.hexastral.com/terms` |
| zh-Hans | `https://yuun.hexastral.com/zh/privacy/yuun` | `https://yuun.hexastral.com/zh/terms` |
| zh-Hant | `https://yuun.hexastral.com/tw/privacy/yuun` | `https://yuun.hexastral.com/tw/terms` |
| ja | `https://yuun.hexastral.com/ja/privacy/yuun` | `https://yuun.hexastral.com/ja/terms` |

**Yuel**

| 语言 | Privacy Policy URL | Terms of Use URL |
|---|---|---|
| en-US | `https://yuel.hexastral.com/privacy/yuel` | `https://yuel.hexastral.com/terms` |
| zh-Hans | `https://yuel.hexastral.com/zh/privacy/yuel` | `https://yuel.hexastral.com/zh/terms` |
| zh-Hant | `https://yuel.hexastral.com/tw/privacy/yuel` | `https://yuel.hexastral.com/tw/terms` |
| ja | `https://yuel.hexastral.com/ja/privacy/yuel` | `https://yuel.hexastral.com/ja/terms` |

> en 默认语言无 `/en` 前缀（`localePrefix: as-needed`）。

### 7.3 禁止词（`_doNotUse`）

`aso-metadata.json` 里列出的词 **不要** 出现在 Name / Subtitle / Keywords，例如：horoscope, zodiac, fortune, 算命, 运势, 占星, soulmate 等。Description 里已用防御性表述（cultural study / reflection not prediction）。

---

## 8. App 隐私（Privacy Nutrition Labels）

路径：**App → App Privacy → Get Started / Edit**

两 app **共同口径**：

| 问题 | 答案 |
|---|---|
| Do you or third-party partners collect data? | **Yes** |
| Do you use data for tracking? | **No** |
| Privacy Policy URL | 与 §7.2 英文链接一致 |

### 8.1 建议声明的数据类型

按 Connect 分类逐项添加（**Collected** + 用途 + 是否关联用户 + 是否用于追踪）。
下列勾选与代码一致：SIWA 写入 `users.name` / `users.email`；growth ingest / attribution 支撑 Product Interaction。

| Data type | Yuun | Yuel | Linked to user? | Tracking? | Purposes |
|---|---|---|---|---|---|
| **Name** | ✅ SIWA `FULL_NAME` → portfolio auth | ✅ SIWA → `/onboarding/apple-link` | Yes | No | App Functionality, Account Management |
| **Email Address** | ✅ SIWA `EMAIL`（JWT）→ portfolio auth | ✅ SIWA / 邮箱 OTP | Yes | No | App Functionality, Account Management |
| **Purchases** | ✅ RevenueCat | ✅ | Yes | No | App Functionality |
| **Other User Content**（手输生辰、家人姓名生日） | ✅ | ✅（含伴侣生辰） | Yes | No | App Functionality |
| **User ID**（匿名 install / portfolio id） | ✅ | ✅ | Yes | No | App Functionality |
| **Product Interaction** | ✅ satellite bootstrap（`app_open` / DDL / attribution） | ✅ unlock funnel + DDL attribution | Yes | No | Analytics, App Functionality |

**不要声明**（当前 MVP 无 / 未接客户端采集）：

- Contacts（不读系统通讯录）
- Location（不持续定位；城市级生辰地理属用户手选/输入 → Other User Content）
- Health & Fitness
- Browsing History
- **Advertising Data**（无第三方广告 SDK 曝光上报）
- **Diagnostics**（Crash / Performance / Other）— `svc-admin-notify` 是服务端 Telegram 运维告警，不是 App 端诊断采集；Yuun/Yuel 尚未 `initCrashReporting` / Sentry。接上后再勾 Crash Data
- **Data Used to Track You** — 全关

**Yuel 额外注意**：伴侣生辰是用户**手输**，不是从通讯录导入——不要勾 Contacts。

**跨 App 关联**：MVP **不售** Universe Pro，隐私问卷里 **不要** 勾 “data collected from other companies’ apps on device” 类跟踪关联；Terms 里跨 app memory 默认关闭。

填完后 **Publish** 隐私标签。

---

## 9. In-App Purchases（Monetization）

**入口（任选其一）**：

1. 左侧栏：**Monetization** → **Subscriptions**（自动续订） / **In-App Purchases**（消耗型等）
2. 版本页顶部黄条 *In-App Purchases and Subscriptions* → 点进去同属 Monetization
3. 直链：`https://appstoreconnect.apple.com` → 选 App → 左侧 **Monetization**

首个 IAP **必须**随某个 App 版本一起 Submit（版本页勾选要审的订阅产品，或提交版本时带上 Ready to Submit 的 IAP）。

路径：**App → Monetization → Subscriptions** 或 **In-App Purchases**

### 9.1 订阅组（每个 App 各自建一组）

在 **Yuun** 与 **Yuel** 各自的 Monetization → Subscriptions 下各建一个 Subscription Group（Apple **不能**跨 App 共用同一组）：

- **Reference Name**（内部）：两边都可用 `hexastral_universe`，仅方便认
- **消耗型**（如 `hexastral_compatibility`）**不进**订阅组 → 走 In-App Purchases → Consumable

逐步点击顺序见 [launch-checklist.md](./launch-checklist.md) §3。

### 9.2 Yuun 订阅

| Product ID | Type | Duration | 参考价（USD Tier） | Display Name 示例 |
|---|---|---|---|---|
| `auspice_pro_monthly` | Auto-Renewable | 1 Month | $4.99 | Yuun Pro Monthly |
| `auspice_pro_annual` | Auto-Renewable | 1 Year | $39.99 | Yuun Pro Annual |

每个产品：

- [ ] 4 语言 Display Name + Description（与 aso Free vs Pro 一致）
- [ ] 价格：选 tier 或手动各国（中国区可用 ¥30/¥248 等与文案一致）
- [ ] **Review screenshot**：Paywall 截图一张（可选但建议）
- [ ] 状态 **Ready to Submit**（随 App 版本一起审）

### 9.3 Yuel 订阅 + 消耗型

**订阅**（同组 `hexastral_universe`）：

| Product ID | Duration | 参考价 |
|---|---|---|
| `kindred_pro_monthly` | 1 Month | $7.99 |
| `kindred_pro_annual` | 1 Year | $47.99 |

**消耗型**（**In-App Purchases → Consumable**，不在订阅组）：

| Product ID | 参考价 | 说明 |
|---|---|---|
| `hexastral_compatibility` | $6.99 | 单次合盘报告解锁（per-bond） |

### 9.4 MVP 不要创建

- `universe_pro_monthly` / `universe_pro_annual`
- `hexastral_personal`（Yuel 单次命书，客户端已隐藏）

产品 ID 必须与 `apps/hexastral-api/src/config/products.ts` **字符级一致**。

---

## 10. 版本页与提审表单（Prepare for Submission）

路径：**App → iOS App → + Version**（如 `1.0.0`）

### 10.1 构建版本（Build）

**不需要**在 ASC 页用 Transporter / Xcode Organizer 手动拖包（除非你刻意不用 EAS）。正常流程：

```bash
cd apps/auspice-app   # 或 kindred-app
eas build --profile production --platform ios
eas submit --profile production --platform ios   # 或 build 时加 --auto-submit
```

1. EAS 云构建 → `eas submit` 自动上传到该 App 的 ASC
2. ASC 出现 **Processing**（约 10–30 分钟）→ 变为可选
3. 版本页 **Build** 区点 **+**，勾选该 build（这步仍要人手选一次）

版本页上的 “Upload your builds using one of several tools” 只是说明可选上传方式；**有 EAS submit 后忽略手动上传即可**。

**Export Compliance**（与 `app.json` 一致）：

- `ITSAppUsesNonExemptEncryption: false` → 问卷选 **No**（仅标准 HTTPS / Apple 加密）

**App Clip / iMessage App**：Yuun / Yuel **都没有** → 两栏留空，不要创建 App Clip 或 iMessage 扩展。

### 10.2 截图

规格见 [screenshot-direction.md](./screenshot-direction.md)：

| 必填尺寸 | 像素 |
|---|---|
| 6.9"（iPhone 16 Pro Max 类） | 1320 × 2868 |
| 6.5"（fallback） | 1242 × 2688 |

- Yuun：建议 **7** 张/语言（日历主导，S6 披露命书）
- Yuel：建议 **5** 张/语言（双盘对比、邀请流程优先）
- **Yuun / Yuel 均无 iPad 构建**（`app.json` → `ios.supportsTablet: false`）→ **不要** 上传 iPad 截图，也不要在商店声明 iPad 支持；仅填 iPhone 尺寸即可

### 10.3 版本信息字段

| 字段 | 填写 |
|---|---|
| **Support URL** | `https://useone.tech` |
| **Marketing URL** | Yuun `https://yuun.hexastral.com` · Yuel `https://yuel.hexastral.com` |
| **What's New** | 首版：`Initial release.` 或各语言一句 |
| **Copyright** | `© 2026 UseONE, LLC` |
| **Routing App Coverage File** | 无（不上传） |
| **Version** | 与 `app.json` / EAS marketing version 对齐（首发常用 `1.0`）；**Build** 号由 EAS `autoIncrement` |
| **App Clip / iMessage App** | 无 — 留空 |

**Description 非法字符**：ASC 报 *invalid characters* 时，常见元凶是 **`<` / `>`**（含 `->` 箭头），不是换行。换行（纯 `\n`）可以。请从 `apps/*/aso-paste/{locale}-description.txt` 用 **TextEdit** 全选复制再贴 ASC；**不要**从 JSON 拷（会粘出字面量 `\n`）。仓库文案已去掉 `<>`。

### 10.4 App Review Information

路径：**App Store Connect → 用户与访问** 同页或版本内 **App Review Information**

| 字段 | 填写 |
|---|---|
| **Sign-in required?** | **No**（免费功能无需登录；审核员若要测 Pro，在 Paywall 登录） |
| **Demo account** | 留空；备注里说明用 Sandbox 购买 |
| **Contact** | 你的姓名 + 电话 + 邮箱 |
| **Notes** | 见下方模板 |

**Notes 模板（Yuun）**：

```
Yuun is a Chinese almanac (stem-branch / yi-ji / solar terms) for cultural reference. Not fortune-telling. Not medical advice.
Sign-in is NOT required for daily public almanac / widgets / calendar.
Sign-in only at subscription / Pro (Sign in with Apple).
To test Pro: open Pro feature or paywall, Sign in with Apple, purchase with Sandbox tester (Settings - App Store - Sandbox Account). Restore works.
No ads. No tracking.
Privacy: https://yuun.hexastral.com/privacy/yuun
```

**Notes 模板（Yuel）**：

```
Yuel is a Ba Zi (Four Pillars) two-chart relationship typology tool — cultural/educational framing, not horoscope or matchmaking.
Sign-in is required to save bonds under the user identity.
Invite flow: create bond → optional partner invite link.
To test Pro: Sign in with Apple → Sandbox subscribe. One-time synastry unlock: hexastral_compatibility consumable.
Privacy: yuel.hexastral.com/privacy/yuel
```

### 10.5 提交前勾选

- [ ] 所有必填本地化完成
- [ ] 隐私标签已 Publish
- [ ] IAP 状态 Ready to Submit
- [ ] 构建已选
- [ ] 出口合规已答
- [ ] **Add for Review** → **Submit to App Review**

---

## 11. Sandbox 测试账号

路径：**Users and Access → Sandbox → Testers → +**

| 字段 | 建议 |
|---|---|
| Email | 专用假邮箱（如 `sandbox-yuun@你的域名`） |
| Password | 强密码 |
| Country | United States（或主要测试市场） |

设备上：**设置 → App Store → 沙盒账户** 登录该账号；**不要** 在设置里登正式 Apple ID 测 IAP。

---

## 12. 创建完成后的仓库回写

| 产出 | 写到哪里 |
|---|---|
| ASC **Apple ID**（数字） | `apps/*/eas.json` → `submit.production.ios.ascAppId` |
| Yuun EAS Project ID | 已创建：`269d6ab5-6462-4f8e-ad6d-69a526dcb91e`（见 `app.json`） |
| Yuel EAS Project ID | `95b2e753-aeba-421c-9c87-08557d4257fa` |
| IAP 产品 | RevenueCat 导入 → 见 [revenuecat-entitlements.md](../setup/revenuecat-entitlements.md) |

---

## 13. 常见问题

**Q: Bundle ID 下拉里没有我的 ID？**  
A: 先在 Developer Portal 创建 Identifier，等待几分钟刷新；Bundle ID 必须 Explicit 且与 `app.json` 一致。

**Q: 订阅一直 Waiting for Review？**  
A: 首个订阅需随 **App 版本** 一起提交；确保 Paid Applications 合同 Active。

**Q: 隐私 URL 审核报 404？**  
A: 先 `cd apps/hexastral-web && bun deploy`，再 `curl -sI` 各语言 URL。

**Q: Yuun 和 Yuel 能否共用一个 ASC「App」？**  
A: **不能**。一个 Bundle ID = 一个 App 记录；我们有两个 bundle，必须两个 App。

**Q: 商店名能否与 Device 名不同？**  
A: 可以。`app.json` `name`（主屏幕下显示 Yuun/Yuel）与 ASC 各语言 `title` 可更长（如带副标题），但 `title` 仍受 30 字限制。

---

## 14. Checklist 速查

### Yuun `com.hexastral.yuun`

- [ ] Developer：Sign in with Apple + App Group `group.com.hexastral.yuun`
- [ ] ASC：New App，Primary en-US，Reference 类目
- [ ] IAP：`auspice_pro_monthly`, `auspice_pro_annual`
- [ ] 隐私：Email + Purchases + User Content，无 Tracking
- [ ] 4 语言元数据 + 法律 URL
- [ ] 截图 7×4 locale
- [ ] `ascAppId` → `eas.json`

### Yuel `com.hexastral.yuel`

- [ ] Developer：Sign in with Apple
- [ ] ASC：New App，Primary en-US，Lifestyle 类目
- [ ] IAP：`kindred_pro_monthly`, `kindred_pro_annual`, `hexastral_compatibility`
- [ ] 隐私：同上 + 伴侣生辰说明为 hand-entered
- [ ] 4 语言元数据 + 法律 URL
- [ ] 截图 5×4 locale
- [ ] `ascAppId` → `eas.json`

---

完成 ASC 配置后，继续 [yuun-yuel-launch-runbook.md](./yuun-yuel-launch-runbook.md) 的 RevenueCat、Worker secrets、EAS production build 章节。
