# Lantai（Flare for Notion）— 产品与落地计划

> 状态：草案 **v0.5** · 2026-08-18 · **M1a 脚手架已进仓库**（`apps/lantai-app` + `/api/lantai` + `GET /s/:id`）。未跑 `db:migrate:prod`；M0 真机实验 / v1b AI / ASC+RC 商品仍待办。
> 代码落位：`apps/lantai-app` + `hexastral-api` `/api/lantai/*`（公开面）
> `services/svc-notion`：**M2 可选项**，v1 不建公开 Worker
> 姊妹文档：待建 `product.md`（沿用 `docs/apps/xingqi/product.md` 惯例）
> **品牌已定：Lantai（兰台）**——商标/ASO/域名核查见 §11；副标题 Flare for Notion
>
> v0.5 相对 v0.4：公开面改走 hexastral-api；配置分发改快捷指令自取（否定 App 直写 `/Shortcuts/`）；
> 定价改三枚 RC SKU + 服务端并集；v1 模板砍到 4+1；M1 拆 a/b；脚手架用 Yuun 基建 + zinc 浅色，不用黄历壳。

---

## 1. 定位

> **Lantai = 小红书已验证的快捷指令 SKU 的 App 化载体 + Syel 档案的 Notion 采集/回顾层 + useone charts 的数据上游。**

把 useone 的 Notion 快捷指令从 charts 产品中剥离，升级为**独立 iOS app**（避开 useone.online 的信任债）。

> **AI 采集层 + Notion 事实层。**
> 用户拍照/说话 →（可选）AI 结构化 → 写入用户自己的 Notion DB。
> 我们的服务器不存记录：D1 只存配置与配额，R2 只做中转，**Notion DB 是唯一事实来源（SSOT），也是用户自己的后台管理端**。

和 hexastral 主线的关系：Yuun 已送审、Yuel 快上；Lantai 是 **wave 2 并行轨**，不挤 Yuun/Yuel 提审。Syel 完整 App 仍按 ADR-0028 后置；**市场叙事**绑在 Lantai 精气神模板（Notion 行里看得见变化），不硬推 standalone Syel 首发。

三层漏斗（无点数包；商店 SKU 映射见 §4，不要把「订阅=买断」写进 IAP 商品）：

| 层 | 内容 | 变现 |
|---|---|---|
| Free | 2 个快捷指令槽位 + 首批手记模板（系统听写免费） | — |
| 买断 | 无限槽位/库、图标、关系字段；可选第二档多 workspace | `$2.99` / `$9.99` 非消耗 |
| 订阅 | AI 模板 + 图床；服务端把槽位权限与买断做**并集** | 月/年订阅（含 AI 月度公平用量上限） |

飞轮：**采集养数据 → 数据养 useone charts → charts 反哺品牌**。记账/饮食用户跑两个月，Notion 里就是 charts 最精准的获客名单。精气神快照行让 Syel 的纵向变化可在 Notion 视图里筛选、对比、汇总——这是 Syel 单独做时缺少的宣传点。

---

## 2. 需求与市场依据

- **已有订单**：小红书在卖「配置好的快捷指令」；需求在配置与安装体验，不在又一个 charts SaaS。
- useone-chart 信任度建立困难 → **换独立 App + `lantai.hexastral.com`，切断主站配置入口**。
- 竞品：[Nautomate](https://apps.apple.com/us/app/nautomate/id1608529689)、[Instant Note for Notion](https://apps.apple.com/cn/app/instant-note-for-notion-%E5%8D%B3%E6%97%B6%E7%81%B5%E6%84%9F/id1639385303)——品类被验证、无爆款。
- 模板卖家：[21notion FLO.W](https://21notion.com/docs/advance-feature/iPhone-Shortcut#faq) 把语音笔记做成付费模板——中文用户为「配好的快捷指令」付费意愿真实。
- DIY 教程经济（easlo、少数派、Automators）= 需求未被产品化满足。
- 独立订阅天花板仍可能只有年买家数百至小几千；**经济模型算小红书 SKU 迁移 + charts 转化 + Syel 权益打包**，不把 Lantai 当孤立利润中心。
- 差异化：结构化字段 / 图标菜单 / 关系映射 / **零编辑安装**（废除「三处名称一致」），60 秒内可见「3 分钟 vs 30 分钟」。

---

## 3. 产品范围

### v1a（先接订单：零编辑快捷指令，无 AI）

- 两段 OAuth：Sign in with Apple/Google（portfolio）→ **再**连接 Notion workspace（新 integration，不复用 useone.online client id）
- 配置生成器：字段选择、图标、主题（从 useone `shortcuts-manager` **抽逻辑**，输出新 config JSON）
- **固定名快捷指令 + configId 分发**（§6.2）：用户零编辑
- Free 2 槽位；买断 SKU 可同版本上，也可 M1b 再开
- 官方模板只做 4 个：手记 · 待办 Inbox · 链接收藏 · 习惯打卡

### v1b（订阅：AI 记账）

- 语音 + 票据拍照 → 确认页 → 写入（订阅；门槛在服务端）

### v1.5

- 饮食记录模板（VLM + 膳食指南锚定 + 合规护栏）
- R2 staging → Notion 重托管（食物照默认归档）——**以 M0 实验为准**

### v2

- 精气神档案模板（Syel 桥：自拍+左右掌 → 结构化快照行 + 点位示意图 + `syel://` 深链）
- 自定义 AI 模板（旗舰）：用户定义 DB 字段 + 自定义提示词
- useone charts 交叉推广

### 明确不做（v1）

- charts 图表功能（留在 useone）
- 自有数据管理后台（Notion 就是后台）
- UGC 社区（官方模板 + `growth-funnel` promoter）
- 原生快捷指令中台（只服务 Notion）
- **公开的 `svc-notion` Worker**（违反 `services/*` 无公开路由）
- **App 直写 iCloud Drive `/Shortcuts/`**（M0 未证实前不绑 v1）
- Web 配置编辑器、组件/手表、黄历壳、`astro-core`

### 模板路线图

**v1 首发（只这 5 个进 IA）：**

| 类型 | 模板 |
|---|---|
| Free 手动 | 灵感速记 · 待办 Inbox · 网页/链接收藏 · 习惯打卡 |
| 订阅 AI | 记账（语音+票据） |

其余手记/采集/生活/工作模板作为 JSON 包附录，不进 v1 导航。系统听写全部手动模板都支持。

**后续 AI（订阅）：**

| 波次 | 模板 |
|---|---|
| v1b | AI 记账 |
| v1.5 | AI 饮食 |
| v2 | 精气神（Syel 桥）；候选：名片→CRM、拍书页→摘抄、语音→日记 |
| v2 旗舰 | 自定义 AI 模板（schema + 用户提示词 + 月度计次；护栏照抄饮食） |

---

## 4. 定价与漏斗细则

**商店里是三枚独立商品**，不是「一个订阅冒充买断」。服务端做权益并集。

| RC 商品 | 类型 | 价格 | 服务端打开什么 |
|---|---|---|---|
| `lantai_unlock` | 非消耗 | **$2.99** | 无限槽位+库 / 换库 / 图标+主题 / 关系字段（1 workspace） |
| `lantai_workspaces` | 非消耗 | **$9.99** | 上一项 + 无限 workspace（已购 unlock 后可作补差价第二个商品） |
| `lantai_pro` | 订阅 | **$3.99/月 或 $24.99/年（候选）** | AI 模板 + 图床；**槽位权限 = `pro \|\| unlock`**（并集，不是商店「包含买断收据」） |

| 档位（用户语言） | 付费触发点 |
|---|---|
| Free：1 ws / 2 槽 / 默认图标 / 不可换库 | — |
| 单 ws 买断 | 第 3 条、点换库、点锁图标 |
| 多 ws 买断 | 加第 2 个 workspace |
| 订阅 | 任一 AI 模板运行 |

规则：

- **无点数包**。已买断用户可随时开订阅；首年是否抵扣买断费用——待定（M4）。**不要**在 App Store 元数据里写「订阅=拥有 $9.99 买断」。
- **AI 门槛在服务端**：AI 模板对 Free/买断可见、可创建配置，运行校验 `config_id → owner → lantai_pro` → 402。买断不含 AI 运行。
- **防绕过**：删除不返还配额；服务端锁免费档 `command.database_id`；create/update 校验 `command.database_id === body.database_id`。
- **买断边界**：TOS = v1.x 更新；v2 大版本可另行收费；AI 永远不在买断里。
- **槽位**：允许改 name/fields/图标（免费锁库）；免费隐藏删除；买断真删除。
- **公平使用**：TOS 隐藏写入上限（如每 db 每天 200 条），不进定价页。AI 月度：记账 100 · 饮食 30 · 精气神 6。
- **老用户迁移**：useone Pro/Business/已买断按档位赠送对应 RC 权益（首批 5 星来源）。

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
      index.tsx              # 槽位列表（Notion 式，无底栏黄历）
      templates.tsx          # 官方 4+1 模板
      me.tsx                 # 账号 / Notion 连接 / IAP / 撤销
    config/[id].tsx          # 字段/图标/库
    connect.tsx              # Notion OAuth（ASWebAuthenticationSession）
    install.tsx              # 安装固定名快捷指令 + 一键 run
    confirm/[jobId].tsx      # v1b 记账确认页
```

依赖白名单：`core-ui` · `hexastral-tokens` · `hexastral-client` · `satellite-runtime` · `satellite-ui`（paywall）· `expo-linking` · `expo-secure-store` · `expo-apple-authentication` · `expo-image-picker`（v1b）。**不要** widget-kit。`expo-document-picker` 仅当 M0 证明需要用户自选文件夹。

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
├── services/svc-notion/             # M2 可选：内部 AI ingest + R2；workers_dev: false
├── docs/apps/lantai/                # 本计划
```

`services/*` **禁止公开路由**。OAuth 回调、secret-link、App HMAC 全部走 hexastral-api（与 `/api/auspice/*` 同模式）。

v1 **先不要 svc-notion**：记账是短 JSON 抽取，放 API（或 Queue）。饮食/精气神 Worker 超时再拆。精气神 VLM **不复制**：调用现有 `svc-astro` faceoracle；`svc-notion`（若建）只做「结构化结果 → Notion 行」。

复用：`packages/ai-vision`、portfolio 身份、`satellite-runtime` / `satellite-ui`、RevenueCat（`lantai_*` SKU 组）、`growth-funnel`。

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
- AI 模式的 `/s/<id>` **永不返回 Notion token**。
- 更新：联网优先拉新；快捷指令本身无静默升级 → 新 iCloud 链接 + App 横幅「请重新添加最新版」。
- M0 必须真机：`shortcuts://` 拉起、Save File、vCard 远程图标、**否定 App 写 Shortcuts 目录**。

### 6.3 身份与 Notion OAuth（两段，不要写成一句）

1. Apple/Google → portfolio `userId`（与 Yuun 同一套）。
2. App 开 Notion OAuth（新 public integration；redirect `https://<api>/api/lantai/oauth/callback`）。
3. `workspace_id` + AES-256-GCM `access_token` 绑到 `userId`。密钥只在 Workers secrets；D1 只落密文；不落日志。
4. Notion token 无 refresh、不过期。撤销：App 删密文 + 深链 Notion Connections（**无官方 revoke API**）；用户在 Notion 撤销 → 下次 401 → 引导重连。

### 6.4 数据流与 SSOT

```
[App / 快捷指令] → [hexastral-api /api/lantai] → [Notion DB] ← SSOT
                         │
                         ├─ D1: 连接/配置/配额
                         ├─ 记账 AI（v1b，API 内）
                         └─ R2 staging（v1.5+，M0 验证后）
```

- 列表/编辑/删除不开发；「在 Notion 打开」深链。
- AI 队列：先写行（处理中）→ 富化 → 更新（完成/需确认）→ 推送。AI 挂 = 行还在，可重试。
- Notion 外部文件重托管 = M0。真 → R2 TTL staging；假 → R2 永久 + 删除级联。

### 6.5 D1 表（进 `schema.ts`）

| 表 | 用途 |
|---|---|
| `lantai_connections` | `user_id`, `workspace_id`, `token_ciphertext`, `token_nonce` |
| `lantai_configs` | `id` (uuid), `user_id`, `database_id`, `mode` (`manual`\|`ai`), `command_json`, `revoked_at` |
| `lantai_usage` | 按模板、UTC 月计数（订阅公平用量） |

`bun db:generate` 后人工看 SQL，再生产 `bun db:migrate:prod`（需明确批准）。

### 6.6 公开路由（hexastral-api）

| 路由 | 鉴权 | 职责 |
|---|---|---|
| `/api/lantai/oauth/*` | 浏览器 / ASWebAuth | Notion 授权回调 |
| `CRUD /api/lantai/configs` | HMAC | 配置；免费档锁 `database_id` |
| `GET /s/:id` | 无（secret-link） | 快捷指令拉配置；IP+id 双限流；AI 模式无 token |
| `POST /api/lantai/ai/jobs` | HMAC | 记账任务；无 `lantai_pro` → 402 |

日志只记 `config_id` 前 8 位哈希。精气神（v2）走现有 `/api/physiognomy/*` 或 service-client → `svc-astro`，不在 lantai 路由里重写 VLM。

### 6.7 AI 管线

| 模板 | 管线 | 模型 | 何时 |
|---|---|---|---|
| 记账 | 听写 / 票据 OCR → LLM JSON → 确认页 | 文本 LLM（便宜档） | v1b |
| 饮食 | 食物照 → VLM → 确认 → 膳食指南建议 | `ai-vision` + 文本 LLM | v1.5 |
| 精气神 | 自拍+双掌 → faceoracle → 快照行 | `svc-astro`（Kimi → Gemini → Llama） | v2 |

- `[vlm-router.metric]` `fallbackDepth`：0=Kimi，1=Gemini，2=Llama。
- 精气神成本记在 `lantai_pro`；Syel Pro 经共享 portfolio 身份自动给对应权益。
- 饮食护栏：膳食指南原则 + 本餐可执行组合；禁止病名/症状/热量数值/补剂剂量/「降防治」；denylist → 重写一次 → 降级文案 + 脚注「不构成医疗建议」。

### 6.8 照片隐私

| 模板 | 默认 | 说明 |
|---|---|---|
| 精气神 | **不归档原图** | ADR-0028：内存直传 → 提取后回收；Notion 只写文本 + 点位图 + `syel://` |
| 饮食 | 归档 | 低敏感；R2 staging → 重托管 → TTL |
| 记账 | **只写结构化字段** | 凭证图 = 开关 + 写入前提示 |

叙事：**我们经手的都是过客；永久的只有设备里的原图，和你 Notion 里的档案。**

### 6.9 凭证分层

| 模板 | `/s/:id` 返回 | 运行时 |
|---|---|---|
| 手动 | 含加密用途的 Notion token（端侧直写） | 快捷指令直连 Notion |
| AI | **只有 config_id，无 token** | 快捷指令 POST API → 服务端持 token 写库 |

- AI 的 Notion token **永不进 iCloud**。
- `config_id` = 能力凭证（UUID v4）；撤销/轮换即失效。
- 手动模板：服务端 revoke 杀不死已缓存的 iCloud 配置。UI 必须写清：「撤销云端访问并清设备缓存；彻底断开请同时在 Notion Connections 撤销」。
- 撤销入口：单条重置（新 id + 一键 bootstrap）/ 安全中心全部撤销 / 断开 Notion / 账号删除级联。
- 自有 PAT：v1 不做。

**官方快捷指令：** 固定名 `Lantai`；双模式 `manual` / `ai`；逻辑由 config 驱动。schema 版本：`latest_shortcut_version`，App 弹重新添加横幅。

---

## 7. 合规（仅海外商店，不上国区）

- **国区 App Store 不做**（ICP / 第三方数据连接）。**获客仍走小红书** → 港区/美区 Apple ID + TestFlight。plan 里这两句必须同时成立，避免运营按「国区上架」执行。
- 同意版本化 + 可撤回（Syel `biometric_consent` / `privacyConsentVersion` 模式）。
- 首次 AI 模板：三方处理同意（Moondream/Kimi/Gemini 角色与保留）。
- Nutrition Label：Photos = linked + shared with third parties（AI 路径）。
- **删除三路径**：删 Notion 行即删图 / 账号删除清 D1+R2 / App 内选择性删除。文案：「默认长期留在你本人的 Notion，可随时删」。
- 精气神 listing 只用「Notion 自动化与状态记录」；沿用 Syel `_doNotUse`；形气 remote-config 地区开关。
- Gemini fallback：**保留**，级联第 2 层，API 付费、不用于训练；隐私政策照实披露。无国区 → 无 PIPL 出境硬评估。

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
| **M0** | ① Notion 外链图重托管 ② 固定名 + `config_id` 拉起 + Save File ③ vCard 远程图标 ④ **否决 App 写 `/Shortcuts/`** ⑤ 若已有记账模型，扫一眼 `fallbackDepth` | 主路径定稿；原生 iCloud 写入要么证实要么从 v1 删除 |
| **M1a** | `lantai-app` + `/api/lantai`：OAuth、配置器、2 槽、安装快捷指令。无 AI 也可上 TestFlight | 真机写入 Notion；可接现有小红书单 |
| **M1b** | `lantai_unlock` / `lantai_workspaces` + `lantai_pro` + AI 记账确认页 | 内测转化；402 引导可用 |
| **M2** | 饮食模板 +（若超时）拆 `svc-notion` 内部 Worker | 合规复审 |
| **M3** | 精气神桥：共享身份 + faceoracle + 快照行 | Syel Pro 联动 |
| **M4** | AI 用量/转化 → 订阅价定案；买断升订阅是否抵扣 | 数据 |
| **M5** | ASO + 模板卖家 promoter + PH | 海外商店上架 |

冷启动：**小红书订单 → TestFlight（M1a）** → 少数派/模板卖家 → PH → 海外 App Store。旧 useone 页导流并行，**不是**主通道。

---

## 10. 风险

| 风险 | 对策 |
|---|---|
| App 无法写 `/Shortcuts/` | v1 不依赖；M0 否决即走快捷指令 Save File |
| Notion 不重托管外链图 | M0 证伪则 R2 永久 + 级联删除 |
| 快捷指令 URL/图片限制 | M0 实测；超限则限字段或运行时拉取 |
| 免费 2 槽覆盖多数需求 | 图标/换库/AI 做触发；上线后调 1/2 槽 |
| 买断+订阅在商店语义打架 | 三 SKU + 服务端并集；文案不写「订阅含买断」 |
| 国区需求 vs 不上 CN 商店 | 小红书文案写清港/美区下载 + TestFlight |
| Apple 审核（生物特征，M3） | 照抄 Syel 同意/撤回；删除三路径；M3 前合规复审 |
| LLM 成本 | 月度上限 + TOS 隐藏上限；便宜模型 + schema 抽取 |
| 记账错账 | 确认页不可省；错行在 Notion 自助改 |
| 拷贝 Yuun 带进黄历壳 | §5 依赖白名单；禁止 `astro-core` / widget-kit |
| useone 双轨 | 新 App 上线后旧页只读 + 横幅 |

---

## 11. 开放问题

1. ~~品牌名~~ ✅ **Lantai**，副标题 Flare for Notion（§11.1）
2. **免费槽位**：2 还是 1（转化数据定）
3. **旧 useone 快捷指令页**只读时间表：建议 M1a TestFlight 起加横幅，M5 上架后完全只读
4. **订阅定价**与买断升订阅首年抵扣 — M4
5. ~~Gemini fallback~~ ✅ 保留
6. ~~AI 凭证~~ ✅ `config_id`；不引入自有 PAT
7. ~~Web/域名~~ ✅ `lantai.hexastral.com`；v1 无 web 编辑器、无 UGC
8. ~~自定义 AI 模板~~ ✅ v2 旗舰
9. ~~公开 svc-notion~~ ✅ v1 不建；M2 按需内部拆
10. ~~原生写 iCloud Shortcuts 目录~~ ✅ 不作为 v1 主路径
11. **`lantai_workspaces` 对已购 unlock 的补差价**在 RC 里怎么配（升级商品 vs 第二个非消耗）— 实现前拍板

### 11.1 品牌名（已定：Lantai）

- **Lantai（兰台）**——汉代皇家档案机构；读音 **LAN-tie**。不要用 Orchid Terrace 做主英文名。
- App Store：标题 `Lantai` · 副标题 `Flare for Notion` · 关键词 `notion,capture,shortcut,ledger,diet,journal,ai`
- USPTO：活标多为「LANTAI PARTNERS」Class 045；无独立 LANTAI Class 9。正式申请前 TESS + 代理 clearance。
- CN 页面不用「兰台」中文露出（律所在华已用），用 Lantai。
- 域名：主域 `lantai.hexastral.com`；顺手注册 `lantai.dev`。
