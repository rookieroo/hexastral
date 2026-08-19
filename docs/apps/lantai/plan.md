# Lantai — 落地计划

> **形态先看 [demand.md](./demand.md)**（需求 → Lantai / Syel 分工）。本文只写怎么做。冲突以 demand.md 为准。
> 仓库：`apps/lantai-app` + `hexastral-api` `/api/lantai/*`。不要新开 Git、不要塞回 useone-chart。不建公开 `svc-notion`。
> 合规：[legal-feasibility.md](./legal-feasibility.md)（饮食视觉仍适用；官方脸/掌模板不在 Lantai v1）。
> 品牌：Lantai / 副标题 Flare for Notion（J5 通道，不是 ICP）。

---

## 0. 从需求得到的 v1（Lantai = J3 记一笔）

普通人要 **快录 + 在 App 里能翻历史**。不是要第二条算命，也不是要 vibe coding 底座。

| | Lantai | Syel |
|---|---|---|
| 需求 | J3 记一笔（饮食、inbox、自定义字段） | J2 问命（形+盘，偶尔一次） |
| 打开理由 | 记、看自己的行 | 求一份报告 |
| 脸/掌 | **v1 官方不做**（那是 J2） | 同意 + 三图 + 生辰 |
| Notion / 快捷指令 | 可选（J5） | 报告可选 Sync，不是日常采集 |

采集：**App 相机为主**；快捷指令备选，同一 jobs。SSOT = D1 结构化行（无原图）。Notion 可选镜像。通知打开 App。

流程（普通用户）：登录（不强制 Notion）→ 建饮食或自定义库 → 拍 → 列表里看。功率用户再连 Notion / 装指令。

饮食订阅：热量估算免责、分场景同意。自定义视觉：只填 schema，主体是人脸/证件则拒写（不要变成未上架的 Syel）。

---

## 1. 定位

> **Lantai = 普通用户的自定义库快录：App 内拍、按 schema 填、在 App 里观察。**
> 快捷指令是备选采集。Notion 是可选镜像（功率用户 / 小红书 SKU / MCP）。

习惯假设修正：**只靠快捷指令 + 结论在 Notion = 没有 App 日活。** 背面轻点仍然有价值，但不能当唯一运行时。vibe coding 能复刻 Notion 管道，所以差异化在 **降低普通人摩擦 + 可操作的观察**，不在「再做一个 Shortcuts 包装」。

D1 存配置、点计数、**行字段与短文**。原图不进 D1。未连 Notion 也能完成订阅闭环。连上后行可镜像；MCP / charts 仍读用户 Notion（若他们选择同步）。

| 产品 | 做什么 | 不做什么 |
|---|---|---|
| **Lantai** | 饮食 + 自定义库快录 + App 观察 | 官方看相；五章；Airtable；强制 Notion |
| **Syel** | J2 问命（形+盘） | 日常记账 |
| **useone charts** | 吃已同步到 Notion 的数据 | 不配采集 |

和主线：Yuun 已送审、Yuel 快上；Lantai 是 **wave 2 并行轨**。

漏斗（**无消耗型点数包**；订阅 ≠ 买断收据）：

| 层 | 内容 | 变现 |
|---|---|---|
| Free | 2 槽 + App 内手动录入（系统听写免费）；Notion/指令可选 | — |
| 买断 | 无限槽/库、图标、关系 | `$2.99` / `$9.99` 非消耗 |
| 订阅 | 全模板 **累计 AI 点**；槽位与买断 **并集** | Pro `$3.99` / Plus `$9.99` |

飞轮：App 观察养日活 → 订阅。Notion/MCP 是功率用户支线，不是主飞轮。

---

## 2. 需求与市场依据

- vibe coding 能复刻「指令 + Notion + 模型」。Lantai 若只做这条，ICP 是错的。
- 小红书快捷指令仍是获客/买断 SKU，但是 **备选采集**，不是普通用户主路径。
- useone-chart 信任债 → 独立 App + `lantai.hexastral.com`。
- 竞品 Nautomate 等仍偏极客；空隙是 **打开就能记、能看**。
- 差异化：低摩擦快录 + 观察 + 可选同步 Notion；原图销毁；Kimi 填 schema。
- 经济模型：订阅（视觉模板）走量；买断槽位；小红书 SKU 接功率用户。结构化行是产品资产（观察），原图不是。

---

## 3. 产品范围

### 运行时分层

| 层 | 谁做 |
|---|---|
| 配置 / 观察 | Lantai App（主） |
| 每天采集 | **App 相机/分享为主**；快捷指令备选（拍照 ×3 / 分享表 / 背面轻点） |
| 推理 | hexastral-api → Kimi（`thinking: false`）；像素用完即弃 |
| 档案 | D1 结构化行。Notion 可选镜像 |

图不要塞进 `shortcuts://` URL。App 用系统相机/`expo-image-picker`；指令走拍照或分享表。

### v1a（手动）

- Apple/Google。Notion **可选**
- App 内手记/Inbox（无 AI）写 D1；连上 Notion 再镜像
- 功率用户：选已分享 DB + iCloud 槽位 + 指令（接现有订单）
- Free 2 槽；系统听写免费

### v1b 买断

- `lantai_unlock` / `lantai_workspaces` 上架

### v1c AI 模板（本 App 内，不再独立立项）

**视觉主路径 = Kimi。** 系统 OCR 不是订阅理由。

**饮食：** App 或指令一张餐图。D1 行 + 可选 Notion。热量区间。允许改字段。

**不做官方精气神。** 脸/掌看相在 Syel（demand.md J2）。通用模板若主体是人脸/证件 → **拒写**，不要走「未上架的 Jing」。

**通用：** App 内 schema + 提示词。只填可见字段。

### 与 Syel

见 [demand.md](./demand.md)。可共用 `lantai_connections` 做 **Syel 报告 Sync**。Lantai 不采集三图看相。

### v1 明确不做

- **官方脸/掌/精气神模板**（需求是 J2，产品是 Syel）
- 原图进 D1 / 用用户图训练 / 人脸库
- Airtable 级公式、关联、看板（观察只做列表/日历/近况）
- 强制连 Notion 才能用订阅
- 飞书 / Slack / Discord / Telegram 当档案
- 健康顾问 Bot；五章命书
- 公开 `svc-notion`；App 直写 `/Shortcuts/` 包目录
- Web 配置编辑器、黄历壳、`astro-core`、点数包
- v1 Android（先 iOS；App 采集不依赖快捷指令，安卓可后补）

---

## 4. 定价

商店：**两枚买断 + 同一订阅组两档**（升降级）。不要写「订阅=拥有买断收据」。槽位 = `unlock \|\| workspaces \|\| pro \|\| pro_plus`。

| RC 商品 | 类型 | 价格 | 打开什么 |
|---|---|---|---|
| `lantai_unlock` | 非消耗 | **$2.99** | 无限槽/库/图标/关系（1 ws） |
| `lantai_workspaces` | 非消耗 | **$9.99** | + 无限 workspace |
| `lantai_pro` | 订阅 | **$3.99/月 · $39.99/年** | **45 AI 点/月**（年订同点） |
| `lantai_pro_plus` | 订阅 | **$9.99/月 · $99.99/年** | **140 AI 点/月** |

**累计点数**（新模板只加权重，不加池）：

| 动作 | 点 |
|---|---|
| 饮食 1 图 | 1 |
| 精气神 3 图 | 3 |
| 通用视觉（按图） | 1/张 |
| 以后纯文本结构化 | 0.5（对外可显示 2 次=1 点） |

速率（不增加总量）：Pro 饮食 ≤3/日、精气神 ≤1/周、**6 点/日**；Plus 饮食 ≤4/日、精气神 ≤2/周、**12 点/日**。

用尽 → 引导 Plus，**不再卖点数包**。降级周期结束生效。

Kimi 每餐可锁 $3.99 的前提：压图（最长边 768–1024）、`thinking` 关、饮食 `max_tokens` 512–600。45 点是给后续模板留的余地；**不承诺「每日三餐满月」**（那是 Plus 的 140 点）。

热量对外：**估算 + 区间 + 免责**，不称实验室精度，不承诺减肥疗效。

---

## 5. App 脚手架

`apps/lantai-app` · `com.hexastral.lantai` · scheme `lantai`。Yuun 基建 + zinc 浅色，**不要**黄历壳。`brand='lantai'`。i18n：zh / zh-Hant / en / ja。

```
app/
  (tabs)/ index | capture | me     # index = 观察（列表/日历）；capture = 快录
  config/[id].tsx
  connect.tsx                      # 可选 Notion
  install.tsx                      # 可选快捷指令
```

依赖：既有白名单 + **`expo-image-picker` / 系统相机（主采集）**。Paywall 用 `satellite-ui`。

`LSApplicationQueriesSchemes: ["shortcuts"]`。通知：`expo-notifications` + 既有 `satellite-runtime` 推送注册。iCloud Documents 能力（公开容器 `Lantai`）。

---

## 6. 架构（必须在 hexastral）

### 6.1 为什么在本仓库

| 依赖 | 位置 |
|---|---|
| 身份 | `/api/portfolio/auth/{apple,google}` |
| Notion 连接密文 | `lantai_connections` |
| Kimi / 级联 | `packages/ai-vision` |
| 额度 / RC webhook | 现有 entitlements 模式 |
| 卫星壳 | `satellite-runtime` |

拆出去就要复制这一套，且无法和 Syel 共用连接。

```
hexastral/
├── apps/lantai-app
├── apps/hexastral-api          # /api/lantai/* + Queue 消费者
│   └── src/db/schema.ts
├── packages/ai-vision
└── docs/apps/lantai/
```

长任务用 **Queue**（三图 Kimi 可能超过 Worker 同步时限），不要公开 svc-notion。

### 6.2 配置分发：iCloud 槽位，不是网页

**运行时：** 快捷指令 **Get File** 固定路径下的 JSON，取出 `config_id`，再 POST jobs。禁止每次打开 Safari / `GET /s/:id`。

**谁写入：** Lantai App（iCloud Documents 公开容器，Files 里显示为 `Lantai`）。**仍然禁止** App 写 Shortcuts 应用的 `/Shortcuts/` 包目录。M0 真机验证：Shortcuts 能否无选文件直接读该容器；若跨容器不稳定，安装时由官方指令 **Save File 一次** 到同一路径（用户点一次允许，仍不是网页）。

**iCloud 里只放 `config_id` + 显示名 + mode。永远不放 Notion token。** 手动听写也走 API（连接 token 只在 D1）。`GET /s/:id` 仅兼容旧指令。

```
iCloud Drive/Lantai/
  diet.json              # 官方饮食，单槽，指令不弹列表
  jing.json              # 官方精气神
  custom/
    {slug}.json          # 每个自定义库一个文件
  custom-active.json     # 背面轻点 / 桌面图标用的当前自定义槽
```

`{ "v": 1, "config_id": "…", "name": "Inbox", "mode": "ai"|"manual" }`

换库 / 轮换 id = App **覆盖写文件** + D1 `revoked_at`。指令不用更新。

官方指令三份图（输入元数不同，不能合成一条）：`Lantai` / `Lantai Diet` / `Lantai Jing`。小红书可发 **同一份** 指令；个性化全在用户自己的 iCloud 文件夹。

#### 6.2.1 多数据库 × 同一条快捷指令

快捷指令图是静态的，做不到「云端改图」。动态部分必须是 **目录里的文件列表**，由 App 增删。

| 场景 | 读哪个文件 | 用户操作 |
|---|---|---|
| `Lantai Diet` / `Lantai Jing` | 固定 `diet.json` / `jing.json` | 无。官方库只有一套；换库 = App 改写该文件 |
| 自定义库、**只 1 个** | `custom/` 下那一个，或 `custom-active.json` | 无列表 |
| 自定义库、**N 个**，从分享表 / 指令 App 打开 | `Get Contents of Folder` → `custom/` → **从列表选取**（用 `name`） | 多一拍，换库不用重装指令 |
| 背面轻点 / 桌面图标 | **只读** `custom-active.json` | 列表会打断轻点。App 里「设为背面轻点默认」覆盖该指针 |

不要：一条指令里写死 N 个 dictionary（改库就要改指令）；不要：`lantai://` 每次跳回 App 选库；不要：网页拉配置。

N 个官方「饮食库」若未来要做，也走 `diet.json` 指针，不新做第四条指令。

### 6.3 AI 路径

```
App 相机 / 分享进 App（主）
  或 快捷指令 Get File + 拍照/分享（备）
  → POST /api/lantai/ai/jobs
     App：HMAC；指令：config_id secret-link
  → 扣点、压图
  → 插入 lantai_records（字段空、status=processing）；已连 Notion 才建 Notion 行（文件可选）
  → 采集端结束
  → Queue：Kimi 填 schema → patch D1（及 Notion）→ 丢弃像素
  → APNs：打开 App 该行 / 失败
```

`config_id` 仍是指令侧能力凭证。AI 模式 `/s/:id` **永不返回 token**。

### 6.3.1 通知（锁定）

登录后、第一次采集前请求权限。拒绝仍能用。

| 通道 | 何时 | 落地 |
|---|---|---|
| **APNs** | Queue 写完或失败 | 深链 **App 观察/该行**，不是 Notion |
| **本地** | 餐窗、每周精气神、点将尽 | 打开 capture 或 index |
| 角标 | 未读失败 | 非唯一通道 |

### 6.4 Sink

**SSOT = D1 `lantai_records`（结构化字段 + 短文，无原图）。** Notion 实现 `Sink` 接口，用户连接后镜像。飞书/IM 不做。观察读 D1，不反向全量爬 Notion。

### 6.5 表

| 表 | 用途 |
|---|---|
| `lantai_connections` | 可选 Notion workspace + token 密文 |
| `lantai_configs` | uuid、schema、mode、`name`、`user_prompt`、optional `notion_database_id`、revoked_at |
| `lantai_records` | 行：fields_json、conclusion_text、status、config_id；无像素 |
| `lantai_usage` | UTC 月点 + 日窗口 |
| `lantai_jobs` | 队列；可选 notion page_id |

### 6.6 路由

| 路由 | 鉴权 | 职责 |
|---|---|---|
| `/api/lantai/oauth/*` | 浏览器 | 可选 Notion |
| `CRUD /api/lantai/configs` | HMAC | schema / 提示词 |
| `CRUD /api/lantai/records` | HMAC | 观察列表、改字段 |
| `GET .../databases` | HMAC | 仅已连 Notion |
| `GET /s/:id` | secret-link | 遗留手动 |
| `POST /api/lantai/ai/jobs` | HMAC **或** secret-link | 收图、建 D1 行、入队；无 pro → 402 |

日志：config_id 前 8 位哈希。无图。结论全文可进 D1（用户档案），**不要**打进 Workers 日志。

Kimi 失败仍计窗口。未写入 D1 的失败：24h 内可免 1 次重试。

### 6.7 视觉

饮食 / 精气神 / 通用填 schema：**Kimi 主路径**（每餐/每张都允许）。Gemini Flash / Llama 仅 fallback（通常更便宜，但 Kimi 已发生费用照计）。压图在进模型前。

用户提示词与 schema 一并发送。护栏：禁止改写 `database_id`；relation/formula/rollup 只读跳过；denylist 后置（病名、处方、铁口）。通用模板另加：禁止人物传记/看相；主体为人脸或证件则不写发挥性文字。

---

## 7. 合规

Lantai v1 **没有**官方脸/掌路径。§7.1–7.2 留给 Syel（及若将来有人用自定义库硬做成看相时的拒写/403）。饮食仍要 Photos Label + 热量免责。

- 不上国区商店；小红书获客 → 港/美区 + TestFlight。
- Nutrition Label：**Photos linked + 与第三方共享（云端推理）**。脸/掌单独同意（版本化，可撤回）。
- 文案：原图处理即销毁；不训练；D1 存字段与短文（用户可删账号清档）；掌 ≠ 指纹。
- 删除：清 D1 连接/配置/任务/**records**；已镜像的 Notion 行用户自删。
- 热量/养生：估算与文化对照，不构成医疗建议。
- ASO：可出现 capture/ai；精气神避免 Syel `_doNotUse` 铁口词。**不要**用地区开关关精气神（美/欧/日同一功能；同意取高水位，见 legal-feasibility.md）。
- 出版主体：**UseONE, LLC**（与 Yuun/Yuel 相同）。
- **上传物责任划分**见 §7.1。勾选文案与跨境可行性见 [legal-feasibility.md](./legal-feasibility.md)（备忘录，非执业意见）。

### 7.1 上传照片：拦不住「不是自己的」，责任必须写死

相册 / 分享表 **无法验证** 图中的人是账号持有人。不能做人脸比对「是不是你」（也没有存档可对）。这是精气神路径里 **最大的合规与侵权风险**，比热量估算大。

相对难度（不是安全保证）：

| 图种 | 误传/盗用难度 | 含义 |
|---|---|---|
| **脸** | 低：合影、截图、网图、小孩都在相册里 | 风险主体 |
| **掌** | 高：别人的掌纹很少躺在相机胶卷里 | 降低随意盗用，**不是**法律豁免 |
| 餐食 / 书页 | 中 | 版权/他人票据另说 |

**平台做得到的：** 处理即销毁、不建身份库、不提供「分析任意一张网图/明星/家人」的营销、目标受众 13+、精气神首次强制勾选保证。

**平台做不到的：** 拦截非本人自拍。若做「检测到多张脸就拒绝」也只是弱启发，会被合影/滤镜打穿，**不能当成拦截能力对外宣传**。

**用户保证（首次精气神同意 + TOS + 隐私政策同一口径，缺一不可）：**

1. 提交的脸/掌是 **本人**，或已取得肖像权人 **明示许可**（含监护人对未成年人）。
2. 不上传他人未同意的照片，不为第三方生成「气色/掌纹」档案。
3. 违反上述产生的投诉、下架、损害赔偿由 **提交者** 承担；平台在收到有效通知后停止对该 `config_id` 的推理并配合删除 Notion 侧引导（我们删不了用户 Notion 里的文件，只能停服务 + 教用户自己删）。

**产品禁止：** 「帮对象看相」「相册批量家人」「上传明星脸」。快捷指令安装页和同意页用一句话：**只拍你自己的脸和手。**

掌纹相对难拿到，可以写进风险说明给律师看，**不要**写成「因此掌纹无隐私问题」。

### 7.2 预防滥用（优先于出事再停服）

同意书 **减责不拦截**（用户仍可撒谎）。预防靠 **少给滥用入口 + 服务端失败则拒写结论**。下列为 M1c 精气神默认；饮食不适用人脸条款。

**A. 产品不提供「看他人」的能力**

- Listing、快捷指令名、空状态禁止：帮对象/家人/明星看相、批量相册、粘贴网图 URL。
- 通用自定义提示词：服务端拒绝含「他/她/第三人/小孩」等看他人意图的精气神类模板（弱关键词，漏了也要靠 B/C）。
- 精气神指令文案固定：**只拍你自己的一张脸和左右手掌。**

**B. 同意闸在服务器，快捷指令绕不过**

- 首次必须在 **App 内** 全屏同意（不能滑过），勾选：只传本人；未经他人同意上传的法律风险由用户承担；13+ / 未成年人须监护人。
- D1 记 `jingqi_consent_version` + 时间。`POST /ai/jobs` 精气神无有效同意 → **403**，指令只提示「打开 Lantai 完成同意」。
- 撤回同意即停该用户精气神推理（饮食可继续）。

**C. 服务端失败则关闭（不核身，只验「像一套自己的三图」）**

不做人脸比对、不做年龄识别（本身更敏感且不准）。Kimi 只做当次分类：

| 结果 | 动作 |
|---|---|
| 约 1 张脸 + 2 张掌/手 | 才写结论与建议 |
| 2 张及以上脸、0 张掌、3 张都是脸 | **不生成 reading**；Notion 行标失败或根本不建行；扣点与否：失败不扣或扣 0（TOS 写死，建议 **不扣** 以免激励乱传） |
| 掌别分不清 | 可写行，结论降级 +「掌别未识别」，不编左右 |

截图/翻拍屏幕拦不住，不对外宣称能拦。

**D. 采集摩擦（v1 建议比「相册随便三张」紧一档）**

- **默认：App 内「拍照」三次**（脸、左、右）。快捷指令同样默认拍照。相册为进阶。
- 翻拍屏幕挡不住；目的是挡住 **随手把合影/网图/小孩从胶卷拖进来** 这种高频滥用。
- 频率：精气神 **≤1/7 日**（已有）+ 新用户前 14 天可再限 **≤1 次**（可选，防开号刷）。
- 同一 `config_id` 短时间反复 403/分类失败 → 冷却（例如 24h）。

**E. 运营**

- 远程开关：一键关精气神 jobs，饮食不受影响。
- 投诉：停该用户/该 config 推理；提供「如何在 Notion 删除行」的说明。不存原图，没有「平台侧删图」。
- 不把分类失败率当增长指标优化掉（那会鼓励放宽 C）。

**做不到、不要写进 listing：** 核验本人、识别未成年人、保证非本人无法上传。

---

## 8. Web / 域名

- `lantai.hexastral.com`：隐私/条款/支持/落地。ASC 填此域。
- v1 **无** Web 运行时采集、无 Web 配置编辑器。
- 旧 useone 快捷指令页：M1a 起横幅，M5 后只读（§11.3）。

---

## 9. 里程碑

| 里程碑 | 内容 | 出口 |
|---|---|---|
| **M0** | App 写 iCloud 槽位；快捷指令读固定路径；拍照/分享表；否决 App 写 Shortcuts 包目录；压图后 Workers 体积；APNs 试推 | 主路径定稿 |
| **M1a** | 登录后 **不连 Notion** 也能手记写 D1；观察列表。功率用户可选 OAuth + 指令 | App 内有行 |
| **M1b** | 买断 SKU | 转化 |
| **M1c** | App 内相机 jobs + Queue；Diet / Jing 观察页；指令为备选；同意闸 | TestFlight：无 Notion 可看结论；未同意 403 |
| **M5** | 海外上架 | listing 如实披露 Photos |

冷启动：小红书 → TestFlight（先手动 M1a，AI 用 M1c 内测）→ PH。

---

## 10. 风险与你还没写进决策的缺口

### 已有对策

| 风险 | 对策 |
|---|---|
| 每天打开 App | **要。** 观察在 App；指令只是备选采集 |
| 结论在 Notion 无日活 | SSOT = D1 行；推送打开 App |
| 系统 OCR 无订阅理由 | 卖 Kimi |
| 处理脸却说不碰 | listing 承认 + 原图销毁；短文在 D1 |

### 实现前必须补上的（易漏）

1. **Workers 时限与包体**：三张图同步推理容易超时 → **必须 Queue**；分享表指令应 **fire-and-forget**，不要转圈等结论。HEIC 要转 JPEG 再传。
2. **Notion 文件限额与 API**：单文件大小、一次挂三文件；外链 vs 官方 upload。失败则行在、图缺，可重试补文件。
3. **左右掌分类错误**：产品允许乱序，但模型会混。UI/字段必须有「掌别未识别」。
4. **用户提示词注入**：可要求改语气，不可改目标 `database_id` / 不可要求导出 token。
5. **公式/关联字段**：retrieve 后跳过只读类型，免 400。
6. **快捷指令无静默更新**：Diet/Jing/手动可能三份 iCloud 链接；版本横幅要按 `latest_shortcut_version` 分指令名。
7. **iCloud 槽位**：App 写文件；换库覆盖写。快捷指令不内嵌 `config_id`。轮换 id 不必重装指令。
8. **402 在快捷指令里**：只能弹「打开 Lantai 订阅」；体验比 App 差，文案要短。
9. **订阅过期、无买断**：超额 config 只读/不可新建（并集的「失去」语义）。AI 点归零；手动指令若 iCloud 仍有 token 仍能写（要在设置里写清）。
10. **健康/热量**：估算免责；洞察「规律」若做，必须有足够天数否则空态，禁止假七日报告。
11. **非本人照片（高）**：不核身。靠 §7.2 预防（同意在 App、分类失败关闭、拍照为主 CTA）+ §7.1 责任划分。
12. **Syel 双路径**：§0 已锁职能；安装/设置仍须各一句，避免用户以为快捷指令会出五章。
13. **埋点**：槽位创建、指令安装完成、jobs 成功/402/分类失败率、点耗尽。没有这些谈不上调 1/2 槽或改权重。
14. **M0 指标**：盯 `[vlm-router.metric]`（饮食/精气神）以及 **llm-router**（若有纯文本洞察），不要混用。

---

## 11. 开放问题

形态与四条流程见 **§0（已锁定）**。下面是 **实现前仍要拍板** 的旋钮，不是「要不要做 Lantai」。

### 11.0 还值得讨论的（§10 工程缺口与 §7 安全之外）

1. **官方 Diet / Jing 库谁创建、字段长什么样**  
   App 用模板在用户 workspace **建库**（schema 与 Kimi 对齐），还是用户先建空库再映射？v1 建议 **App 建官方库**；通用模板才「选已分享库」。实现 M1c 前要写出属性表（热量用 text 区间还是 number+备注、精气神结论用 rich text 还是 title 等）。
2. **iOS「允许未信任的快捷指令」** — 落地页 / 小红书步骤图算产品。v1 仅 iOS。
3. **Free 能不能装 Diet / Jing** — 建议可装，jobs 才 402；精气神仍须先同意。
4. **精气神官方提示词是否只读**（只许改语气档位）。
5. `lantai_workspaces` 补差价 RC 怎么配 — 实现前拍板。
6. 官方指令显示名是否本地化；失败免重试是否计入日窗口；免费槽 1 还是 2（数据）。

**已锁（本轮）：** 通知 §6.3.1；iCloud 槽位与多库一指令 §6.2；合规产品要求见 legal-feasibility.md（上架前执业律师签字）。

**明确不做、先别开讨论：** Syel 五章 UI、Yuel 长 reading 卡片化、Syel 读 Lantai 历史行做深读、飞书/IM、Android 采集、Web 编辑器、点数包、每次执行打开网页拉配置。

### 已关闭 / 仍待数据

1. ~~品牌~~ ✅ Lantai
2. 免费槽 1 还是 2（数据）
3. 旧 useone 页只读时间表：M1a 横幅，M5 只读
4. ~~订阅~~ ✅ Pro/Plus 价与点见 §4；买断升订阅不抵扣（可 M4 再议）
5. Gemini：仅 VLM fallback
6. ~~凭证~~ ✅ iCloud 只放 `config_id`；Notion token 不进文件、不进指令；`/s/:id` 仅兼容
7. ~~域名~~ ✅ `lantai.hexastral.com`
8. ~~自定义提示词~~ ✅ 在 Lantai，不是独立 App
9. ~~svc-notion~~ ✅ 不建
10. ~~原生写 Shortcuts 目录~~ ✅ 不做主路径（iCloud Documents 槽位 ≠ 写 Shortcuts 包）
11. `lantai_workspaces` 补差价 RC — 仍待拍板
12. ~~与 Syel~~ ✅ §0
13. 官方指令英文名是否本地化 — 仍待
14. 失败免重试 1 次是否计入日窗口 — 仍待
15. ~~非本人上传拦截~~ ✅ 不核身；legal-feasibility.md；执业律师过勾选后再上 M1c
16. ~~精气神主 CTA~~ ✅ 拍照 ×3
17. ~~通知~~ ✅ §6.3.1
18. ~~多库一指令~~ ✅ §6.2.1

### 11.1 品牌

- 读音 LAN-tie。ASC 标题 `Lantai`，副标题 `Flare for Notion`。
- 关键词可含 `notion,shortcut,capture,ai`；铁口/治病词仍禁。
- 主体 UseONE, LLC。CN 不露「兰台」中文。`lantai.dev` 防抢注。
