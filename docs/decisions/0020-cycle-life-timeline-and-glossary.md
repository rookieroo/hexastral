# ADR-0020: Cycle Life Timeline + Educational Glossary

- **Status**: Accepted
- **Date**: 2026-06-02
- **Modifies**: ADR-0010 (Cycle satellite) — repositions cycle from "daily 黄历 utility" to "personalized 中国命理 life-timeline tool with educational glossary surface"
- **Related**: ADR-0015 (Product Doctrine v2), ADR-0018 (Design Language), ADR-0019 (V1 wave narrowing)

## Context

Cycle through Sprint 1-3 was built as a daily 黄历 utility (today's pillar / 宜忌 / 12 时辰 / 节气). Sprint 3 expanded the surface to include the calendar, festivals/节气 detail pages, and per-locale public holidays. Recent user feedback (2026-06-02) re-frames the product more ambitiously:

> 我希望Cycle能肩负起人生timeline的功能，根据用户输入的Birth info生成八字盘和紫薇盘，然后两个盘合参调用一次LLM就能得到人生的timeline，体现在Calendar中，这是会员级别的功能，同时还有流年大运，流月，流日。这些加起来就是个性化黄历，基于中国命理学说的个性化黄历。我理解只有拿到Birth info，LLM 人生timeline才能给出For you 【Favorable】

And:

> 二十四节气、十二个时辰、中国传统节假日都属于可以科普的术语，至于天干地支，四柱八字，紫薇星盘等术语也可以作为加分项，这样上架时就可以着重强调应用有他科普的一面，表现方式更是需要创新式的UI呈现，科普可以按照Festivals 这种方式来做，我倾向于科普类的地方完全free，不要设置付费墙。并且后续还可以一直维护

The new positioning has two layers:

1. **Pro layer — personalized 中国命理 life timeline.** Birth info (date / 时辰 / gender / place) feeds 八字 + 紫微 compute server-side. The two charts combine into a single LLM prompt that produces a structured life timeline — major decade phases (大运), each year's 流年 character, and the 流月 / 流日 overlay rendered onto the Calendar's day cells. The existing "For you · Favorable / Caution" line is the daily slice of this.

2. **Free layer — educational glossary.** A reference hub for 二十四节气, 十二时辰, 中国传统节日, 天干地支, 四柱八字, 紫微星盘. Substantive authored content, innovative UI per-section, no paywall. Doubles as the App Store reviewer-facing positioning: cycle is demonstrably an *educational* tool grounded in classical Chinese cosmology, not Western horoscope-style fortune-telling (Guideline 4.3(b) defense in line with the MBTI / Big-Five analogy from ADR-0017).

## Decision

### Cycle V2 doctrine — two layers, one product

**Pro layer (personalized life timeline)**: gated by `cycle_pro` entitlement and **requires** birth info.

| Surface | Free | Pro |
|---|---|---|
| Today / day-detail | Generic 干支, 宜忌 top-3, 12 时辰, 节气 window | Full 宜忌, **For you 大运/流年 verdict** ("Favorable / Caution / Neutral" + 1-line reason), 真太阳时-corrected 时辰 |
| Calendar grid | Per-day rating tint + public holidays | + 流日 fortune dots on each cell + 流年/大运 banner above the month |
| `/timeline` (new) | — | Full life timeline: decade arcs (大运), per-year 流年 cards, key turning points, regenerated when birth info changes |
| 4 specialized 择日 flows | Generic event scoring (existing free fallback) | Activity-tuned scoring + LLM-narrated picks |

**Free layer (educational glossary)**: `/glossary` route — no birth info required, no paywall ever.

| Section | Entries | Content |
|---|---|---|
| 二十四节气 | 24 | per-term: 农 / 食 / 诗 / 养生 / 民俗 (already partial; LICHUN authored in `lib/festival-content.ts`) |
| 十二时辰 | 12 | per-时辰: 时段 / 历史名称 / 五行 / 适宜活动 / 古诗 |
| 中国传统节日 | 8 | per-festival: 历史 / 习俗 / 食 / 诗 / 现代庆祝 (already partial; CHUNJIE + ZHONGQIU authored) |
| 天干地支 | 22 (10+12) | per-stem/branch: 五行 / 含义 / 在四柱中的作用 / 历史 |
| 四柱八字 | concept | what it is, how it's read, common terms (日主, 用神, 喜神, 忌神, 大运, 流年) |
| 紫微星盘 | concept | what it is, 12 palaces, major stars, how it complements 八字 |

The first two festivals + 立春 are already authored under `lib/festival-content.ts`; the rest follows the same `LocalizedSection[]` schema. Authoring is a content track, not engineering — ongoing, fully free.

### Architecture

**Server**:

```
/api/cycle/timeline  POST
  body: { birthInfo: { solarDate, timeIndex, gender, longitude?, latitude? } }
  auth: HMAC + userId required (Pro entitlement enforced)
  flow:
    1. Compute 八字 (4 pillars + 大运 chain) via astro-core
    2. Compute 紫微 (12 palaces + major stars) via astro-core (Sprint 4 work — astro-core has ziwei partial)
    3. Combine into structured prompt
    4. Call LLM with budget guard (per K.4 pattern) — once per birthInfo fingerprint
    5. Persist to D1 (timeline_cache) keyed by birthInfo fingerprint
    6. Return TimelinePayload { decades, years, monthly, daily-overlay-rules }
  cache: timeline_cache table — fingerprint → payload. Lifelong cache; birth never changes.

/api/cycle/day  GET   (existing)
  EXTEND: when caller is Pro + signed-in, attach today's slice of the timeline
  (流年 verdict + 大运 phase) to the response so Today/day-detail can render
  "For you · Favorable" without a separate fetch.

/api/cycle/glossary/[topic]  GET   (new, free, anonymous)
  Returns per-section authored content (or 'coming soon' placeholder).
  Same cached delivery as /festival content (KV or D1).
```

**Client**:

```
app/(tabs)/index.tsx  — home (Calendar + day detail)
  ADD: 流日 dots on calendar cells when Pro + birth set
  ADD: 大运/流年 banner above the calendar when Pro + birth set
  EXISTING: For-you card (Favorable / Caution) — promote from placeholder to
  real Pro signal once /timeline ships

app/timeline.tsx  — Pro-only full life timeline
  decade arcs as horizontal swimlane
  current year highlighted
  tap a year → year detail (流年, 流月 overlay, key dates)

app/glossary.tsx  — free educational hub (this turn: scaffold)
  6 section cards
  tap a card → /glossary/[topic]

app/glossary/[topic].tsx  — per-section detail (subsequent chunks)
  innovative UI per topic (24-section accordion for 节气, wheel for 12 时辰, etc.)
```

**Data**:

```sql
CREATE TABLE timeline_cache (
  user_id TEXT NOT NULL,
  birth_fingerprint TEXT NOT NULL,  -- sha256(solarDate|timeIndex|gender|lng|lat)
  payload JSON NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, birth_fingerprint)
);
```

LLM call is **one-shot per birthInfo fingerprint**. Re-runs only if birth info changes. Cost model: average user generates 1 timeline lifetime; edge case (changed birth date) regenerates once. Per-user LLM cost ≤ $0.10 lifetime → fits comfortably in Pro pricing.

### "For you · Favorable" requires birth info

Per user observation: the green "Favorable" badge on Today's For-you card today is a static / mock signal. To be honest:

- **Anonymous / no birth set**: hide the For-you card entirely OR show a friendly "Set birth info → personalization unlocks" placeholder
- **Free + birth set**: deterministic compute (current `personalAlmanacOverlay` — 5-line astro-core) renders the verdict
- **Pro + birth set**: deterministic verdict + LLM-narrated reason (1-2 sentences keyed to today's 干支 vs. user's 大运/流年)

The doctrine: **For-you is never a guess, never a horoscope** — it's either deterministic (free tier) or deterministic-plus-explained-by-LLM (Pro). The compute substrate is classical 中国命理 throughout.

### Pro feature checklist (gated by `cycle_pro` entitlement + birth info present)

- Full 宜忌 (vs Free top-3 — already implemented via `YiJiBlock` limit prop)
- 对你而言 personalization (currently free; should gate per ADR-0015)
- 4 specialized 择日 flows (`/wedding` / `/move-in` / `/business` / `/travel` — already gated)
- Real-solar-time corrected 时辰 highlight (Sprint 2 chunk 5 — deferred, still pending)
- Dual-timezone toggle (Sprint 2 chunk 6 — shipped; free-or-Pro TBD)
- **NEW: /timeline screen** — full life arc + decade phases + per-year cards
- **NEW: 流日 dots on Calendar grid cells**
- **NEW: 大运/流年 banner above Calendar**
- **NEW: Daily push narration** ("今日 大运 偏官 + 流年 比肩 — 宜守不宜攻")

### Educational glossary checklist (free for all, ongoing content track)

- `/glossary` route: 6-section list
- `/glossary/jieqi`: 24 节气 entries with innovative UI (wheel? timeline strip?)
- `/glossary/shichen`: 12 时辰 entries (clock-face or strip)
- `/glossary/festivals`: 8 festivals (existing /festivals stays as is; glossary cross-links)
- `/glossary/ganzhi`: 22 stems+branches (paired grid — 10 above, 12 below, lines drawing 60-甲子)
- `/glossary/sizhu`: 四柱八字 concept page (interactive chart example)
- `/glossary/ziwei`: 紫微星盘 concept page (12-palace wheel example)

## Sequencing (revised cycle sprint plan)

This ADR injects new work between Sprint 3 (mostly done) and Sprint 4 (was "family events + push"). Updated cycle roadmap:

| Sprint | Was | Becomes |
|---|---|---|
| Sprint 3 (W1.3) | 节庆 + 节气 content | + `/glossary` scaffold (this turn); 节气/festival/glossary content authoring is the ongoing track |
| Sprint 3.5 (NEW) | — | **Honest For-you**: gate the For-you card on birth info + Pro; deterministic compute already exists. Quick win. |
| Sprint 4 (W1.4) | family events + push scheduler | **Life timeline backend**: 八字 + 紫微 compute, LLM integration, `timeline_cache` D1 table, `/api/cycle/timeline` endpoint |
| Sprint 4.5 (NEW) | — | `/timeline` Pro screen + 流日 dots + 大运/流年 banner on Calendar |
| Sprint 5 (W1.5) | widgets + watch + ASO + TestFlight | unchanged — but widgets get a Pro "Today's 流日 verdict" variant |
| Sprint 6 (W1.6) | (was end) | family events + push scheduler (shifted from Sprint 4) |

cycle now needs **2 more sprints** to ship (Sprint 4 + 4.5) before W1.5 widget work. Total: ~6-8 person-days added.

## App Store positioning (4.3(b) defense)

The educational glossary is the **anchor**, not a side feature. Reviewer notes (per `docs/reviewer-notes-templates.md`) get rewritten to lead with:

> Cycle is an educational tool for Chinese cosmology and the traditional 黄历 calendar.
> - 二十四节气, 十二时辰, 中国传统节日: solar / lunar calendar entries with explanatory content from classical sources
> - 天干地支, 四柱八字, 紫微星盘: glossary of 中国命理学 concepts grounded in Song-dynasty 子平 / 紫微 traditions
> - Personalized layer (Pro, opt-in): given user-provided birth date, the app computes a structured 八字 chart and presents the deterministic 五行 relationships against the daily 干支. The AI-narrated layer cites the classical interaction tables it relies on — it is *not* astrological prediction in the Western sense.

Same MBTI / Big-Five analogy as ADR-0017. The glossary section list is the proof.

## Consequences

**Positive**:
- Clear product direction — utility + personalization + education, three legs.
- Pro layer's WHY is now obvious (life timeline + daily-narrated personalization, not just "more 宜忌").
- LLM cost model is bounded (one-shot per birthInfo fingerprint, cached forever).
- Glossary is App Store 4.3(b) gold — substantive educational content reviewers can scroll through and verify.

**Negative**:
- Sprint 4 + 4.5 add ~2 weeks to cycle's ship timeline. Push to launch slips.
- 八字 + 紫微 compute requires astro-core ziwei completion (currently partial).
- LLM dependency: when LLM is down, /timeline falls back to deterministic only (graceful degrade).
- Glossary content authoring is ongoing — needs to be 真实, classical-source-cited, multi-locale. Not a one-time push.

**Reversibility**: medium. The Pro layer is additive — can ship cycle V1 without timeline + add it as V1.1. Glossary is purely additive. The doctrine pivot doesn't break existing surfaces; it builds on them.

## Cross-references

- ADR-0010 — Cycle satellite (this supersedes the "daily-utility-only" framing)
- ADR-0015 — Product Doctrine v2 (utility-anchored doctrine; this ADR adds the personalization + education layers)
- ADR-0018 — Design Language (glossary's "innovative UI" must follow the no-tab + minimalism rules)
- ADR-0019 — V1 wave narrowing (cycle still ships first; this ADR's Sprint 4/4.5 work happens within V1)
- `docs/sprints/cycle-sprint-plan.md` — needs an update reflecting the Sprint 4/4.5 split
- `lib/festival-content.ts` — the FestivalContent schema is the template for glossary entries
- `lib/birth.ts` — birth info storage was extended this turn to include `gender` + `city` (Sprint 3 chunk 8); ready for the timeline backend
