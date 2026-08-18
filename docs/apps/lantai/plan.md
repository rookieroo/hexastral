# Lantai（Flare for Notion）— 产品与落地计划

> 状态：草案 **v0.7** · 2026-08-18 · **M1a 脚手架已进仓库**（`apps/lantai-app` + `/api/lantai` + `GET /s/:id`）。D1 `lantai_*` 已 migrate prod。
> 代码落位：`apps/lantai-app` + `hexastral-api` `/api/lantai/*`（公开面）
> `services/svc-notion`：v1 **不建**（公开 Worker 禁止；AI 采集也不再塞进 Lantai）
> 姊妹文档：待建 `product.md`（沿用 `docs/apps/xingqi/product.md` 惯例）
> **品牌已定：Lantai（兰台）**——商标/ASO/域名核查见 §11；副标题 Flare for Notion
>
> v0.7 相对 v0.6：**核心是用户自己的 Notion DB**（连接 → 选库 → 勾选属性 → 固定名快捷指令）。官方 4 个模板只是可选起点，可有可无。

---

## 1. 定位

> **Lantai = 把用户已有的 Notion 数据库配成零编辑快捷指令。**
> 核心路径：OAuth → 选你的 DB → 勾选要写入的属性 → 固定名快捷指令安装。官方模板只是可选起点，不是产品。

把 useone 的 Notion 快捷指令从 charts 产品中剥离，升级为**独立 iOS app**（避开 useone.online 的信任债）。

D1 只存连接/配置/配额，**不存用户写下的行**。Notion DB 是记录 SSOT，也是用户自己的后台。

和 hexastral 主线的关系：Yuun 已送审、Yuel 快上；Lantai 是 **wave 2 并行轨**，不挤 Yuun/Yuel 提审。

| 产品 | 做什么 | 不做什么 |
|---|---|---|
| **Lantai** | 用户自定义 DB：字段开关、图标、库、零编辑安装 | AI 模板、拍脸、记账 VLM；不强迫用官方 schema |
| **Syel** | 形气采集 + 五章报告；可选 **同步到 Notion**（复用 Lantai 连接） | 不在快捷指令里拍照 |
| **AI 采集（独立立项）** | 记账 / 饮食 / 自定义 schema+提示词 | 不塞进 Lantai 审核包 |

漏斗（无点数包；不要把「订阅=买断」写进 IAP 商品）：

| 层 | 内容 | 变现 |
|---|---|---|
| Free | 2 个快捷指令槽位 + **任意已分享的 Notion DB**（系统听写免费） | — |
| 买断 | 无限槽位/库、图标、关系字段；可选第二档多 workspace | `$2.99` / `$9.99` 非消耗 |

飞轮仍在：**快捷指令养 Notion 数据 → 数据养 useone charts**。精气神的纵向对比在 **Syel 导出到 Notion** 上讲，不在 Lantai 模板列表里讲。

---

## 2. 需求与市场依据

- **已有订单**：小红书在卖「配置好的快捷指令」；需求在配置与安装体验，不在又一个 charts SaaS。
- useone-chart 信任度建立困难 → **换独立 App + `lantai.hexastral.com`，切断主站配置入口**。
- 竞品：[Nautomate](https://apps.apple.com/us/app/nautomate/id1608529689)、[Instant Note for Notion](https://apps.apple.com/cn/app/instant-note-for-notion-%E5%8D%B3%E6%97%B6%E7%81%B5%E6%84%9F/id1639385303)——品类被验证、无爆款。
- 模板卖家：[21notion FLO.W](https://21notion.com/docs/advance-feature/iPhone-Shortcut#faq) 把语音笔记做成付费模板——中文用户为「配好的快捷指令」付费意愿真实。
- DIY 教程经济（easlo、少数派、Automators）= 需求未被产品化满足。
- 独立订阅天花板仍可能只有年买家数百至小几千；**经济模型算小红书 SKU 迁移 + charts 转化 + Syel 权益打包**，不把 Lantai 当孤立利润中心。
- 差异化：对着**用户自己的库**做结构化字段 / 图标菜单 / 关系映射 / **零编辑安装**（废除「三处名称一致」），60 秒内可见「3 分钟 vs 30 分钟」。

---

## 3. 产品范围

### v1a（先接订单：自定义 DB + 零编辑快捷指令）

- 两段 OAuth：Sign in with Apple/Google（portfolio）→ **再**连接 Notion workspace（新 integration，不复用 useone.online client id）
- **主路径：** 列出已分享的数据库 → retrieve 属性 → 用户勾选可写字段 → 生成 config
- 配置生成器：字段开关、图标、主题（从 useone `shortcuts-manager` **抽逻辑**，输出新 config JSON）
- **固定名快捷指令 + configId 分发**（§6.2）：用户零编辑
- Free 2 槽位；买断 SKU 可同版本上，也可 M1b 再开
- 官方 4 个手动模板（手记 · Inbox · 链接 · 习惯）**只作可选起点**（预填名称）；字段仍来自用户选中的库
- 系统听写由 iOS 提供，不是我们的 LLM
- `templateId = custom` 是默认；官方 id 仅作标签

### v1b（买断上架）

- `lantai_unlock` / `lantai_workspaces` 进商店；无订阅、无 AI 确认页

### 相邻产品（不是 Lantai 范围）

**Syel — 同步到 Notion（唯一入口）：** 采集与五章报告仍在 Syel。读完后可选「写入 Notion」：复用同一 portfolio 的 Lantai 连接，写结构化快照行 + 点位示意图 + `syel://`。默认**不**把原图写入 Notion，也不写入 HexAstral 磁盘。未装 Lantai / 未连 workspace 则引导去 Lantai 连一次。见 [xingqi/product.md](../xingqi/product.md)。

**AI 采集 — 独立立项（不要进 `apps/lantai-app`）：** 记账（语音+票据）、饮食、自定义 schema+提示词、图床。审核、COGS、Photos Nutrition Label 与快捷指令壳不是同一类 App。新目录 / 新 bundle 待立项时再定，不预建 `svc-notion`。

### 明确不做（Lantai）

- AI 模板、确认页、`POST /api/lantai/ai/jobs` 作为产品路径
- 精气神采集 / 快捷指令拍脸拍掌
- charts 图表功能（留在 useone）
- 自有数据管理后台（Notion 就是后台）
- UGC 社区（官方模板 + `growth-funnel` promoter）
- 原生快捷指令中台（只服务 Notion）
- **公开的 `svc-notion` Worker**
- **App 直写 iCloud Drive `/Shortcuts/`**（M0 未证实前不绑 v1）
- Web 配置编辑器、组件/手表、黄历壳、`astro-core`

### 模板路线图（可选，不是核心）

**核心 IA 是槽位 +「用我的 Notion 数据库」。** 4 个官方起点可留在次级 tab，不进空状态主 CTA。记账 / 饮食 / 精气神 / 自定义 AI **不进本表**。

---

## 4. 定价与漏斗细则

**商店里是两枚独立买断商品。** 服务端槽位权限仍是 `unlock \|\| workspaces \|\| pro` 并集（`pro` 本 App 不卖）。

| RC 商品 | 类型 | 价格 | 服务端打开什么 |
|---|---|---|---|
| `lantai_unlock` | 非消耗 | **$2.99** | 无限槽位+库 / 换库 / 图标+主题 / 关系字段（1 workspace） |
| `lantai_workspaces` | 非消耗 | **$9.99** | 上一项 + 无限 workspace（已购 unlock 后可作补差价第二个商品） |

`lantai_pro` **仍可留在 `products.ts` 目录里，Lantai 商店不卖。** 槽位并集代码里的 `pro \|\| unlock` 可保留（将来 AI 项目若共用连接），本 App 付费触发点只有买断。

| 档位（用户语言） | 付费触发点 |
|---|---|
| Free：1 ws / 2 槽 / 默认图标 / 不可换库 | — |
| 单 ws 买断 | 第 3 条、点换库、点锁图标 |
| 多 ws 买断 | 加第 2 个 workspace |

规则：

- **无点数包、无 Lantai 订阅。** **不要**在 App Store 元数据里写「订阅含买断」。
- **防绕过**：删除不返还配额；服务端锁免费档 `command.database_id`；create/update 校验 `command.database_id === body.database_id`。
- **买断边界**：TOS = v1.x 更新；大版本可另行收费。
- **槽位**：允许改 name/fields/图标（免费锁库）；免费隐藏删除；买断真删除。
- **公平使用**：TOS 隐藏写入上限（如每 db 每天 200 条），不进定价页。
- **老用户迁移**：useone 已买断快捷指令档位赠送 `lantai_unlock` / `lantai_workspaces`（首批 5 星来源）。Syel 同步 Notion 不另卖 Lantai SKU。

---

## 5. App 脚手架（Yuun 基建 + zinc 浅色，不是黄历壳）

目录：`apps/lantai-app` · bundle `com.hexastral.lantai` · scheme `lantai` · 显示名 Lantai。

**用 Yuun（`apps/auspice-app`）当基建模板，不要 rsync 黄历产品。** Yuun 的 zinc 底 + 浅色默认接近 Notion；Yuel 暖石、Syel 玉、Coin Cast 暗金都不贴。

| 从 Yuun 拿 | 不要拿 |
|---|---|
| Expo 54 / Router 6 / HMAC `@zhop/hexastral-client` | `AlmanacThemeProvider`、通书/墨棕纸 |
| `satellite-runtime` + RC `usePurchases` | Widget / Watch / App Group |
| Apple + Google 登录、`me` 设置骨架 | `astro-core`、`scenario-yuan`、亲友/timeline/make-if |
| `CoreUIProvider` + `useTheme()`，禁止硬编码色 | `brand='cycle'` 苍墨/terra 叙事 |
| `eas.json` / 隐私 Manifest 骨架 | NativeWind 黄历卡片、朱砂判决圆 |

新建 tokens：`brand='lantai'`（卫星不共享色族，ADR 色板锁定）：

- 结构：完整 `zinc` ramp（`#FAFAFA` / `#09090B`）
- 默认 **light**（Notion light-first）；尊重系统深色
- 强调色：`zinc[900]` 一条冷灰，**不要朱砂、墨金、玉**
- 卡片：flat、`borderWidth: 0.5`、`borderRadius: 0`
- 图标：单色 Lucide（与快捷指令图标菜单对齐）

i18n：**zh / zh-Hant / en / ja** 四语（同 Syel），不上满 9 语。

### 信息架构（v1a）

```
apps/lantai-app/
  app/
    _layout.tsx              # CoreUIProvider brand="lantai" mode=light-default
    (tabs)/
      index.tsx              # 槽位 +「用我的 Notion 数据库」
      templates.tsx          # 可选起点（可有可无）
      me.tsx                 # 账号 / Notion 连接 / IAP / 撤销
    config/[id].tsx          # 选库 → 拉属性 → 字段开关
    connect.tsx              # Notion OAuth（ASWebAuthenticationSession）
    install.tsx              # 安装固定名快捷指令 + 一键 run
```

依赖白名单：`core-ui` · `hexastral-tokens` · `hexastral-client` · `satellite-runtime` · `satellite-ui`（paywall）· `expo-linking` · `expo-secure-store` · `expo-apple-authentication`。**不要** widget-kit、**不要**为 AI 记账加 `expo-image-picker`。`expo-document-picker` 仅当 M0 证明需要用户自选文件夹。

`ios.infoPlist.LSApplicationQueriesSchemes: ["shortcuts"]` + `canOpenURL` 未安装引导。

从 useone-chart **抽** `shortcuts-manager` 的字段/图标/关系生成器 → 先放 `apps/lantai-app/lib/config-gen.ts`（或日后 `packages/lantai-config`）。charts 仓库不迁进 monorepo；旧快捷指令页只读 + 导流横幅。

---

## 6. 架构

### 6.1 仓库与 Worker 落位

```
hexastral/
├── apps/lantai-app/                 # Expo 卫星（Yuun 基建，lantai 主题）
├── apps/hexastral-api/              # 公开面 /api/lantai/* + GET /s/:id
│   └── src/db/schema.ts             # lantai_* 表（SSOT，bun db:generate）
├── docs/apps/lantai/                # 本计划
```

`services/*` **禁止公开路由**。OAuth 回调、secret-link、App HMAC 全部走 hexastral-api。

v1 **不建 `svc-notion`**。Syel 同步 Notion 走现有 `/api/physiognomy/*` + Lantai 连接写行，不在 lantai 路由里重写 VLM。AI 采集项目立项后再决定 Worker。

复用：portfolio 身份、`satellite-runtime` / `satellite-ui`、RevenueCat（`lantai_unlock` / `lantai_workspaces`）、`growth-funnel`。

身份：**不要第二套登录。** Apple/Google → 现有 `/api/portfolio/auth/{apple,google}`。

### 6.2 配置分发（v1 主路径）

**不要**把「App 原生写入 iCloud `/Shortcuts/lantai/`」当默认。第三方 App 通常写不进 Shortcuts 拥有的目录；useone 能跑是因为 **快捷指令自己 Save File**。原生写入 = M0 实验，验不过即删。

**主路径（已验证模式 + 固定名）：**

```
App 生成配置 → HMAC POST /api/lantai/configs → config_id
→ Linking.openURL('shortcuts://run-shortcut?name=Lantai&input=text&text=<config_id>')
→ 快捷指令：GET /s/<config_id> → Save File 到 iCloud → 之后本地读
→ 按 fields 录入；manual 模式用返回的 token 直连 Notion
```

**Web 教程兜底（Safari）：** 同一 URL；未命中缓存则同样 `GET /s/<id>`。

- 用户**零编辑**：固定名 `Lantai` + configId，废除「三处名称一致」。
- `/s/<id>` = secret-link（UUID 不可枚举）。删除 = 404 = 吊销（配额不返还）。
- `/s/<id>` 只服务手动配置；若库里仍有 `mode=ai` 的残留行，**永不返回 Notion token**。
- 更新：联网优先拉新；快捷指令本身无静默升级 → 新 iCloud 链接 + App 横幅「请重新添加最新版」。
- M0 必须真机：`shortcuts://` 拉起、Save File、vCard 远程图标、**否定 App 写 Shortcuts 目录**。

### 6.3 身份与 Notion OAuth（两段，不要写成一句）

1. Apple/Google → portfolio `userId`（与 Yuun 同一套）。
2. App 开 Notion OAuth（新 public integration；redirect `https://<api>/api/lantai/oauth/callback`）。
3. `workspace_id` + AES-256-GCM `access_token` 绑到 `userId`。密钥只在 Workers secrets；D1 只落密文；不落日志。
4. Notion token 无 refresh、不过期。撤销：App 删密文 + 深链 Notion Connections（**无官方 revoke API**）；用户在 Notion 撤销 → 下次 401 → 引导重连。

### 6.4 数据流与 SSOT

```
[App / 快捷指令] → [hexastral-api /api/lantai] → [Notion DB] ← 记录 SSOT
                         │
                         └─ D1: 连接 / 配置 / 配额（不存行内容）

[Syel 报告] → 「同步到 Notion」→ 同一套 lantai_connections → Notion 快照行
```

- 列表/编辑/删除不开发；「在 Notion 打开」深链。
- 手动模式：快捷指令持 token，按用户勾选的字段直写 **用户自己的库**。
- Notion 外链图重托管只影响快捷指令附件（M0）；与精气神原图无关（原图默认不进 Notion）。

### 6.5 D1 表（进 `schema.ts`）

| 表 | 用途 |
|---|---|
| `lantai_connections` | `user_id`, `workspace_id`, `token_ciphertext`, `token_nonce` |
| `lantai_configs` | `id` (uuid), `user_id`, `database_id`, `mode` (`manual`\|`ai`), `command_json`, `revoked_at` |
| `lantai_usage` | 预留计数表（Lantai v1 不用；Syel 导出 / 未来 AI 项目可共用） |

`bun db:generate` 后人工看 SQL，再生产 `bun db:migrate:prod`（需明确批准）。

### 6.6 公开路由（hexastral-api）

| 路由 | 鉴权 | 职责 |
|---|---|---|
| `/api/lantai/oauth/*` | 浏览器 / ASWebAuth | Notion 授权回调 |
| `CRUD /api/lantai/configs` | HMAC | 配置；`templateId=custom` 默认；免费档锁换库 |
| `GET .../databases` | HMAC | 已分享的库列表 |
| `GET .../databases/:id` | HMAC | retrieve 属性 → 可写字段 |
| `GET /s/:id` | 无（secret-link） | 快捷指令拉配置；IP+id 双限流；**只返回手动配置 + token** |

日志只记 `config_id` 前 8 位哈希。`POST /api/lantai/ai/jobs` **不是产品路径**（仓库里若仍有 stub，保持 501，不接客户端）。

Syel「同步到 Notion」另走 HMAC（physiognomy 或 `/api/lantai/export` 一类），由 Syel 客户端触发，不经过快捷指令。

### 6.7–6.8 已迁出

记账 / 饮食管线、Gemini fallback、饮食护栏 → **AI 采集立项文档**。精气神照片生命周期 → **Syel / ADR-0028**（同步 Notion 时默认不写原图）。

### 6.9 凭证分层

Lantai v1 **只有手动模式**：`/s/:id` 返回给快捷指令用的 Notion token（secret-link）。

- `config_id` = 能力凭证（UUID v4）；撤销/轮换即失效。
- 服务端 revoke 杀不死已缓存的 iCloud 配置。UI 必须写清：「撤销云端访问并清设备缓存；彻底断开请同时在 Notion Connections 撤销」。
- 撤销入口：单条重置（新 id + 一键 bootstrap）/ 安全中心全部撤销 / 断开 Notion / 账号删除级联。
- 自有 PAT：v1 不做。

**官方快捷指令：** 固定名 `Lantai`；config 驱动字段。schema 版本：`latest_shortcut_version`，App 弹重新添加横幅。

---

## 7. 合规（仅海外商店，不上国区）

- **国区 App Store 不做**（ICP / 第三方数据连接）。**获客仍走小红书** → 港区/美区 Apple ID + TestFlight。plan 里这两句必须同时成立。
- Lantai Nutrition Label：不声明自拍/掌纹采集。快捷指令若选图进 Notion，那是用户与 Notion 的关系；App 侧按「配置器 + 打开 Shortcuts」披露。
- **删除**：账号删除清 D1 连接/配置密文；Notion 行用户自己在 Notion 删。文案：「记录默认在你本人的 Notion，可随时删」。
- 精气神同意 / Photos / `_doNotUse` / 形气地区开关 → **Syel 审核包**，不进 Lantai listing。
- 无国区 → 无 PIPL 出境硬评估。

---

## 8. Web / 社区 / 域名

- 域名：`lantai.hexastral.com`（隐私/条款/支持/落地页）；ASC policy + support 即此域。备用 `lantai.dev` 可注册防抢注。
- v1 Web：落地页 + 模板展示 + 教程/FAQ + 支持。**不做 web 配置编辑器。**
- 旧 useone 快捷指令页：只读 + 导流 Lantai App（时间表见 §10.3）。
- 社区 v1 不做。替代：官方模板 + promoter 分佣。

---

## 9. 里程碑

| 里程碑 | 内容 | 出口标准 |
|---|---|---|
| **M0** | ① 固定名 + `config_id` 拉起 + Save File ② vCard 远程图标 ③ **否决 App 写 `/Shortcuts/`** ④ 外链图是否重托管（仅手动附件） | 主路径定稿 |
| **M1a** | `lantai-app` + `/api/lantai`：OAuth、选用户自己的 DB、字段开关、2 槽、安装快捷指令 | 真机写入用户已有 Notion 库 |
| **M1b** | `lantai_unlock` / `lantai_workspaces` 上架 | 买断转化；无订阅 |
| **M5** | ASO + 模板卖家 promoter + PH | 海外商店上架 |

Syel「同步到 Notion」、AI 采集立项 **不占用 Lantai 里程碑号**。

冷启动：**小红书订单 → TestFlight（M1a）** → 少数派/模板卖家 → PH → 海外 App Store。旧 useone 页导流并行，**不是**主通道。

---

## 10. 风险

| 风险 | 对策 |
|---|---|
| App 无法写 `/Shortcuts/` | v1 不依赖；M0 否决即走快捷指令 Save File |
| Notion 不重托管外链图 | M0 证伪则 R2 永久 + 级联删除 |
| 快捷指令 URL/图片限制 | M0 实测；超限则限字段或运行时拉取 |
| 免费 2 槽覆盖多数需求 | 图标/换库做触发；上线后调 1/2 槽 |
| 买断两档在 RC 里补差价 | 实现前拍板（升级商品 vs 第二枚非消耗） |
| 国区需求 vs 不上 CN 商店 | 小红书文案写清港/美区下载 + TestFlight |
| 4.2 功能过薄 | 配置器必须走完「选用户自己的库 + 勾选属性」；Shortcuts 只是运行时 |
| 3.1.1 站外收费 | 小红书只获客；解锁只走 IAP |
| 拷贝 Yuun 带进黄历壳 | §5 依赖白名单；禁止 `astro-core` / widget-kit |
| useone 双轨 | 新 App 上线后旧页只读 + 横幅 |
| 把 AI/精气神塞回 Lantai | 拒绝；见 §3 |

---

## 11. 开放问题

1. ~~品牌名~~ ✅ **Lantai**，副标题 Flare for Notion（§11.1）
2. **免费槽位**：2 还是 1（转化数据定）
3. **旧 useone 快捷指令页**只读时间表：建议 M1a TestFlight 起加横幅，M5 上架后完全只读
4. ~~订阅定价 / 买断升订阅抵扣~~ — Lantai 不卖订阅；若 AI 项目要订阅，在那边单开
5. ~~Gemini fallback~~ — 随 AI 项目，不在 Lantai
6. ~~AI 凭证~~ ✅ Lantai 只有手动 `config_id`；不引入自有 PAT
7. ~~Web/域名~~ ✅ `lantai.hexastral.com`；v1 无 web 编辑器、无 UGC
8. ~~自定义 AI 模板~~ ✅ **独立立项**，不是 Lantai v2
9. ~~公开 svc-notion~~ ✅ 不建
10. ~~原生写 iCloud Shortcuts 目录~~ ✅ 不作为 v1 主路径
11. **`lantai_workspaces` 对已购 unlock 的补差价**在 RC 里怎么配（升级商品 vs 第二个非消耗）— 实现前拍板
12. ~~精气神谁采集~~ ✅ **Syel 采集 + 同步到 Notion**；Lantai 只提供连接

### 11.1 品牌名（已定：Lantai）

- **Lantai（兰台）**——汉代皇家档案机构；读音 **LAN-tie**。不要用 Orchid Terrace 做主英文名。
- App Store：标题 `Lantai` · 副标题 `Flare for Notion` · 关键词 `notion,shortcut,database,journal,inbox,habit`（不要把 ai/ledger/diet/face 写进 Lantai 关键词）
- USPTO：活标多为「LANTAI PARTNERS」Class 045；无独立 LANTAI Class 9。正式申请前 TESS + 代理 clearance。
- CN 页面不用「兰台」中文露出（律所在华已用），用 Lantai。
- 域名：主域 `lantai.hexastral.com`；顺手注册 `lantai.dev`。
