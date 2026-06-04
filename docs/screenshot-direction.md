# App Store Screenshot Script

The shot-by-shot screenshot deck + caption copy for every live App Store
listing in the suite. Referenced by each app's `aso-metadata.json`
(`_screenshotDirection`). Captions are the localized overlay headlines that ride
on top of each framed screenshot — keep them short (a screenshot caption is read
in <1s).

**Cross-links**

- Positioning doctrine + the six conceptual-uniqueness axes: [decisions/0015-product-doctrine-v2.md](decisions/0015-product-doctrine-v2.md)
- Per-app keyword/description copy: each `apps/<app>/aso-metadata.json`
- Auspice launch state: [auspice-launch.md](auspice-launch.md)

---

## 0. Global production spec

**Sizes to render** (generate at the largest, downscale the rest):

| Slot | Device | Pixels | Required? |
| --- | --- | --- | --- |
| 6.9" | iPhone 16 Pro Max | 1320 × 2868 | yes |
| 6.5" | iPhone 11 Pro Max / 8 Plus frame | 1242 × 2688 | yes (fallback) |
| 6.1" | iPhone 15/16 | 1179 × 2556 | optional |
| 13" iPad | iPad Pro | 2064 × 2752 | only if the app ships an iPad build |

Up to 10 screenshots per locale; we use **6** (Auspice) / **4–5** (satellites).
First **3** are what 90% of viewers see in the carousel — front-load the value.

**Frame + overlay style** (matches [decisions/0018-hexastral-design-language.md](decisions/0018-hexastral-design-language.md)):

- Real in-app screens inside a thin device bezel, sat on a flat brand-tinted
  background (one tint per app — see each section). No floating 3D mockups.
- Caption = one **headline** (≤6 words) + optional **subhead** (≤8 words), top
  third, generous margin. Body font from `@zhop/hexastral-tokens`. Never cover
  the screen's own hero content with the overlay.
- CJK overlays set tighter (letter-spacing 0); never machine-translate — use the
  copy tables below verbatim.
- Localize the **status bar + in-screen content**, not just the caption. An
  `en-US` shot must show an English UI; a `ja` shot must show the Japanese UI
  (and, for Auspice, the 六曜 badge — see §1 S1).

**Anti-spam visual rules** (Guideline 4.3(b) — apply to every app):

- NO mystical imagery as a primary: no moon-phase art, zodiac wheels, tarot,
  crystal balls, glowing runes, star-field "cosmic energy."
- LEAD with the utility/structured-data screen, never the AI-reading screen.
- The interpretive/AI screens always carry the honest register in their caption
  ("a study", "reflection — not prediction", "cites classical sources"). This is
  the same defensive framing as the descriptions + Terms §3; the screenshots
  must not contradict it.

---

## 1. Auspice — Chinese Calendar (HERO deck, 6 shots)

Background tint: warm paper / ink (calendar-utility register, not mystical).
Positioning: a **calendar utility**, not fortune-telling. The Ba Zi timeline is
real value but stays **mid-deck (S5)** so the carousel's first impression is
"Chinese calendar," protecting the 4.3(b) posture.

| # | Screen | Visual notes |
| --- | --- | --- |
| S1 | Today tab hero | 干支 / 农历 / 节气 + 宜忌 chips. **`ja` variant must show the 六曜 badge** (the JP-only day annotation). |
| S2 | Month grid | One grid showing 阳历 + 农历 + 节气 + 节日 simultaneously; a festival day highlighted. |
| S3 | 24 solar-terms timeline (节庆 tab) | Horizontal year timeline, one 节气 expanded into food/poetry/wellness depth. |
| S4 | Family events | Member list with an upcoming 农历 birthday + reminder toggle. The diaspora hook. |
| S5 | Ba Zi life timeline (Pro) | The 大运/流年 git-graph with one what-if branch. Caption MUST carry "reflection, not prediction." |
| S6 | Widget + Watch | Home-screen widget × (small/medium/lock) and the Watch complication on a wrist. |

**Captions**

| # | en-US | zh-Hans | zh-Hant | ja |
| --- | --- | --- | --- | --- |
| S1 | Today, in the Chinese calendar | 今天，用中华日历看 | 今天，用中華日曆看 | 今日を、中華暦で |
| S1 sub | 干支 · lunar date · solar term · 宜忌 | 干支 · 农历 · 节气 · 宜忌 | 干支 · 農曆 · 節氣 · 宜忌 | 干支・旧暦・節気・六曜 |
| S2 | Solar, lunar & 节气 — one grid | 阳历、农历、节气，一屏看全 | 陽曆、農曆、節氣，一屏看全 | 太陽暦・旧暦・節気をひと目で |
| S3 | The 24 solar terms, in depth | 二十四节气，深读全年 | 二十四節氣，深讀全年 | 二十四節気を、深く読む |
| S4 | Never miss a lunar birthday | 再不错过家人的农历生日 | 再不錯過家人的農曆生日 | 家族の旧暦の誕生日を逃さない |
| S5 | Your life as a Ba Zi timeline | 把人生看成一条八字时间轴 | 把人生看成一條八字時間軸 | 人生を、八字のタイムラインで |
| S5 sub | A reflection — not a prediction | 供观照，不作预测 | 供觀照，不作預測 | 予測ではなく、内省のために |
| S6 | On your home screen & wrist | 主屏与手腕，随时一瞥 | 主屏與手腕，隨時一瞥 | ホーム画面と、手首に |

---

## 2. Kindred — Couples Chart (5 shots)

Background tint: dark + 宣纸 document layer (Kindred is dark-only; the report is
the paper surface — see `kindred-theme-and-threads` memory). Register: a
relationship **study** (MBTI-pair analogue), never "soulmate / love fortune"
(those are in Kindred's `_doNotUse`).

| # | Screen | Visual notes |
| --- | --- | --- |
| S1 | Bonds list | The thread list (flat, swipe-delete), a few named bonds. |
| S2 | Pair input | The 3-step self → choose → other onboarding, mid-flow. |
| S3 | Synastry report (宣纸) | Two 干支 charts side by side + the 合/冲/害/刑 interaction diagram. |
| S4 | Five Elements compare | Side-by-side 五行 bar chart for the two charts. |
| S5 | AI reading | Chat showing a classical-source citation inline. |

**Captions**

| # | en-US | zh-Hans | zh-Hant | ja |
| --- | --- | --- | --- | --- |
| S1 | Everyone who matters, one tap away | 在意的每个人，一触即达 | 在意的每個人，一觸即達 | 大切な人を、ひとつに |
| S2 | Two birth charts. One reading. | 两张命盘，一份合盘 | 兩張命盤，一份合盤 | ふたつの命式から、ひとつの読み解き |
| S3 | How two charts meet — 合 · 冲 · 害 · 刑 | 两盘如何相遇 — 合 · 冲 · 害 · 刑 | 兩盤如何相遇 — 合 · 冲 · 害 · 刑 | 二つの命式の交わり — 合・冲・害・刑 |
| S4 | Five Elements, side by side | 五行，并排比照 | 五行，並排比照 | 五行を、並べて見る |
| S5 | Grounded in classical sources — not horoscopes | 源自古典文献，不是星座运势 | 源自古典文獻，不是星座運勢 | 古典に基づく読み。占いではありません |

---

## 3. MingPan — BaZi · Four Pillars (5 shots)

Background tint: ink / parchment, academic. Register: **a study of self / 命理研习**,
no fortune-telling (Tier-3 funnel, no IAP — the goal is a credible, shareable
chart that upsells to Auspice / `universe_pro`).

| # | Screen | Visual notes |
| --- | --- | --- |
| S1 | BaZi chart | Four pillars with clearly labeled 干支 columns. |
| S2 | Five Elements | 五行 strength bar chart. |
| S3 | Ten Gods | 十神 breakdown, one expanded. |
| S4 | 大运 timeline | Decade-by-decade major-fortune timeline. |
| S5 | AI self-reflection | Chat with classical context, honest register. |

**Captions**

| # | en-US | zh-Hans | zh-Hant | ja |
| --- | --- | --- | --- | --- |
| S1 | Your Four Pillars, properly drawn | 你的四柱，如实排布 | 你的四柱，如實排布 | あなたの四柱を、正しく |
| S2 | Where your Five Elements balance | 你的五行，强弱一览 | 你的五行，強弱一覽 | 五行のバランスを一覧で |
| S3 | Ten Gods, explained | 十神，逐一解读 | 十神，逐一解讀 | 十神を、ひとつずつ |
| S4 | Decade by decade — your 大运 | 十年一运，大运全图 | 十年一運，大運全圖 | 十年ごとの、大運 |
| S5 | A study of self — not fortune-telling | 一场自我研习，不是算命 | 一場自我研習，不是算命 | 自己を学ぶ。占いではありません |

---

## 4. Feng — Site Analysis (4 shots)

Background tint: blueprint / slate, architectural. Register: **classical site
theory**, deterministic + compass-based, "not fortune-telling" (its `_doNotUse`
bans mystical / cosmic-energy / qi-flow language).

| # | Screen | Visual notes |
| --- | --- | --- |
| S1 | Compass capture | On-site photo with the live compass + facing overlay. |
| S2 | Floor plan + Ba Gua | Floor plan divided into the 8 sectors. |
| S3 | Room analysis | Per-room reading, classical 形势/理气 terms. |
| S4 | AI w/ citations | Chat citing 《青囊经》 etc., honest register. |

**Captions**

| # | en-US | zh-Hans | zh-Hant | ja |
| --- | --- | --- | --- | --- |
| S1 | Point your phone. Read the site. | 举起手机，读懂坐向 | 舉起手機，讀懂坐向 | スマホをかざして、坐向を読む |
| S2 | Your floor plan, in 8 sectors | 你的户型，八方分宫 | 你的戶型，八方分宮 | 間取りを、八方位で |
| S3 | Room by room, classical site theory | 逐间分析，古典形势理气 | 逐間分析，古典形勢理氣 | 部屋ごとに、古典の理論で |
| S4 | Cites 《青囊经》— not "cosmic energy" | 引《青囊经》—— 不谈玄虚 | 引《青囊經》—— 不談玄虛 | 古典出典に基づく。スピリチュアルではない |

---

## 5. Numerology — Plum-Blossom Oracle (4 shots)

Background tint: warm parchment. **Highest 4.3(b) exposure of the suite** — its
engine is 梅花易数 (Shao Yong plum-blossom I Ching), so it sits closest to the
"oracle / divination" line. Hold the register hard: "a 1000-year-old **method**,
**demystified**" — never "predict your future" / "what fate holds." (Its ASO was
also de-risked: `fortune` + `chinese astrology` keywords removed 2026-06-04.)

| # | Screen | Visual notes |
| --- | --- | --- |
| S1 | Ask + cast | The question field + one-tap cast. |
| S2 | Hexagram | The resulting 卦象, drawn classically. |
| S3 | Reading | The interpretation, plain-language. |
| S4 | History | Saved past questions. |

**Captions**

| # | en-US | zh-Hans | zh-Hant | ja |
| --- | --- | --- | --- | --- |
| S1 | Ask. Cast a hexagram in one tap. | 心中一问，一触起卦 | 心中一問，一觸起卦 | 問いを立て、ワンタップで立卦 |
| S2 | Your hexagram, drawn the classical way | 你的卦象，依古法起出 | 你的卦象，依古法起出 | あなたの卦を、古法で |
| S3 | A 1000-year-old method, demystified | 千年梅花易数，讲清楚 | 千年梅花易數，講清楚 | 千年の梅花易数を、分かりやすく |
| S4 | Every question, kept | 每一问，都留存 | 每一問，都留存 | 問いの記録を、すべて |

---

## 6. Pre-submission checklist (per app, per locale)

- [ ] First 3 screens read as the app's category (calendar / chart / site / oracle), not "horoscope."
- [ ] No mystical primary imagery (§0 anti-spam rules).
- [ ] The interpretive/AI screen's caption carries the honest register.
- [ ] In-screen UI language matches the locale (not just the caption).
- [ ] Auspice `ja` S1 shows the 六曜 badge.
- [ ] Captions copied verbatim from the tables (no machine translation).
- [ ] Rendered at 6.9" + 6.5"; iPad only if an iPad build ships.
