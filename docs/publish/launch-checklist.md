# Launch checklist — Yuun + Yuel（MVP 总控）

> **一份按顺序勾选即可。** 外链只给控制台 / 官网入口；不再跳到其它内部文档。  
> **提审顺序**：先 **Yuun** → Approved 当天再提 **Yuel**。  
> **发行主体**：UseONE, LLC · Apple Team ID `L9Z47DW56X`（全部用 LLC 组织账号，不用个人发行方）。

Last updated: 2026-08-02.

### 控制台入口（全书共用）

| 用途 | URL |
|---|---|
| App Store Connect | https://appstoreconnect.apple.com |
| 协议 / 税 / 银行 | https://appstoreconnect.apple.com/agreements |
| ASC 用户与沙盒 | https://appstoreconnect.apple.com/access/users |
| Apple Developer Identifiers | https://developer.apple.com/account/resources/identifiers/list |
| RevenueCat | https://app.revenuecat.com |
| Expo / EAS | https://expo.dev |
| Cloudflare Dashboard（Worker secrets 可用 CLI） | https://dash.cloudflare.com |

### MVP 商业意图（与代码一致）

| | Yuun（`apps/auspice-app`） | Yuel（`apps/kindred-app`） |
|---|---|---|
| 定位 | 中华黄历工具；登录主要在 **订阅** 步骤 | 八字合盘 / 关系类型；记录 bonds 需登录 |
| 订阅 Product ID | `auspice_pro_monthly` · `auspice_pro_annual` | `kindred_pro_monthly` · `kindred_pro_annual` |
| RC Entitlement | `auspice_pro` | `kindred_pro` |
| 一次性 IAP | 无 | `hexastral_compatibility`（合盘解锁；**不**挂 entitlement） |
| 客户端 | `AuspicePaywallSheet` + `SatellitePaywall`；查 `auspice_pro` | `paywall.tsx` + `lib/iap.ts`；`offerings.current`；合盘用 `purchaseProduct` |
| 服务端目录 | `apps/hexastral-api/src/config/products.ts` | 同上 |
| **不要做（MVP）** | `universe_pro_*`、跨 App 全家桶、家庭席位 SKU、App 内广告 SDK | 无限 AI、`hexastral_personal`、把 Product ID 改成 `yuel_*` |

商店显示名可以写 **Yuun Pro / Yuel Pro**；**Product ID 必须保持上表工程名**（与客户端 / webhook 字面一致）。

---

## 0. 开干前

- [ ] [Agreements](https://appstoreconnect.apple.com/agreements) → **Paid Applications Agreement = Active**（+ 税 / 银行）。未 Active → 订阅会卡 Missing Metadata。
- [ ] [Users and Access](https://appstoreconnect.apple.com/access/users) → 角色至少 **App Manager**（改隐私 / IAP / 提审）；Portal 侧能改 Identifiers。

---

## 1. Apple Developer — App ID

入口：https://developer.apple.com/account/resources/identifiers/list → **+** → App IDs

- [ ] **Yuun** `com.hexastral.yuun`  
  勾选：Sign In with Apple · App Groups（`group.com.hexastral.yuun`）· Push Notifications  
  Description 示例：`Yuun (HexAstral almanac)`
- [ ] **Yuel** `com.hexastral.yuel`  
  勾选：Sign In with Apple · Push  
  Associated Domains 在 Expo `app.json` / EAS 声明即可（Portal 无单独勾选项）：含 `yuel.hexastral.com` 等
- [ ] Capability 变更后重新拉 provisioning（或交给 EAS 托管签名）
- [ ] [Sandbox Testers](https://appstoreconnect.apple.com/access/users) 建至少一个沙盒账号（真机：**设置 → App Store → 沙盒账户**，勿用正式 Apple ID 测买）

---

## 2. App Store Connect — 应用记录与商店页

入口：https://appstoreconnect.apple.com/apps → **+** → New App

| | Yuun | Yuel |
|---|---|---|
| Bundle ID | `com.hexastral.yuun` | `com.hexastral.yuel` |
| 商店名 | Yuun | Yuel |
| Primary Language | English (U.S.) | English (U.S.) |
| Primary / Secondary | Reference / Lifestyle | Lifestyle / Education |
| SKU（内部） | 如 `yuun-ios` | 如 `yuel-ios` |
| Support URL | `https://useone.tech` | `https://useone.tech` |
| Marketing URL | `https://yuun.hexastral.com` | `https://yuel.hexastral.com` |
| Copyright | `© 2026 UseONE, LLC` | `© 2026 UseONE, LLC` |

- [ ] 创建两 App；定价 **Free + 含 IAP**
- [ ] Content Rating **12+**
- [ ] 记下数字 **Apple ID** → 写入各 app `eas.json` → `submit.production.ios.ascAppId`

### 2.1 四语商店文案

入口：各 App → 语言本地化（en-US / zh-Hans / zh-Hant / ja）

| ASC 字段 | 仓库来源 |
|---|---|
| Name / Subtitle / Keywords / Description / Promotional Text | Yuun：`apps/auspice-app/aso-metadata.json` → `locales` · Yuel：`apps/kindred-app/aso-metadata.json` |

粘贴 Description / Keywords：**用 TextEdit 打开** `apps/*/aso-paste/<locale>-*.txt` 再复制（不要从 JSON 直接拷，否则 `\n` 变字面量；ASC 拒 `<` `>` `\`）。

- [ ] Yuun 四语五字段贴齐  
- [ ] Yuel 四语五字段贴齐  

### 2.2 隐私 URL

| App | Privacy Policy URL（ASC 全局） | User Privacy Choices | Terms（版本页 / 描述可链） |
|---|---|---|---|
| Yuun | `https://yuun.hexastral.com/privacy/yuun` | **留空** | `https://yuun.hexastral.com/terms` |
| Yuel | `https://yuel.hexastral.com/privacy/yuel` | **留空** | `https://yuel.hexastral.com/terms` |

- [ ] URL 返回 200（需已部署 hexastral-web）  
- [ ] 勿填 `http://example.com`

### 2.3 App Privacy（营养标签）

入口：App → **App Privacy** → Get Started / Edit → 填完 **Publish**

两 App 相同：

| 勾选 | Linked | Tracking | Purposes |
|---|---|---|---|
| Name | Yes | No | App Functionality |
| Email Address | Yes | No | App Functionality |
| Other User Content | Yes | No | App Functionality |
| User ID | Yes | No | App Functionality + Analytics + Developer’s Advertising or Marketing |
| Purchases | Yes | No | App Functionality + Analytics |
| Product Interaction | Yes | No | Analytics + App Functionality + Developer’s Advertising or Marketing |

**不要勾 / 不要 Set Up**：Advertising Data · Diagnostics（Crash / Performance / Other）· Device ID · Third-Party Advertising · Tracking = Yes  
（客户端尚未接广告 SDK / Sentry；服务端 admin-notify ≠ Diagnostics。）

- [ ] Yuun Publish  
- [ ] Yuel Publish  

---

## 3. 订阅与 IAP（ASC → RevenueCat → 密钥）

按 **3.1 → 3.5** 顺序做；中途不要跳。

### 3.0 三层模型（与代码对齐）

```
ASC Product ID（用户付钱的 SKU）
    → RevenueCat Product（同名导入）
        → Entitlement（App 里 hasEntitlement 查的开关）
            → Offering「Current」里的 Monthly / Annual Package
                → Paywall 调 purchasePackage / purchaseProduct
```

| | Yuun | Yuel |
|---|---|---|
| Product ID | `auspice_pro_monthly` · `auspice_pro_annual` | `kindred_pro_monthly` · `kindred_pro_annual` · `hexastral_compatibility` |
| Entitlement | `auspice_pro` | `kindred_pro`（合盘消耗型 **不挂**） |
| Offering Identifier（建议） | `auspice_default` 并设为 **Current** | `yuan_default` 并设为 **Current** |
| 参考价 | $4.99 / mo · $39.99 / yr | $7.99 / mo · $47.99 / yr · 合盘 $6.99 |
| 代码核对 | `AuspicePaywallSheet`：`auspice_pro_*` + entitlement `auspice_pro` | `lib/iap.ts`：`YUAN_PRODUCT_IDS` + `KINDRED_SINGLE_PRODUCT_IDS.compatibility`；购买走 `offerings.current` |

**订阅组**：每个 App **各自**建一组（Apple 不能跨 App 共用）。Reference Name 两边都可写 `hexastral_universe`（仅内部方便认）。消耗型不进组。

**MVP 禁止创建**：`universe_pro_monthly` / `universe_pro_annual`、`hexastral_personal`。

---

### 3.1 前置

- [ ] [Agreements](https://appstoreconnect.apple.com/agreements) Paid Apps = Active

---

### 3.2 ASC — Yuun 订阅

入口：https://appstoreconnect.apple.com/apps → **Yuun** → **Monetization** → **Subscriptions**

1. Create **Subscription Group** · Reference Name：`hexastral_universe` · 组显示名可写 `Yuun Pro`
2. 组内 Create Subscription ×2：

| Product ID（照抄，创建后基本不可改） | Duration | 参考价 | Display Name 示例 |
|---|---|---|---|
| `auspice_pro_monthly` | 1 Month | $4.99 | Yuun Pro Monthly |
| `auspice_pro_annual` | 1 Year | $39.99 | Yuun Pro Annual |

3. 每条必须：价格（Base + 各国）· 至少 en-US 本地化 Description ·（建议）Paywall Review 截图  
4. 状态 → **Ready to Submit**（首发须随 App 版本一起审）

权益口径（与 Free vs Pro 文案一致）：对你而言完整原因、时间轴 / 假如、八字紫微深读、亲友提醒上限放开等 — **文化参考，非预测**。

- [ ] Yuun 月 + 年 Ready  

**Family Sharing**：MVP 可选开（同住家人共享订阅资格）；不挡上架。不配 Sandbox Test Family 也可先过审。

---

### 3.3 ASC — Yuel 订阅 + 合盘消耗型

入口：https://appstoreconnect.apple.com/apps → **Yuel** → **Monetization**

**A. Subscriptions**（新建本组，Reference Name 仍可用 `hexastral_universe`）

| Product ID | Duration | 参考价 | Display Name 示例 |
|---|---|---|---|
| `kindred_pro_monthly` | 1 Month | $7.99 | Yuel Pro Monthly |
| `kindred_pro_annual` | 1 Year | $47.99 | Yuel Pro Annual |

权益口径（对齐 `lib/iap.ts`）：个人命书、每月关系层、活层（timeline / what-if / **月额度** AI）、每月最多 **3** 次合盘解锁或生辰重算。**不要写无限 AI / 无限合盘。**

**B. In-App Purchases → Consumable**（不在订阅组）

| Product ID | 参考价 | Display Name 示例 |
|---|---|---|
| `hexastral_compatibility` | $6.99 | Compatibility unlock / 合盘解锁 |

服务端：RevenueCat `NON_RENEWING_PURCHASE` → 记购买 → 客户端再 `POST /bonds/:id/unlock` 落到具体 bond。无 entitlement 开关。

- [ ] Yuel 月 + 年 Ready  
- [ ] `hexastral_compatibility` Ready  

---

### 3.4 RevenueCat

入口：https://app.revenuecat.com → 对应 Project（Yuun / Yuel 各挂一个 iOS App，Bundle ID 对齐）

1. **Apps**：`com.hexastral.yuun` · `com.hexastral.yuel`；按 RC 提示填 ASC App-Specific Shared Secret  
2. **Entitlements**：创建 `auspice_pro`、`kindred_pro`（**不要** `universe_pro`）  
3. **Products**：从 App Store Import（或手建），ID 与 ASC **一字不差**（共 5 个）  
4. **Attach**：  
   - `auspice_pro` ← `auspice_pro_monthly` + `auspice_pro_annual`  
   - `kindred_pro` ← `kindred_pro_monthly` + `kindred_pro_annual`  
   - `hexastral_compatibility` → **不挂** entitlement  
5. **Offerings**：  
   - 建 `auspice_default`：Monthly / Annual package → 两个 `auspice_pro_*` → 设为 Yuun App 的 **Current**  
   - 建 `yuan_default`：Monthly / Annual → 两个 `kindred_pro_*` → 设为 Yuel App 的 **Current**  
   （客户端读 `offerings.current`，Current 设错则 Paywall 无价 / 买不了）  
6. **Integrations → Webhooks**：  
   - URL：`https://api.hexastral.com/webhooks/revenuecat`  
   - Auth：`Bearer <与 Worker 相同的 REVENUECAT_WEBHOOK_SECRET>`  
   - 事件：`INITIAL_PURCHASE` · `RENEWAL` · `CANCELLATION` · `EXPIRATION` · `NON_RENEWING_PURCHASE`  
7. **API keys**：各 App iOS 公开钥 `appl_…` → 下一步 EAS；另复制 **Secret** REST key 给 Worker（不是 `appl_`）

- [ ] 5 products + 2 entitlements + 2 offerings（Current）  
- [ ] Webhook 接通  

---

### 3.5 Worker + EAS 密钥

在本机仓库（需已登录 Cloudflare / Expo）：

```bash
cd apps/hexastral-api
bunx wrangler secret put REVENUECAT_WEBHOOK_SECRET   # = RC webhook Bearer
bunx wrangler secret put REVENUECAT_API_KEY            # RC Secret REST key
# Yuun Pro 个人日历若启用：
bunx wrangler secret put CYCLE_CALENDAR_SECRET
```

确认 production：**`ALLOW_DEV_PRO=0`**。

EAS（https://expo.dev → 各项目 Secrets，或 `eas secret:create`）：

- [ ] Yuun / Yuel production 注入真实 `EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_…`（禁止 `REPLACE_WITH_*` 进生产包）  
- [ ] `eas.json` → `submit.production.ios.ascAppId` = ASC 数字 Apple ID；`appleTeamId` = `L9Z47DW56X`

**沙盒自测**：Sandbox 账号 → TestFlight / 生产包 Paywall → RC Customers 出现 `auspice_pro` / `kindred_pro`；Yuel 再测一次合盘消耗型购买。

---

## 4. 截图

入口：ASC → 版本页 → App Store 预览和截图  

尺寸（至少）：**6.9"** ≈ 1320×2868 · **6.5"** ≈ 1242×2688（按 ASC 当前档位上传）。`supportsTablet: false` → **不传 iPad**。四语都要。

**Yuun 建议镜位**：今日干支宜忌 → 月历 → 文化 →「对你而言」Pro 钩子 → 设置 / 提醒。Widget/Watch 未在包内验证前 **不要** 在截图或 ASO 宣称。

**Yuel 建议镜位**：Bonds 首页 → 双盘合盘 → 时间轴 → 邀请流 → Paywall（Pro + 合盘解锁入口）。

- [ ] Yuun 四语上传完  
- [ ] Yuel 四语上传完  

---

## 5. EAS 生产包 → TestFlight → 提审

栈：Expo 54 · EAS Build / Submit（云打包上架；本机 `expo run:ios` 只做开发）。

```bash
# Yuun 先
cd apps/auspice-app
bunx eas-cli login
bunx eas-cli build --profile production --platform ios
bunx eas-cli submit --platform ios --profile production --latest

# Yuel（可先打好包；Submit for Review 等 Yuun Approved）
cd apps/kindred-app
bunx eas-cli build --profile production --platform ios
bunx eas-cli submit --platform ios --profile production --latest
```

- [ ] 生产密钥与 `ascAppId` 已实装（§3.5）后再打 production  
- [ ] ASC TestFlight：Processing → Ready to Test；Export Compliance 选 **No**（仅标准 HTTPS）  
- [ ] [Users](https://appstoreconnect.apple.com/access/users) 加人 → TestFlight **Internal Testing** 绑 build → 真机安装  

### 5.1 冒烟（Submit 前）

**Yuun**：今日宜忌可读 → 订阅入口 Sign in with Apple → 沙盒买月/年 → `auspice_pro` 生效 → Restore →（若开）删号路径。

**Yuel**：建 / 看 bond → Paywall 月年价可见 → `kindred_pro` → 合盘墙可买 `hexastral_compatibility` → 邀请链接 Copy 含 URL → Delete Account。

- [ ] Yuun 冒烟过  
- [ ] Yuel 冒烟过  

### 5.2 Submit for Review

入口：ASC → 版本页 → 选 Build → 填 App Review Information → **Submit**

```
Test account: (none required — anonymous-first)
To exercise Pro: tap any Pro element → Sign in with Apple/Google → restore purchases works for re-review.
Publisher: UseONE, LLC.

Yuun: Chinese almanac (stem-branch / yi-ji / solar terms) — cultural reference, not fortune-telling or medical advice. Sign-in primarily at subscribe.

Yuel: BaZi couples typology — entertainment / cultural reference, not matchmaking. Sign-in to store bonds. Pro: monthly AI allowance + up to 3 synastry unlocks/recomputes per month; one-time product hexastral_compatibility remains available.
```

- [ ] **Yuun** Submit  
- [ ] 等 **Yuun Approved**  
- [ ] 同日 **Yuel** Submit（勿与 Yuun 同时塞进审核队列）

---

## 6. 提审后

- [ ] 盯 Crash / TestFlight feedback  
- [ ] RC Webhook deliveries + Worker 日志  
- [ ] **不要** 开 `universe_pro`，直到多 App 稳定  

---

## 7. 故障速查

| 症状 | 先查 |
|---|---|
| 订阅 Missing Metadata | Paid Apps 协议 / 缺价格 / 缺本地化 |
| Paywall 无价 / 买不了 | RC Offering 是否 **Current**；Product ID 是否与代码一字不差；EAS 是否仍是 `REPLACE_WITH_*` |
| `eas submit` 找不到 App | `ascAppId`；是否登录 LLC 团队 |
| 证书失败 | `bunx eas-cli credentials`；Team `L9Z47DW56X` |
| TestFlight 无邀请 | Internal 测试员须先在 ASC People |
| 隐私链接 404 | hexastral-web 未部署或 path 写错 |
| 合盘买了仍锁 | webhook `NON_RENEWING_PURCHASE`；是否调用了 bond unlock API |

---

## 8. MVP 之后（短建议，本清单不做）

1. **TK / Meta / Google 广告**：再在 iOS 接 SDK；ASC 补 Advertising Data / Device ID、Tracking 与 ATT；接好后再改隐私标签。  
2. **转化分析**：强化 push / DDL / 广告 click id → 订阅转化看板；现有 growth + `svc-ad-convert`（Web）可延伸，不必与首发绑死。  
3. **Apple Family Sharing**：订阅产品可开「与家人共享」；用 Sandbox Test Family 验证。适合同住/夫妻；**不能**替代 Yuel 邀请与跨 Apple ID 合盘。自建「家庭席位 SKU」另立项目。  
4. **`universe_pro`**：跨 App 全家桶，等 Yuun + Yuel（+ 更多卫星）稳定后再开。  
5. **客户端 Diagnostics**：接 Sentry / `initCrashReporting` 后再勾 Crash Data。
