# Yuun「黄历原声」— classical voice mode plan

> **Status**: P0+P1 落地、P2 部分落地（2026-08）。目标：把 Yuun 从"黄历工具"
> 升级为可主打 **Lifestyle / Education 类目的文化产品**——打开开关后，文字表述
> 从白话解释切回**黄历原文行话**（岁次、建除、星宿、诸事宜早）。

## 文化定位（为什么做）

App Store 的 Lifestyle / Education 类目比拼的不是工具效率，而是**文化厚度**：
节日、节气、时辰、干支、紫微是 Yuun 独有的内容资产。现状是"现代白话介绍黄历"；
「黄历原声」把它翻转为"以历书的腔调说话"——日期行「岁次庚子年 · 六月十七」、
日签「君子终日乾乾」、判语「诸事宜早，不宜迟疑」。这是纯文化参照口径，
不新增任何预测性宣称（ADR-0003 姿态不变，审核备注沿用）。

**命名论证（2026-08 二次修订）**：弃用「回到两千年前」（时间指代承诺字体——
汉简小篆做不到），也弃用「古黄历」——**黄历不分古今**，宜忌建除行话从古至今沿用，
现代通书照用。真正的对立是**原文行话 vs 白话解释**，所以开关名 = 「黄历原声」，
名字即宣称：切换的是文字表述，不是年代。

**范围收敛（2026-08 二次修订）**：把「语域切换」与「功能扩展」解耦——
- **语域切换（跟随开关）**：日期行、日签、判语（Timeline/八字初判/推送）、
  典籍置顶——凡是"说话方式"。
- **功能扩展（不跟开关）**：首页「历书」行话区块（建除/值神/星宿/彭祖/纳音）
  **zh 常驻**——行话是黄历的组成部分，现代黄历 App 也展示，不藏在开关后。

## Culture 物料质量审计（2026-08）

| 资产 | 体量 | 质量 | 缺口 |
|---|---|---|---|
| 24 节气 | 3281 行，每篇 96–140 行，四语 | **强**：物候三候/农事/养生/诗（《诗经》《月令》引用），CJK literal + en explained（ADR-0020） | 典籍原文未置顶；无文言导语 |
| 8 大节日 | festival-content + 各篇 ~100 行 | 强：节俗/诗/饮食四语 | 同上 |
| 时辰 | shichen-content 293 行 | 中：十二时辰 + 范围 + 五行 | 文言表述（子时·夜半）未系统化 |
| 干支 | ganzhi-content 200 行 | 中：60 甲子表 + 五行 | 纳音缺失 |
| 紫微 | glossary ZiweiIntro 组件 | 弱：仅入门介绍 | 星曜/宫位无系统内容 |
| 黄历行话 | 引擎有数据（dayOfficer/mansion/dayGod/pengZu），UI 仅零星展示 | 弱：**建除十二神、黄黑道、值神、二十八宿、彭祖百忌、纳音在展示层不成体系** | 这是 P2 的核心增量 |
| 宜忌 | astro-core yiji-vocabulary（modern/traditional 双表） | 强 | 已并入 classical |

## 开关设计

- **命名**：`黄历原声`（zh-Hans）/ `黃曆原聲`（zh-Hant）/ `黄暦原声`（ja，未显示）/
  `Classic modern`（en，未显示）。历史：初名「回到两千年前」→「古黄历」→
  「黄历原文」→「黄历原声」→「**黄历模式** / Classic modern
  天然成对**——原声=历书自己的声音，仍无年代/字体承诺）。**四次修订（2026-08）**：
  改名「黄历模式」（en：Classic modern）——名实对齐「切换即换首页」：
  黄历模式 ON = 首页变撕页黄历、大尺寸小组件变黄历组件。**黄历大组件已落地
  （2026-08）**：iOS WidgetKit + Android Glance 双端，`data.classical=true`
  （zh）时 systemLarge/4×4 渲染撕页黄历纸页——竖排干支/建除/值神/星宿
  与农历/岁次、大日期+纳音、冲煞彭祖、全宽宜忌（赭金/墨棕）、文言于你；
  payload 新增 dayGod/evilDirection/pengZuStem/pengZuBranch/nayin +
  chrome.forYou 文言；布局常量 `widget-spec.json family.large.almanac.*`
  （生成 WidgetSpec.swift/.kt，preflight 校验）。二稿（2026-08）：去掉双线外框
  （圆角容器内突兀），上/下 padding 收紧（vPadding 8，贴大组件），横向保持
  圆角留白；非黄历模式/非中文保持原布局。
  每次修正都是名实校准
  （见上文论证）。
- **简繁形态**：zh-Hans = 简体通书形态（大陆通书传统：简体排版 + 行话条目，
  本就可读）；zh-Hant = 历书正体（完整形态）。共享同一语域层，仅字形不同。
  竖排/小篆不做——移动端可读性优先，也不宣称。
- **语义**：`voiceMode: 'contemporary' | 'classical'`，泛化自旧宜忌开关——
  存储新 key `auspice.voice.mode`，旧 `auspice.yiji.displayMode` 作为一次性迁移种子
  （选过「传统黄历词」的老用户自动进入 classical）。
- **联动（2026-08 三次修订 — 全量收敛）**：开关不再"强制"旧宜忌存储，而是成为
  **黄历术语的唯一语体源**（见 `resolveRegisterSync` / `resolveRegisterForLocale`）：
  - **zh**：classical → 宜忌用原文动词（嫁娶/开市/立券/移徙/动土…）；contemporary（默认）
    → 白话现代词（结婚/开业/签约/搬家/开工…）。**默认白话**——产品只有一个默认语体，
    原文是中文用户的增强选项；选过「传统黄历词」的老用户经迁移种子自动进 classical。
  - **择时屏**：10 事项 chips 白话↔原文（eventsClassical i18n 表）；现代词 chips 白话
    （面试/换工作/…）↔ **原文映射**（见贵·求财/修造/…，即打分所用宜忌动词，cap 2——
    现代概念在原文里不存在，展示其映射动词是唯一诚实呈现）；结果判词随开关
    （server `/search` + 4 specialized 路由新增 `voiceMode` 参数，`reasoningYijiMode`）。
  - **推送**：server `resolvePushYijiMode` 同一规则——zh 按订阅者 voice_mode 渲染宜忌
    动词（classical→原文 / contemporary→白话），非中文用 yijiMode 字段或 locale 默认；
    客户端切换开关时 re-sync 推送注册（此前只刷 widget）。
  - **en/ja**：**没有这个开关**（设置页不显示），**只有白话**（locale 默认 gloss），
    **不做黄历原文的翻译**——文言/白话是中文特有的语体对，翻译成 archaism 是发明不是
    原文。原 en/ja「现代/传统场景词」小开关已拆除（ja 的"传统"表本就是白话日文释义）。
  - 旧宜忌存储 key `auspice.yiji.displayMode` 降级为一次性迁移种子，不再写入；
    `applyVoiceModeSideEffects` 已删除。
- **locale 策略**：开关只在 zh-Hans/zh-Hant 显示；en/ja 无开关（无内容不展示）。
- **文案物料双轨（2026-08 三次修订）**：为五块表面各备一套原文文案，**简体/繁体
  分支**，开关整体切换（不是零散换动词）——
  - 择时屏 chrome：`pickEvent/search/recommended/noResults/searching/eventWindowLabel/
    specializedActive/modernEventsTitle` 各加 `*Classical` 键（择事/择吉日/首荐/
    此期未见合宜之日/正在择吉…/择期/建除相宜 已启/今事）；事件 chips 用
    `eventsClassical`，现代词 chips 用原文映射动词。**2026-08 四次修订：不再折叠**，
    10 事项 + 现代词组全量展示，注册表随开关整体切换。
  - 对你而言：`forYouClassical`（于你/於你）+ `fitClassical`（宜进/守常/宜慎）+
    `summaryClassical`（文言判语）。
  - 首页：日签/日期行/宜忌动词/判语已随开关（DayCard model + 注册表推导）。
  - timeline：文言标题 + timelineAdviceClassical 判语（先期已落地）。
  - 推送：server 按 voice_mode 渲染宜忌动词 + 原文订阅者纯行话（无「对你而言」
    现代标题、无 reason 行）。
- **黄历原声首页（2026-08 终版：HTML 设计稿一比一移植）**：
  `docs/apps/yuun/huangli-home-mock.html`（可浏览器直接打开的设计稿，
  对齐 m.168888.com.cn 日页并裁剪，标注数据可得性开关）→
  `components/AlmanacPage.tsx` 逐块移植：
  - **header**：真实 Yuun Logo（PhaseLogo 平滑明界线月相球 + Yuun 字标 +
    「黄历·今日」，右挂 农历月日·干支日）；顶部标签栏删除；白话模式 header 不变；
  - **日期块**：月头+农历月 / 星期 / **大号日期** / 农历年月日（中文数字）
    / 三柱干支（月柱=五虎遁+节令月）/ 当日节气；
  - **宜|忌双栏**：赭金/墨棕栏头 + **杨公忌日注记条**（`isYangGongDay`
    十三日表，参考页冬月廿一命中 ✓）；
  - **生辰八字五行**：年/月/日/时四柱 + 每柱纳音（时柱取当日子时），
    对页验证 覆灯火/劈雳火/杨柳木/桑柘木 ✓；
  - **信息行**：五行(纳音)/冲煞/值神/建除(附白话)/彭祖/星宿；
  - **时辰吉凶**：时家黄道起例（对页逐时辰验证 ✓），赭金吉/墨棕凶；
  - **吉神方位**：财神/喜神（日干口诀表，对页验证 ✓）；
  - **刑冲害合**：branchRelationSummary 引擎归组，句式对齐参考页 ✓；
  - 通书月历 → 于你文言判语；DualTzBanner/现代功能区在原文模式隐藏。
  - **配色决策（2026-08）**：弃用朱砂红（西语境警示联想）+ 红绿（色盲），
    改 **赭金 #9a6b1f（宜/吉）+ 墨棕 #4a3324（忌/凶）**，落在 Yuun 品牌
    暖色系（Logo 羊皮纸/深棕同族）；暗色模式提亮为 #d9b36a/#cdbba7。
  - 胎神/吉神凶煞/日禄/福神/阳贵仍缺数据字段，不渲染不伪造（设计稿中以
    灰色标注标记）。
  - **撕页黄历风（2026-08 三稿）**：弃现代卡片（圆角/表格）→ 双线框纸页 +
    左右竖排条（干支日/建除/值神/星宿 竖排、农历/岁次 竖排）+ 中央大号日期 +
    框内全宽宜忌；下方各节细线分隔、无圆角；左右 padding 收敛（lg）。
  - **light/dark 双色板**：`almanacPalette(isDark)` — 亮色宣纸（#f6f1e6/墨
    #2b2118/赭金 #9a6b1f/墨棕 #4a3324），暗色墨纸（#171310/米 #e9ddc8/
    金 #d9b36a/棕 #cdbba7）；header 与页面背景同步跟随。
  - **For you 判级意象（2026-08）**：三态设计 = 手绘圈（墨量与闭合度分档：
  吉=赭金细开弧/平=墨棕轻量半闭/凶=朱砂中量多笔圈）+ 墨色端正判级字居中、
  圈画在字上层（红笔圈字效果）；en/ja 纯文字判级。预览稿
  `docs/apps/yuun/for-you-mock.html`。**小组件同步**：iOS WidgetKit 用
  SwiftUI Path 画同源三档圈（`VerdictLoop`，fitGlyph 字段 zh 黄历模式专用）；
  Android Glance 无任意路径绘制 → 彩色判级字回退（金/棕/朱砂），位图方案
  列为后续（与 MoonPhaseBitmap 同路）。
- **推送着陆闭环（2026-08）**：推送 ≠ For you——推送是渠道、For you 是内容板块。
  闭环设计：①服务端 daily push 在订阅者有生辰（pers）时 data 加
  `focus:'personal'`，点推送直达对你而言；②首页双布局都支持滚动锚点
  （黄历首页的于你补 onPersonalSectionLayout）；③着陆时对你而言/于你显示
  「今日推送」徽标（`personal.pushOriginBadge` 四语），白话首页的 hook 行
  （dailyHook）作为推送内容的回声；④后续 IAP 漏斗：判级（免费）→
  了解原因（Pro 原因码）→ 深读（Pro LLM），open/outcomes 度量已在
  /push/open · /push/outcomes。
- **术语国际卡（2026-08 七次修订）**：88 条宜忌动词补 en/ja 一句话释义 +
    拼音/读音（`TERM_PINYIN/EN/JA` 三表，`yijiMeaning` 四语返回：en=拼音+英文，
    ja=读音+日文；繁体输入经 `toHans` 归一）。方法：Wikipedia en/ja 无术语级
    条目 →「原文 + 拼音 + 一句话白话解释」自写通书口径；写不进白话的保留原文
    （文化参考）。文化 hub 释义列表去 zh 门，四语可见；en/ja 首页宜忌点击
    解释层随之生效。Home/Lock/Watch 大组件预览跟随黄历模式（WidgetCard
    AlmanacLargePreview 纸页预览）。
  - **全术语可解释层（2026-08 四稿）**：核心诉求「不懂干支五行也能看懂」——
    Hero 纸页每个行话（干支日/建除/值神/星宿/农历/岁次/纳音/冲煞/彭祖）与
    信息行值均可点击，弹出白话解释；`lib/culture/hero-terms.ts` 11 词四语
    （岁次/干支/建除/值神/星宿/冲煞/彭祖百忌/纳音/五行/生肖/农历，先「是什么」
    后「今天怎么用」）；宜忌动词释义走 yiji-meanings（zh 88 条）。下方各节改
    通书式「── 标题 ──」+ 细线表格（无圆角无卡片底），于你与各模块同构对齐。
  - **宜忌释义（2026-08）**：`lib/culture/yiji-meanings.ts` — 维基百科「黄历」
    条目「择日宜忌」59 条逐条收录 + 常用宜忌动词补充 29 条（共 88 条）；
    简/繁双轨（语料级 S2T 映射，测试锁定）；**点击宜忌词弹出释义**
    （YiJiMeaningSheet，免费、确定性）；文化 hub「黄历行话」内新增分组释义
    列表（冠婚丧祭/建筑搬迁/生活起居，zh-only）；国际化时参照 Wikipedia
    对应语言条目再补 en/ja。
- - **ja 决策（2026-08）**：日语黄历原文绝大多数就是汉字（理论上可复用），但
  **不做 ja 原文**——语体层是中文特有现象，ja 复用汉字不等于 ja 用户理解文言；
  ja/en 恒用白话通用版（现状），无开关；en/ja 的白话黄历布局列为数据门控 P2
  （等 zh 版开启率/留存数据验证后再排期）。
- **en/ja 黄历模式（2026-08 六次修订，创始人裁定「民族的就是世界的」）**：
  黄历首页 + 大组件 + 开关全四语——zh/zh-TW 竖排原文、**ja 竖排白话**、
  **en 横排白话**（拉丁字不竖排）；对 en/ja 黄历模式=布局+白话术语
  （`lib/almanac-copy.ts` 四语文案与格式助手；动词走本地化词表
  formatYijiVerb；文言判语/日签仍 zh-only）。widget payload 的 classical 标志
  改为全语言生效，Swift/Glance 的 en 分支去掉竖排条、大日期+干支·农历一行。
- **默认值（2026-08 六次修订）**：**新安装全语言默认黄历模式 ON**——classic 黄历
  比白话版更有吸引力，是产品身份（首启即撕页黄历，白话一键可回）；
  存量用户（已有任一语体 key）与 en/ja 不动。`seedVoiceModeDefault(locale)`
  在根布局首次启动执行，写入 `auspice.voice.mode`；后续按新用户 D1/D7
  留存验证，若低于白话组则回滚默认值。已知代价：择时屏原文标签
  （嫁娶/立券/移徙）暂无解释层，列为下一洞。
- **影响面矩阵（收敛后，只跟开关的"说话方式"）**：首页日期行/日签、节气/节日
  典籍置顶、Timeline 节点标题与判语、八字初判判语、推送措辞。**不跟开关的**
  （内容常驻）：首页「历书」行话区块（zh）、glossary 百科。

## 已落地（P0）

1. `lib/voice-mode.ts` + `lib/voice-mode-context.tsx` — 开关基础设施（订阅、迁移、
   副作用联动），`VoiceModeProvider` 已挂根布局。
2. `lib/culture/classical-tips.ts` — 文言日签 30 条 × 简/繁（按日序确定性轮换）。
3. Settings（me.tsx）— zh locale 显示「回到两千年前」开关；en/ja 保持旧宜忌开关。
4. 首页 DailyCard — classical 时：日期行 `岁次庚子年 · 六月十七`、日签文言。
5. i18n 4 locale 补 `voiceMode*` 三键。

## 路线图

### P1 — 文言层全面铺开（zh-Hans/zh-Hant）
- [x] Culture 典籍层：节气/节日详情 classical 时置顶原文——24 节气《月令七十二候集解》
      三候原文 + 8 节日诗句，简/繁双套（`lib/culture/classical-entries.ts`，
      详情页 masthead 置顶块，白话 sections 随其后）
- [x] Timeline：节点标题文言化（大运「丙午大运 · 十载」、流月「甲辰之月」）、
      大运 selector 干支主导 + 文言建议（timelineAdviceClassical 四 locale）
- [x] 八字初判（BaziPreliminarySheet）：判语文言（「合参曰：诸柱相合，气脉相生」句式，
      四维行话 + 生肖文言判语，`LC` copy set 简/繁双套）
- [x] 宜忌语体全量跟随开关（2026-08 三次修订）：`useYijiDisplayMode` 改为从 voice
      mode 推导（zh classical→traditional / contemporary→modern；en/ja→locale gloss），
      Today 卡片/日详情/月历/widget/watch/本地 fallback 推送全部经由
      `resolveRegisterSync` / `resolveRegisterForLocale` 同一规则
- [x] 择时屏：10 事项 + 现代词组 chips 白话↔原文，结果判词随开关（server voiceMode 参数）
- [ ] 对你而言：verdict 文言句（「吉——诸事宜早，不宜迟疑」）
- [x] 推送：zh 推送按订阅者 voice_mode 渲染宜忌动词（classical→原文 / contemporary→白话，
      `resolvePushYijiMode`），classical 抑制白话 dailyHook 行、推送保持纯行话
      （干支/宜忌/冲煞/值神/彭祖/尾注）；切换开关时客户端 re-sync 推送注册；
      本地 fallback 的对你而言行换文言建议（timelineAdviceClassical）
- [ ] 日签校准：典籍句 + 历书体例句混排（「宜祭祀祈福」类仅作文化引用，不写
      吉凶神煞断言），确保「古黄历」名下内容名实相符

### P2 — classical 专属功能扩展（古黄历全景）
- [x] 黄历行话内容：**迁入文化 hub「黄历行话」分区（2026-08 三次修订）**——
      首页不再内联展开（用户裁定：正统通书内容属于 culture，不是今日首页的展开项）。
      `/glossary` 新增 `huangli` 类目（建除十二神/黄黑道十二值神/二十八宿/十二时辰
      文言名/彭祖百忌/纳音，白话解释先行、行话原文随附），`components/glossary/
      AlmanacGlossary.tsx`；原 `ClassicalAlmanacPanel` 已删除（今日值日/值神/星宿
      摘要行随迁，后续如需要放日详情而非首页）。内容均为正统通书体系
      （OFFICER_YIJI/TWELVE_OFFICERS/TWENTY_EIGHT_MANSIONS），非自创学说。
- [ ] 时辰文言化接入 ShichenWheel 等 UI（词典已备 `shichenClassicalName`）
- [ ] 紫微斗数星曜入门（十四主星文言释义）
- [ ] 分享卡片文言模板（岁次 + 文言日签 + 行话落款）

### P3（可选，数据驱动）
- [ ] ja 文言层（日文古历语域）
- [ ] en 只做"classical glossary"（英文介绍 + 中文原典对照，不改 UI 语域）

## 审核口径（不变 + 增强）

- 姿态仍是"文化参考、非预测"（ADR-0003）；文言是**语言风格**，不改变内容性质。
- 审核备注新增一句：`A "classical voice" toggle restates the same cultural
  reference content in the traditional almanac register (岁次/建除/星宿) — a
  language style, not a fortune claim.`
- 截图方向：Lifestyle/Education 类目下，Culture 内容（节气典籍页、时辰盘、干支表）
  升入前 3 屏；S1 仍以今日黄历开头（工具入口），S2/S3 转文化厚度。

## 指标

- classical 开关开启率（zh 用户）——若 ≥20% 且留存更好，说明文化定位成立，
  可支撑类目切换为 Lifestyle/Education 的决策。
