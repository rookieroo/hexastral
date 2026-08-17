# Yuun — Google Play Console 提交表单包

> **用途**：把 Play Console 侧的人工表单一次列清 —— 建应用、商店文案、图形资产、
> Data safety、内容分级、上传 .aab、发布轨道。与 iOS 侧
> [asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md) 对应，本文只覆盖 Google Play。
>
> **现状（2026-08-17）**：iOS 已提交审核；GP 按 [handoff-2026-08-14.md](../handoff-2026-08-14.md)
> 目标 **2026-09-30 上架**。仓库侧（no-IAP 免费版）已就绪：production 构建
> `EXPO_PUBLIC_IAP_ENABLED=false`、googlePlay 四语文案含免责声明、法律页生产 200。
> 剩余工作 = Play Console 表单 + 上传 `.aab`。

---

## 0. 前置事实（决定时间线的关键）

| 事实 | 值 |
|---|---|
| 包名（永久） | `com.hexastral.yuun`（与 `apps/auspice-app/app.json` / `android/app/build.gradle` 一致） |
| 显示名 | Yuun |
| 类目 | Reference（副类 Lifestyle） |
| 定价 | Free（no-IAP 首发，**不建** Play Billing 商品） |
| 开发者主体 | US LLC（组织账号）+ EIN |
| 隐私政策 URL | `https://yuun.hexastral.com/privacy/yuun`（已验 200，4 locale 均可用） |
| 条款 URL | `https://yuun.hexastral.com/terms`（200） |

**封闭测试规则（决定能否赶上 9/30）**：Play 要求 2023-11-13 之后创建的**个人账号**
上生产前完成 12 测试者 × 14 天封闭测试（原 20 人）；**组织账号豁免**。
本仓库计划用 LLC 组织账号 → 可直上生产轨道，无需 14 天封闭测试。
若账号因故开成了个人账号，14 天测试窗口必须立即启动，否则 9/30 无望。
（[primetestlab](https://primetestlab.com/blog/personal-vs-organization-google-play-account-12-testers) ·
[dev.to](https://dev.to/tizoc_araujo_3cd9fb67191f/google-play-personal-account-vs-organization-account-does-the-12-tester-rule-apply-to-you-242n)）

**免费应用无需银行/税务表**：Free Apps Agreement 不要求收款账户；W-8BEN 在 IAP
开闸时再交。组织验证（D-U-N-S / 法人文件）在账号创建时完成。

---

## 1. 创建应用（Play Console → All apps → Create app）

| 字段 | 填什么 |
|---|---|
| App name | `Yuun` |
| Default language | English (United States) — en-US |
| App or game | App |
| Free or paid | Free |
| 声明 | 不承诺提供医疗功能 / 不涉及 COVID-19 / 不含广告（见 §6） |

应用创建后：`Setup → App content` 逐项完成，全部变绿才可提交审核。

---

## 2. 商店文案（Main store listing + 3 个追加语言）

主语言 **en-US** 从 `apps/auspice-app/aso-metadata.json` → `googlePlay.locales.en-US`
**整段复制**；追加 **zh-Hans / zh-Hant / ja** 各建一个语言条目，同样整段复制。
不要手打。字数上限已由 `node scripts/aso-charcount.mjs` 校验（标题 30 /
短描述 80 / 完整描述 4000，四语全在限内）。

四语完整描述末尾均已带免责声明（与 App 内 `legalDisclaimerShort` 同口径）：

- en：`Based on traditional almanac and chart culture - for entertainment, cultural exploration, and personal reflection only. Not medical, legal, financial, or life advice.`
- zh-Hans：`基于传统历法与命理文化，仅供娱乐、文化探索与个人省思，不构成医疗、法律、财务或人生决策建议。`

**不要**在 Play 描述里写：组件/手表/锁屏声明（Android Glance 组件矩阵未跑）、
Pro 价格（商店描述不得宣传包内不可购买的内容）、`astrology/fortune/占星/算命`
等词（见 `_doNotUse`）。

Listing 其他字段：

| 字段 | 填什么 |
|---|---|
| Short description / Full description | 按上面复制 |
| App icon | `apps/auspice-app/assets/icon.png`（1024×1024，直接可用） |
| Feature graphic | **1024×500** 横版；需人工制作（用 almanac 视觉素材，不加组件/手表声明） |
| Phone screenshots | 2–8 张，9:16（如 1080×1920）或 16:9；见 §3 |
| Category | Reference（副类 Lifestyle） |
| Tags | 最多 5 个（如 `almanac`, `calendar`，选列表里存在的） |
| Contact email | `props@hexastral.com`（或 LLC 正式联系邮箱） |
| Privacy policy URL | `https://yuun.hexastral.com/privacy/yuun` |
| Website（可选） | `https://yuun.hexastral.com` |

---

## 3. 截图资产（Android 规格）

Play 校验：JPEG/24-bit PNG、每边 320–3840px、**必须 16:9 或 9:16**。
现有 iOS 素材是 iPhone 6.9" 竖版 1320×2868（≈9:19.5），**Play 会拒收**，需转 9:16。

可复用清单（`docs/publish/screenshots/yuun/6.9/<locale>/`）：

| 源文件 | GP 用？ | 说明 |
|---|---|---|
| `M1-modern-home.png` / `M2-modern-month.png` | ✅ | 主图：Today 首页 + 月历 |
| `S1-home` `S2-display` `S3-glossary` `S4-me` | ✅ | 免费面（黄历/设置/文化库） |
| `deck/01-almanac-home` `03-month` `04-culture-deep` `05-find-a-date` `06-settings` | ✅ | 同上，deck 组 |
| `deck/02-widget.png` | ❌ | 组件声明未达证据门槛，GP 版不放 |

转换：等比缩到宽 1080（高 2346）后居中裁到 1080×1920，或人工按
[screenshot-direction.md](./screenshot-direction.md) 重新导出。
**不要**出现购买 UI（IAP 关）、Pro 价格、组件/手表画面。

---

## 4. Data safety 表单（逐项答案）

口径与 App Store Privacy Nutrition Labels 对齐（见 [publish/README.md](./README.md) §2）。
Yuun 实际数据流：匿名 `deviceId` + Expo push token（本地/推送注册）、可选生辰
（本地存储，多设备同步开启时才写账号）、Google 登录邮箱、推送打开指标的盐化
单向设备键（不关联账号）。**无追踪广告、无数据共享。**

| Play 问题 | 答案 |
|---|---|
| 收集数据？ | **是**，以下 4 行 |
| ・ App activity | 收集 · 不共享 · Analytics（推送打开指标，盐化 key 不可关联账号） |
| ・ Device or other IDs | 收集 · 不共享 · App functionality（匿名 deviceId / push token） |
| ・ Personal info → Date of birth | 收集 · 不共享 · App functionality（可选；同步需用户开启多设备同步） |
| ・ Personal info → Email address | 收集 · 不共享 · Account management（仅 Google 登录时） |
| 共享数据？ | **否**（所有行 "Not shared"） |
| 传输加密？ | **是**（HTTPS） |
| 用户可否请求删除？ | **是** — 应用内 Settings → Delete account（无需提交请求即删） |
| 是否面向儿童/家庭？ | **否**；目标受众 **13+** |
| 其他 | 无广告；不承诺 Families Policy |

---

## 5. 内容分级问卷（IARC）

按事实回答：无暴力 / 无性内容 / 无脏话 / 无烟酒药 / **无赌博模拟**（黄历非
博彩）、无用户生成内容、不分享位置、无社交功能。预期结果 **Everyone 或 Teen**
（系统据答案给分，不需要手动指定 12+）。

---

## 6. 其他 App content 声明

| 项 | 答案 |
|---|---|
| Ads | **No ads** |
| App access | 所有功能匿名可用，无需登录；审核员无需账号（可选填 "all functionality available without sign-in"） |
| Target audience | **13+**（有账号体系 + 收集可选个人数据，不选儿童） |
| News / 政府信息 | 不适用 |
| Financial features | **无**（免费版无任何支付） |

---

## 7. 上传与发布（9/30 倒排）

1. **构建产物**：`apps/auspice-app` → `eas build --profile production --platform android`
   产出 `.aab`（本次会话已触发构建；keystore 已由 EAS 托管创建，versionCode 自动递增）。
2. **上传**：Play Console → Release → Production → Create release → 拖入 `.aab`。
   （也可配 service account JSON 后用 `eas submit --platform android`，手动上传更省事。）
3. **轨道**：组织账号可直上 Production。稳妥做法：先 Internal testing 自装真机
   跑 [pre-submit-smoke.md](../apps/yuun/pre-submit-smoke.md)（Today/日历/生辰/推送/
   Google 登录/删号 + Glance 组件安装路径），再 promote 到 Production。
4. **审核时长**：新开发者账号首 App 一般 2–7 天；**9/22 前提交**留足余量。
5. **发布后**：商店页回归（四语标题/描述/截图/隐私链接）、推送 token 注册、
   错误率监控（Sentry）。

## 8. 上架后（后置，不阻塞本次）

- Airwallex 收款账户 → Play merchant 绑定
- Play Billing：`auspice_pro_monthly` / `auspice_pro_annual` + RC `goog_*` key +
  `EXPO_PUBLIC_IAP_ENABLED=true` **随新版本**提交首个订阅（[release-config-gate.md](../apps/yuun/release-config-gate.md)）
- W-8BEN（ITIN，中美协定版税 10%）在 IAP 开闸前提交

---

## 9. 常见拒因（玄学品类，提前规避）

- 描述/截图宣传包内不存在的功能（组件声明、Pro 价格）→ 本包已剥离
- 医疗/财务建议暗示 → 免责声明已写入四语描述 + App 内
- 数据安全表与实际不符 → 按 §4 逐行核对；App 内隐私文案与之一致
- 图标/截图规格不符 → 9:16 转换见 §3
- 隐私政策打不开 → 已验 200；提交前再 curl 一次

**完成定义**：Play Console 内 App content 全绿 → Production 轨道提交审核 →
商店页可公开访问（发布后）。
