# Yuun 提审前 — 代码侧完整计划（ASO ↔ 代码对照 SSOT）

**Scope:** `apps/auspice-app` + 其直接依赖的 in-app 文案、ASO 源文件、截图脚本、校验脚本。  
**目标：** App Store Connect 上每一句可被审核员点到的表述，都能在代码里找到对应能力；代码里对用户可见的 Pro/Free 边界，与商店描述一致。  
**非 scope：** ASC 建号、RevenueCat 控制台、EAS secrets 填值、实拍截图（见 [`docs/publish/README.md`](../../publish/README.md)）——本计划只列「代码/仓库必须改什么」及「改完如何自动验」。

**相关 SSOT：**

| 文档 | 角色 |
|------|------|
| [`aso-metadata.json`](../../../apps/auspice-app/aso-metadata.json) | ASC 粘贴源（title/subtitle/keywords/promotionalText/description） |
| [`lib/i18n.ts`](../../../apps/auspice-app/lib/i18n.ts) `proBenefits` / `legalDisclaimerShort` | Paywall + Settings 法律区 |
| [`app/welcome.tsx`](../../../apps/auspice-app/app/welcome.tsx) | 审核员首屏叙事 |
| [`docs/publish/screenshot-direction.md`](../../publish/screenshot-direction.md) | 截图必须与 in-app 一致 |
| [`docs/apps/yuun/ia-today-first.md`](./ia-today-first.md) | 当前 IA 真相 |
| [`docs/apps/yuun/widget-watch-scope.md`](./widget-watch-scope.md) | Widget/Watch **未 ship** 的代码证据 |

---

## Phase 0 — 建立对照表（只读审计，0.5 天）

产出物：`docs/apps/yuun/aso-code-audit-matrix.md`（由脚本 + 人工填「代码证据列」）。

### 0.1 信息架构（导航 / 首屏）

| ASO / 截图声称 | 代码真相（2026-07 Today-first） | 状态 | 代码证据 |
|----------------|----------------------------------|------|----------|
| 「4 tab（Today / Calendar / Festivals / Me）」 | **无 bottom tab**；Today 首页；Calendar = 右滑二级 `/calendar`；Settings = 左滑 `/(tabs)/me`；节庆 = Settings → Library → `/glossary` | **冲突** | `app/(tabs)/_layout.tsx`（仅 index+me stack）；`app/(tabs)/index.tsx` 手势；`components/settings/LibrarySection.tsx` |
| 截图 S1「顶栏 Calendar + Settings **图标**」 | 顶栏仅 **Today 标题**；Calendar/Settings 靠 **左右滑 + 底部文字提示** | **冲突** | `app/(tabs)/index.tsx` header + bottom hints |
| subtitle 已改为 Almanac/宜忌 | 与 Welcome / DayView 一致 | **OK** | `aso-metadata.json` subtitle；`app/welcome.tsx` |

### 0.2 Free / Pro 权益

| ASO description 声称 | 代码真相 | 状态 | 代码证据 |
|---------------------|----------|------|----------|
| Free: 「Small widget」 | Widget **未 native ship**；`syncTodayWidget` 无 native module 时 no-op | **冲突** | `lib/widget-bridge.ts`；`widget-watch-scope.md` |
| Pro: 「Widget × 3 + Apple Watch」 | `/display` 路由存在但 **Me 无入口**；Watch 未 ship | **冲突** | `app/display.tsx`；`app/_layout.tsx`；`me.tsx` 无 link |
| Pro: 「cross-device sync (iCloud)」 | 文案在 ASO；需核对是否仅为 RC restore + sign-in alias，**非 iCloud 黄历同步** | **待核** | `lib/account.ts`；Paywall `signInBenefit` |
| Free: 「4 大节日推送」 | 每日/晚间 push 存在；**holiday 调休 push 已从 Settings 移除**（2026-06） | **待核/可能冲突** | `me.tsx` 注释；`pushRegistry.ts` id `holiday` 仍存在但 UI 无 toggle |
| Free: 「basic 黄历」 vs Pro: 「full 黄历」 | **宜忌全员完整**；Pro 墙在 For you 逐条原因、命书、timeline、择日范围等 | **表述需软化** | `components/DayView.tsx`；`components/PersonalCard.tsx` |
| Free: 「1 self profile」 | 生辰一条；For you 依赖 birth | **OK** | `lib/birth.ts`；Settings birth block |
| Pro: family unlimited | Free 亲友生日提醒 cap = **3** | **OK 若 ASO 写清** | `FREE_BIRTHDAY_LIMIT = 3` in `lib/push.ts` |
| Pro: personal calendar feed | 需 `CYCLE_CALENDAR_SECRET` + RC + deploy | **代码有，prod 未验** | `lib/calendar-feed.ts` |
| Pro: reverse date-planning | `/event` Free 30 天 top 3；Pro 自定义范围 | **OK** | `app/event.tsx` `FREE_WINDOW_DAYS` |
| Pro: Ba Zi timeline + what-if | `/timeline`、`/makeif` Pro gate | **OK** | `app/timeline.tsx`；`app/makeif.tsx` |
| Pro: 命书 deep-read | `/reading` | **OK** | `app/reading.tsx` |

**In-app Paywall（应与 ASO Free vs Pro 同表）**

| `lib/i18n.ts` `proBenefits`（en） | 与 ASO 对齐？ |
|-----------------------------------|---------------|
| For you daily layer | OK |
| Life timeline + what-if | OK |
| For-you reasons + favorable element/color/hour | OK（比 ASO「full 黄历」更准确） |
| Custom date range + personal calendar subscription | OK |

→ **Paywall 比 ASO description 诚实**；提审前应 **以 Paywall + proBenefits 为 SSOT 反写 ASO**，而非相反。

### 0.3 功能深度（description 细节）

| ASO 声称 | UI 是否可见 | 证据 |
|----------|-------------|------|
| 28 lunar mansions / day-officer / 12 double-hours | 部分：ExplainSheet、glossary；**非首页 hero** | `components/ExplainSheet.tsx`；glossary |
| 8 festivals cultural depth | `/festival/[id]` + glossary | OK |
| 24 节气 pages | glossary accordion + festival routes | OK；截图 S3 应指向 `/glossary` 非「节庆 tab」 |
| 六曜 (ja) | `DayView` RokuyoStrip when `locale === 'ja'` | OK |
| 「major-fortune」等 en 词 | `_doNotUse` 禁词表不含 fortune 但 description 正文有 | **风险** | `aso-metadata.json` `_doNotUse` vs en description |

### 0.4 合规与链接

| 项 | 代码 | ASO | 状态 |
|----|------|-----|------|
| Privacy/Terms URL | `lib/config.ts` `privacyUrl(locale)` / `termsUrl(locale)` | description About 段 | 需 **deploy 后 200** |
| `legalDisclaimerShort` | Settings Legal + Paywall | 应与 Terms §3 一致 | 人工 diff |
| `contentRating` | ASO: `4+` | publish README: **12+** | **冲突**（产品决策，非纯代码） |

### 0.5 Keywords 禁词

运行现有：`node scripts/aso-charcount.mjs apps/auspice-app/aso-metadata.json`（字符数 + `_doNotUse` 扫描）。

额外代码侧扫描（应加入 CI / Phase 5 脚本）：

```bash
# indexed fields 禁词（ASO 已有列表）
# description 正文 fortune/lucky/widget 等「软禁词」——不自动 fail，输出 WARN

rg -i "fortune|horoscope|widget|watch|4 tab|4-tab|iCloud" apps/auspice-app/aso-metadata.json
rg "widget|Watch|4 tab" apps/auspice-app/lib/i18n.ts apps/auspice-app/app/welcome.tsx
```

---

## Phase 1 — ASO 文案重写（代码仓库内，1–2 天）

**原则：** Today-first 黄历诚实定位；Free/Pro 以 `proBenefits` + 实际 gate 为准；**删除未 ship 能力**（Widget/Watch/4-tab/iCloud 除非核实后保留）。

### 1.1 重写 `aso-metadata.json`（4 locale 同步）

**必须改的段落（每语种）：**

1. **导航**：改为「Today 首页 · 右滑月历 · 左滑设置 · Library 探索」——禁止「4 tab / Festivals tab」。
2. **Free vs Pro** — 建议 SSOT 文案（en 示例，其他 locale 对齐翻译）：

```
FREE
• Today: daily yi/ji (宜忌), solar terms, lunisolar dates, week strip
• Full month calendar (swipe right)
• Culture snippets & glossary
• 1 birth profile · For you verdict (summary); reasons locked
• Daily + optional evening push
• Up to 3 family birthday reminders
• Apple Calendar almanac feed (free webcal)

PRO
• For you — full daily reasons + favorable element / color / hours
• Life timeline (大运/流年) + what-if reflection
• Personal Ba Zi & Zi Wei deep-read + chart Q&A
• Unlimited family reminders + personal calendar feed
• Custom date-picker window + specialized event scoring
• Timeline node reminders
```

3. **删除**：Small widget、Widget × 3、Apple Watch、4-tab structure、cross-device iCloud sync（除非 Phase 0.2 核实后改写成「Sign in to restore subscription on new devices」）。
4. **保留但 mid-deck 化**：命书 / timeline（description 后半或独立 section，带 reflection-not-prediction）。
5. **promotionalText**：ja 去掉「ウィジェット＋Watch」；en/zh 去掉 timeline-first 若与 subtitle 冲突（subtitle 已是 Almanac/宜忌）。
6. **keywords**：移除 `widget`（en/ja/zh）若不再 claim；保留 lunar/almanac/bazi 等。
7. **title 策略（产品决策，写进 plan）：**
   - 选项 A（推荐 4.3(b)）：en title 改为 almanac-led（如 `Yuun: Chinese Almanac`），timeline 放 CPP
   - 选项 B：维持 `Life Timeline & Almanac`，但 description 首段必须是 Today 宜忌

### 1.2 更新 `_comment` / `_screenshotDirection` / `_repositioningNote`

与 Today-first 一致；S7 Widget+Watch 改为 **「CPP only / post-v1」**。

### 1.3 验收

- [ ] `node scripts/aso-charcount.mjs apps/auspice-app/aso-metadata.json` 全绿
- [ ] 人工：description 每条 bullet 能在 Phase 0 矩阵找到 `OK` 或「已删」
- [ ] `_doNotUse` 词不出现在 title/subtitle/keywords；description 中 fortune 等改为 cycle/reflection/chapter

---

## Phase 2 — In-app 文案与 ASO 对齐（1 天）

ASO 改完后，**同一 diff** 内同步所有用户可见 copy，避免 Paywall ≠ Store。

| 文件 | 动作 |
|------|------|
| [`lib/i18n.ts`](../../../apps/auspice-app/lib/i18n.ts) | 若 Free/Pro 边界调整：同步 4 locale `proBenefits` / `proSubtitle`；确认无 widget/watch 字面 |
| [`app/welcome.tsx`](../../../apps/auspice-app/app/welcome.tsx) | 更新 header 注释；intro 与 ASO subtitle 同 register（已偏 almanac，复核） |
| [`components/AuspicePaywallSheet.tsx`](../../../apps/auspice-app/components/AuspicePaywallSheet.tsx) | 仅展示 `t.proBenefits` — 无硬编码 |
| [`FlagshipUpsellInsert.tsx`](../../../apps/auspice-app/components/FlagshipUpsellInsert.tsx) | 修「Kindred Kindred」typo；upsell 文案禁 fortune |
| [`lib/widget-config.ts`](../../../apps/auspice-app/lib/widget-config.ts) | 若保留 `/display` 路由：en 标签 i18n 化；**或** Phase 4 隐藏路由 |
| [`lib/pushRegistry.ts`](../../../apps/auspice-app/lib/pushRegistry.ts) | 更新文件头注释（server push 已上线）；holiday 类型标注 deprecated 若 UI 已移除 |

**Explore 默认展开：** `DayView` `exploreOpen = true` vs IA doc「默认折叠」——产品二选一后改代码或改 doc。

---

## Phase 3 — 截图脚本与 IA 文档（0.5 天，代码库内）

| 文件 | 修改 |
|------|------|
| [`docs/publish/screenshot-direction.md`](../../publish/screenshot-direction.md) | S1：去掉 Calendar/Settings **icons** → 底部文字 hint + 周条；S3：「节庆 tab」→ Settings → Library → glossary；**S7 移出 v1 默认 deck** 或标 post-v1 |
| [`docs/apps/yuun/ia-today-first.md`](./ia-today-first.md) | 与 index/calendar 手势、hint 位置一致 |
| [`docs/apps/yuun/launch.md`](./launch.md) | 删除「CalendarStrip 在首页」「节假日 Settings toggle」等过时句 |

实拍由人完成；**脚本必须与当前 build 一致**，否则 2.3.1。

---

## Phase 4 — 隐藏或未 ship 能力的代码处理（0.5–1 天）

避免审核员 deep link 或 Xcode 扫到「写了但用不了」。

| 能力 | 建议代码动作 | 理由 |
|------|--------------|------|
| Widget / Watch | **从 ASO 删除**（Phase 1）；可选：注释掉 `_layout` 的 `display` Screen 或 Me 永不链入 | 2.3.1 |
| `/display` | 同左 | 孤儿路由 |
| `DevWidgetPreview` | 确认无 import；或 `__DEV__` only | 减噪音 |
| Holiday push UI | `pushRegistry` holiday 标 deprecated；文档说明已移除 CN 调休 toggle | 与 ASO「节日推送」区分：节气/节日 ** evening heads-up** 仍可能通过 daily/evening |

**不要** 为提审临时「假 Widget 截图」——要么 ship native，要么不写。

---

## Phase 5 — 自动化校验（1 天，代码）

新增 `scripts/aso-code-parity.mjs`（或 extend `aso-charcount.mjs`）：

```text
输入：
  - apps/auspice-app/aso-metadata.json
  - apps/auspice-app/lib/i18n.ts（extract proBenefits 4 locales）
  - 可选：docs/apps/yuun/aso-code-audit-matrix.md 中的 MUST_NOT_CLAIM 列表

检查：
  1. description 含 MUST_NOT_CLAIM 词 → exit 1（widget, Watch, 4 tab, iCloud sync, Small widget…）
  2. title/subtitle/keywords 命中 _doNotUse → exit 1（现有逻辑）
  3. 4 locale 字段齐全（title/subtitle/keywords/promotionalText/description）
  4. privacy/terms URL 格式匹配 lib/config.ts 正则
  5. WARN：description 含 fortune/predict/lucky（正文软禁词）

输出：Markdown 报告 → CI artifact
```

**package.json（auspice-app 或 root）新增 script：**

```json
"aso:parity": "node scripts/aso-code-parity.mjs apps/auspice-app/aso-metadata.json"
```

**CI：** PR 改 `aso-metadata.json` 或 `lib/i18n.ts` proBenefits 时跑 `aso:parity` + `aso-charcount`。

---

## Phase 6 — 配置占位与类型（0.5 天，代码 diff）

不填真实 secret，但消除「提交 build 仍带 REPLACE」的 footgun：

| 文件 | 动作 |
|------|------|
| [`eas.json`](../../../apps/auspice-app/eas.json) | production env：文档注释「EAS Secrets 注入 EXPO_PUBLIC_REVENUECAT_IOS_KEY」；`ascAppId` 填真实值前 build 脚本 **fail** |
| [`app.json`](../../../apps/auspice-app/app.json) | extra RC key 占位 → 与 eas 一致 |
| [`lib/config.ts`](../../../apps/auspice-app/lib/config.ts) | `APP_STORE_URL`：无 ascAppId 时用 `#` 或 omit，**禁止** `idREPLACE_WITH_*` 上架 build |
| 新增 `scripts/assert-release-config.mjs` | prebuild/EAS 前：`ascAppId`、RC key 非 REPLACE → 否则 exit 1 |

---

## Phase 7 — 手工 smoke 清单（代码产出物，0.5 天）

在 `docs/apps/yuun/pre-submit-smoke.md` 写 **逐步路径**（审核员可复现），每条对应 ASO bullet：

1. 冷启动 → Welcome → Today 宜忌 + For you 占位  
2. 右滑 → Calendar → 左滑回 Today（动画方向）  
3. 左滑 → Settings → Library 六入口  
4. en：节气拼音、农历日名；月历无 en 吉凶 shading  
5. Paywall：四条 `proBenefits` 与 ASO Pro 列表一致  
6. Free：宜忌全、For you 原因锁、择日 30 天  
7. Pro sandbox：timeline / reading / personal webcal（需 backend）  
8. Settings → Legal → privacy/terms 200  
9. Push tap → Today For you 区  

---

## Phase 8 — 执行顺序与 PR 拆分

```text
PR-A  audit matrix + aso-code-parity 脚本骨架（只读+CI）
PR-B  aso-metadata.json 4 locale 重写 + screenshot-direction + launch/ia doc
PR-C  i18n proBenefits / welcome / typo / pushRegistry 注释
PR-D  assert-release-config + eas 文档（不含真实 secret）
PR-E  （可选）隐藏 /display、Explore 默认折叠
```

**合并门槛：** `bun typecheck` · `aso:parity` · `aso-charcount` · 手工 smoke 1–5 通过。

---

## 附录 A — 当前必须删除或改写的 ASO 短语（清单）

复制到 Phase 1 PR description：

- [ ] `4-tab structure` / `4 tab` / `4 タブ` / `4 tab 结构`
- [ ] `Today / Calendar / Festivals / Me` 作为 tab 名
- [ ] `Small widget` / `Widget × 3` / `ウィジェット` / `小组件`（Free/Pro 权益行）
- [ ] `Apple Watch` / `Watch` / `ウォッチ`
- [ ] `cross-device sync` + `iCloud-encrypted`（除非改为 subscription restore 表述）
- [ ] `Festivals tab`（截图 S3 文案）
- [ ] `full 黄历` vs `basic 黄历`（改为 For you / reasons / 命书 等精确 gate）
- [ ] en description `major-fortune` → `10-year cycle` / `decade chapter`
- [ ] ja `promotionalText` 中的 `ウィジェット＋Watch`

---

## 附录 B — 代码 SSOT 快速索引（审计用）

| 用户可见能力 | 入口 | Pro? |
|--------------|------|------|
| 今日宜忌 | `DayView` + `YiJiBlock` | Free 全量 |
| For you | `PersonalCard` | 摘要 Free；原因 Pro |
| 月历 | `/calendar` + `CalendarStrip` | Free |
| 周条 | `WeekStrip` | Free |
| 探索/文化 | Library → `/glossary`，Today Explore | Free |
| 命书 | `/reading` | Pro |
| Timeline | `/timeline` | Pro |
| Make-if | `/makeif` | Pro |
| 择日 | `/event` | Free 30d/3；Pro 自定义 |
| 亲友 | `/people` | Free ≤3 提醒 |
| 推送 | Settings → Notifications | daily/evening Free；timeline Pro |
| Apple 黄历订阅 | Settings → Calendars | Free webcal |
| 个人黄历 feed | Settings → Calendars Pro row | Pro + secret |
| 外地时区 | Settings → remote-tz | Free |
| Widget/Watch | `/display` | 未 ship |

---

*Last updated: 2026-07. Owner: auspice-app. Re-run Phase 0 matrix after any IA or ASO change.*
