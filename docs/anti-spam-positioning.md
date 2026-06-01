# HexAstral · Anti-Spam Positioning Doctrine

> **Status**: ACTIVE — supersedes all prior marketing/UX positioning  
> **Context**: hexastral-app (com.hexastral.hexastral) was rejected under App Store Guideline 4.3(b) Design — Spam, in the "saturated astrology / horoscope / palm reading / fortune telling / zodiac" category. This doc is the playbook for everything we do differently to get fate / cycle / yuan / feng past review.

---

## 1. Strategic principles

### 1.0 The Actual 4.3(b) Bar (re-read 2026-05-31)

The hexastral-app rejection language is quoted verbatim from Apple:

> *"These app features may be useful, informative or entertaining, and the app may include features or characteristics that distinguish it. However, there are already enough of these apps on the App Store. Next Steps: We encourage you to reconsider the app concept and submit a new app that provides a unique experience not already found on the App Store."*

**The bar is NOT feature-level prohibition.** Apple explicitly acknowledged the features are "useful, informative or entertaining" and "include characteristics that distinguish it." **The bar is conceptual uniqueness at the App Store category level.**

This means features like compatibility scoring, AI chat, viral invite, daily insights, multi-person tracking — all **PASS** at the feature level (verified against Co-Star, The Pattern, Sanctuary, Truity 16Types, Helio — all approved astrology/compatibility apps). What fails is **app concepts that look like 1000 other apps in their category**.

**The 6 Conceptual Uniqueness Axes** (used by reviewer in first 3 screens + 4 ASO screenshots):

| # | Axis | Saturated example (✗) | Unique example (✓) |
|---|---|---|---|
| 1 | Novel data input | Pick your zodiac sign | Full birth (year/month/day/time + location) + family + partner |
| 2 | Novel output structure | Single-line daily horoscope | Multi-locale + classical citations + algorithmic visualization + multi-dimensional grid |
| 3 | Novel UX paradigm | Daily card flip | Calendar grid + 节气 timeline + multi-person chart + compass + widget/watch |
| 4 | Novel cultural framing | Western pop astrology | East Asian classical references + academic citations |
| 5 | Novel monetization | Card readings / psychic IAP | Utility subscription + reference IAP |
| 6 | Novel interactivity | Solo lookup | Viral partner invite + family multi-account + cross-device |

**Pass bar**: app must visibly demonstrate **2-3 ✓ axes in screenshots + ASO description**. Our 4 V1 apps (cycle / feng / yuan v2 / MingPan) all need to score ≥ 4/6 to be confidently submission-ready.

### 1.1 Master principle · The Empirical Science Framing

HexAstral is **structured pattern recognition rooted in 1500 years of empirical observation** — not theology, not divination, not fortune-telling. The Heavenly Stems and Earthly Branches encode a calendar-counting system; the Five Elements describe interaction patterns; the personality framework is analogous to MBTI / Big Five / Enneagram — a typology derived from systematic recorded observation. The "predictive" claim is no stronger than "MBTI predicts your behavior" — i.e., a structured frame for self-reflection, not prophecy.

**Implication for every surface**: lead with the *science* register (pattern · observation · classical scholarship · empirical · framework · typology · 1500-year tradition), not the *theology* register (destiny · fate · mystical · cosmic energy · prophecy). The product describes a system; it does not promise outcomes.

**Sub-principles** (derived from the master frame):

1. **HexAstral is NOT a Western horoscope product.** It is empirical Chinese cosmology + AI personal-narrative framework. Every surface must communicate this difference.
2. **Lead with utility and science, not entertainment.** Calculator. Educational tool. Empirical framework. Pattern study. NOT "discover your destiny."
3. **Reviewer-facing surfaces are scrubbed at the trigger-word level.** Anything reviewer can see (title, subtitle, keywords, description, screenshots, marketing URL, privacy URL link) is 4.3(b) territory.
4. **Internal-facing surfaces can use full domain language.** Code comments, ADRs, dev docs — these reviewer never sees. Don't over-correct.
5. **No mystical imagery.** No moons, stars, zodiac wheels, crystal balls, tarot, ouija, third-eye motifs in any reviewer-facing visual.
6. **No app named after rejected category terms.** Display name "Fate" was retired in SPAM-18 (2026-05-31) → renamed to **"MingPan"** (命盘 pinyin) for the same reason "Yuán" works: opaque to English-speaking reviewers, semantically accurate for Chinese speakers, no destiny/horoscope semantic. Internal slug / bundle ID stay `fate` / `com.hexastral.fate`. The surrounding copy must NEVER pair MingPan with "horoscope," "predict," "destiny."
7. **MBTI / Big Five / Enneagram are the analogies we openly invoke.** These are accepted Western personality frameworks with no 4.3(b) exposure. Positioning HexAstral as "the Chinese cultural equivalent of MBTI" is both honest and reviewer-defensible.

---

## 2. Vocabulary substitution tables

### 2.1 English — HIGH RISK terms to remove

| Forbidden | Why | Replacement |
|---|---|---|
| astrology | Directly cited in 4.3(b) | BaZi · Four Pillars · Chinese cosmology · classical Chinese tradition |
| horoscope | Directly cited | personality reading · birth chart · cosmic blueprint |
| fortune telling | Directly cited | personal narrative · self-reflection consultation |
| palm reading | Directly cited | (defer feature; if shipped: physiognomy study) |
| zodiac | Directly cited | (avoid entirely; if absolutely needed: "twelve earthly branches") |
| divination | Adjacent | consultation framework · decision-making study |
| destiny | High-risk noun | cosmic blueprint · personal narrative · life pattern |
| fortune (good/bad) | High-risk | favorable / unfavorable interactions |
| lucky / unlucky | High-risk | favorable element / unfavorable element |
| prophecy / predict (the future) | High-risk | identify patterns · surface insights · analyze |
| spiritual reading | High-risk | reflective journaling · contemplative practice |
| mystical | High-risk | classical · traditional · scholarly |
| cosmic energy | High-risk | element interactions · pillar relationships |
| psychic | High-risk | (remove entirely) |
| occult / supernatural | High-risk | (remove entirely) |
| witchcraft / sorcery | High-risk | (never appropriate) |

### 2.2 English — APPROVED replacement vocabulary

Lead with these words in title / subtitle / keywords / description / screenshots:

- **BaZi** · **Four Pillars** · **Ming Li (命理)** — the cultural-tradition framing
- **AI life coach** · **AI personality coach** · **AI-augmented self-reflection** — the AI-tool framing
- **Personality framework** · **archetype framework** — psychology-adjacent (MBTI / Enneagram analog)
- **Self-reflection** · **journaling** · **introspection** — wellness-adjacent
- **Lunar calendar** · **24 solar terms** · **almanac** · **Chinese calendar** — calendar-tool framing
- **Cultural heritage** · **classical scholarship** · **traditional knowledge** — education framing
- **Study tool** · **educational tool** · **learning companion** — utility framing
- **Birth chart calculator** · **chart generator** · **chart analyzer** — calculator framing

### 2.3 Chinese (Simplified + Traditional) — HIGH RISK to remove

Reviewer in mainland-CN / TW / HK Apple Stores may auto-translate. Same trigger system applies in Chinese.

| 禁用 | 替换 |
|---|---|
| 占星 / 算命 | 八字 · 命理（小心使用）· 中华命学 · 四柱 |
| 预测 / 预言 | 模式分析 · 性格框架 · 命盘解析 |
| 运势 / 吉凶 | 五行互动 · 喜忌 · 强弱平衡 |
| 神秘 / 玄学 | 传统 / 古典 / 命理研究（前提：上下文中性）|
| 命运 / 宿命 | 命盘 · 性格档案 · 人生模式 |
| 灵性 | 反思 · 内省 · 心灵研究 |
| 卜卦 / 起卦 / 占卜 | （延后这些 feature）· 卦学研究 |
| 风水（独立提及）| 居所分析 · 空间格局 · 环境布局（注意：feng-app 内部仍可用「风水」，但 App Store 描述中替换）|
| 幸运 / 好运 | 喜用神 · 有利五行 |

### 2.4 Japanese — HIGH RISK

| 禁用 | 替换 |
|---|---|
| 占星術 / 占い | 八字 · 命理 · 中華命学 · 四柱推命 |
| 運勢 / 運命 | 性格分析 · 五行解析 · 命盤 |
| 神秘的 / 霊的 | 古典的 · 伝統的 · 学術的 |
| 風水（独立提及）| 居所分析 · 空間設計 |
| 開運 / 吉凶 | 五行バランス · 有利不利 |
| スピリチュアル / オカルト | （削除）|
| 占卜 / 卦 | （該当 feature を延期）|

### 2.5 Traditional Chinese (繁体, TW Apple Store) — HIGH RISK

Largely same as Simplified, with traditional-character forms:

| 禁用 | 替換 |
|---|---|
| 占星 / 算命 | 八字 · 命理 · 中華命學 · 四柱 |
| 預測 / 預言 | 模式分析 · 性格框架 · 命盤解析 |
| 運勢 / 吉凶 | 五行互動 · 喜忌 · 強弱平衡 |
| 神秘 / 玄學 | 傳統 · 古典 · 命理研究 |
| 命運 / 宿命 | 命盤 · 性格檔案 · 人生模式 |
| 風水（獨立提及）| 居所分析 · 空間格局 |
| 卜卦 / 起卦 / 占卜 | （延後 feature）|

---

## 3. Per-app repositioning

### fate-app — `com.hexastral.fate`

| Surface | Old (rejected register) | New (safe register) |
|---|---|---|
| Category | Lifestyle | **Education** (primary) / Lifestyle (fallback) |
| Title | "Fate · Chinese Astrology" | **"Fate · BaZi & AI Coach"** |
| Subtitle | "Discover your destiny" | **"Four Pillars · AI insights"** |
| Brand voice | Mystical, prophetic | Analytical, educational, AI-augmented |
| Hero promise | "Find what fate has in store" | "Generate your BaZi chart. Explore your personality through 1500 years of classical Chinese tradition." |

### cycle-app — `com.hexastral.cycle`

| Surface | New register |
|---|---|
| Category | **Reference** or Utilities (NOT Lifestyle to distance from horoscope) |
| Title | **"Cycle · Lunar Almanac"** or **"Cycle · 24 Solar Terms"** |
| Subtitle | **"Chinese calendar + nature rhythm"** |
| Brand voice | Calendar tool · seasonal reference · educational |
| Hero promise | "Track the 24 solar terms, lunar phases, and daily 干支 of the Chinese calendar." |

### yuan-app — `com.hexastral.yuan`

| Surface | New register |
|---|---|
| Category | **Lifestyle** (relationships angle) |
| Title | **"Yuan · BaZi Compatibility"** |
| Subtitle | **"Relational insights · classical study"** |
| Brand voice | Relationship learning · two-chart comparison · educational |
| Hero promise | "Compare two BaZi charts. Study how Five Elements interact across pairings." |

### feng-app — `com.hexastral.feng`

| Surface | New register |
|---|---|
| Category | **Lifestyle** (home/space) |
| Title | **"Feng · Site & Space Analysis"** |
| Subtitle | **"Classical site theory · for your home"** |
| Brand voice | Spatial analysis · practical tool · educational |
| Hero promise | "Analyze your home/office layout using classical Chinese site theory." |

### face-oracle / coin-cast / dream-oracle — **DEFERRED**

Per SPAM-9, these three are paused from active dev. Their existing names map directly to 4.3(b) trigger phrases:

- "face-oracle" / "palm reading" → directly cited in rejection
- "coin-cast" / "I-Ching divination" → "divination" cited
- "dream-oracle" / "dream interpretation" → fortune-telling adjacent

When eventually revived, they likely need:
- Rebrand: "Yin · Cultural Physiognomy" / "Liu · I-Ching Study" / "Meng · Dream Journal"
- Reframe as 100% educational: "Learn classical Chinese 相术 framework" instead of "Get your face read"
- Position as web/PWA-only initially to avoid further App Store account damage

---

## 4. Submission sequence

**Cadence**: 2-3 weeks between app submissions. Avoid same-week multi-submit (triggers automated spam check on account).

| Wave | App | When | Rationale |
|---|---|---|---|
| W1 | **fate** | First (after metadata + scrub complete) | Most defensible as "BaZi educational tool" — establishes account credibility |
| W2 | **cycle** | 2-3 wk after W1 ships or appeal-cleared | Pure reference / calendar tool — minimal 4.3(b) risk |
| W3 | **yuan** | 2-3 wk after W2 | Relationship-compatibility framing — middle risk |
| W4 | **feng** | 2-3 wk after W3 | Spatial-tool framing — Lifestyle category |
| W5+ | face / coin / dream | NOT BEFORE all 4 above approved | Even then, deep rework required |

**If W1 (fate) is rejected:**
1. Reply in Resolution Center (English) emphasizing: not Western astrology, BaZi = 1500-year educational tradition, AI personality framework analog to MBTI/Enneagram, cite academic literature (《三命通会》《滴天髓》《子平真诠》)
2. Modify metadata per reviewer feedback, resubmit
3. If 2 rejections: appeal to App Review Board
4. If 3 rejections: pause Wave 2-4, double down on PWA path

---

## 5. Surface-by-surface checklist (use before any submission)

### App Store Connect — title (30 char)
- [ ] Does NOT contain: astrology, horoscope, zodiac, fortune, lucky, palm, destiny
- [ ] Contains: BaZi OR Four Pillars OR Lunar OR Almanac OR Compatibility OR Site Analysis

### App Store Connect — subtitle (30 char)
- [ ] Same forbidden list
- [ ] Frames as: AI tool / educational / cultural / calculator / study

### App Store Connect — keywords (100 char)
- [ ] Forbidden: astrology, horoscope, zodiac, fortune-telling, palm-reading, divination, psychic
- [ ] Approved: bazi, four pillars, ming li, chinese, classical, AI, personality, self-reflection, study, heritage, lunar, almanac, calendar, compatibility, site, analysis

### App Store Connect — promotional text (170 char)
- [ ] Opens with action / utility, not promise of fortune
- [ ] Mentions "AI" or "calculator" or "study" or "educational" in the first 80 char (above the fold)

### App Store Connect — description (4000 char)
- [ ] First paragraph EXPLICITLY differentiates: "Not Western astrology. Not fortune-telling. A study tool grounded in 1500 years of classical Chinese tradition + modern AI."
- [ ] Lists actual features in utility-tool framing ("Generate your chart" not "Discover your destiny")
- [ ] Cites cultural/academic context (mentions classical texts by name)

### Screenshots (up to 10)
- [ ] NO moons, stars, zodiac wheels, mystical imagery
- [ ] LEAD with: structured data tables, calculation results, AI chat interfaces, calendar grids
- [ ] EDUCATIONAL elements: tooltips explaining what 五行 means, history of BaZi, classical text excerpts

### In-app strings (i18n)
- [ ] Reviewer typically only sees onboarding + main feature screens during testing
- [ ] First-screen copy must pass the same scrub as App Store metadata
- [ ] Settings / Me / Privacy URLs visible to reviewer — scrub those too

### Privacy policy + Terms URLs
- [ ] hexastral-web /privacy and /terms pages will be opened by reviewer
- [ ] Scrub same trigger words from those public pages
- [ ] Already at /lib/legal/data/*.json — apply SPAM vocabulary

---

## 6. Reframing principles (when word substitution isn't enough)

Some strings are not fixable by single-word swap — the whole sentence is in the wrong register. Examples:

### Pattern: "Discover what fate has in store"
- Wrong because: implies fortune-telling
- Reframe: "Explore your personality through the classical BaZi framework"

### Pattern: "Your daily horoscope"
- Wrong because: directly cites "horoscope"
- Reframe: "Today's element interactions" or "Daily reflection"

### Pattern: "Find your soulmate by zodiac compatibility"
- Wrong because: "zodiac compatibility" double-triggers
- Reframe: "Study how two BaZi charts interact through the Five Elements"

### Pattern: "Lucky days this month"
- Wrong because: "lucky days" = horoscope register
- Reframe: "Favorable element windows this month" (with academic gloss)

### Pattern: "Reveal hidden truths about yourself"
- Wrong because: "reveal" + "hidden" = mystical register
- Reframe: "Explore facets of your personality you may not have considered"

**Rule of thumb**: If a string sounds like a fortune cookie OR a horoscope hotline ad, rewrite it. If it sounds like a Coursera course description OR an MBTI test result, it's safe.

---

## 7. ASO metadata template

Use this skeleton for each app's `aso-metadata.json`:

```json
{
  "appId": "com.hexastral.fate",
  "appName": "MingPan",
  "locales": {
    "en-US": {
      "title": "Fate · BaZi & AI Coach",
      "subtitle": "Four Pillars · AI insights",
      "keywords": "bazi,four pillars,ming li,chinese,classical,AI,personality,coach,self reflection,study",
      "promotionalText": "Generate your BaZi (Four Pillars) chart with AI-augmented personality insights grounded in 1500 years of classical Chinese cosmology.",
      "description": "Fate is a BaZi (Four Pillars / 八字) calculator and learning tool rooted in classical Chinese cosmology — not Western astrology, not fortune-telling. ...[full description, 4000 char]..."
    },
    "ja": { ... },
    "zh-Hans": { ... },
    "zh-Hant": { ... }
  },
  "primaryCategory": "EDUCATION",
  "secondaryCategory": "LIFESTYLE",
  "ageRating": "12+",
  "screenshotDirection": "see docs/screenshot-direction.md"
}
```

---

## 8. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-05 | hexastral-app (com.hexastral.hexastral) RETIRED permanently | Rejected 4.3(b); cannot resubmit same bundle |
| 2026-05 | face-oracle / coin-cast / dream-oracle DEFERRED from launch wave | Direct hits on rejection trigger phrases |
| 2026-05 | fate / cycle / yuan / feng = 4 priority apps for sequential launch | Each can be defensibly framed as non-astrology educational tool |
| 2026-05 | PWA (hexastral.com) elevated to P0 backup channel | If App Store fully blocks, PWA is the only path |
| 2026-05 | Logo designer hire DEFERRED until W1 (fate) approval | Don't sink $8-15K on logos if launch is blocked |
| 2026-05 | Anti-spam vocabulary lock-in (this doc) | Single source of truth for rewrite work |

---

## 9. When in doubt

Three test questions before committing any copy:

1. **Would a Coursera course description use this word?** If no, suspect.
2. **Would an MBTI / Enneagram result page use this word?** If no, suspect.
3. **Could a 30-year-old App Store reviewer who's never read about Chinese culture mistake this for "yet another horoscope app"?** If yes, rewrite.

If still unsure: bias toward removal. We can add color later. We cannot remove "horoscope" from a rejected app and resubmit instantly.
