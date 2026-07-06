# Kindred — US compatibility positioning (one engine, two front doors)

> **Status**: POSITIONING PLAN (2026-06-08). Founder decision: **reposition Kindred
> as the US compatibility app** (English-first). Auspice stays the diaspora / East-Asia
> almanac. Same `astro-core` (BaZi/ZiWei) engine, two front doors.
> Partially reverses [synastry-in-auspice-plan.md](synastry-in-auspice-plan.md)'s
> "freeze Kindred": Kindred is unfrozen FOR THE US (its own go-to-market), but the
> Auspice→Kindred cross-app funnel stays off (different audiences).

## 0. The thesis

A general Western audience will never adopt a **Chinese almanac** (黄历/择日) — its
substance doesn't translate. But the FEATURES on top of the BaZi/ZiWei engine —
**compatibility, life-timeline, what-if** — are universal human curiosities, and US
astrology is a large, hot market. So:

- **US wedge = compatibility (合盘), NOT almanac.** Co-Star / The Pattern / Sanctuary
  all scaled on relationship/compatibility. "Are we compatible?" is mainstream US
  dating culture.
- **Compatibility is also the growth engine**: it needs two people → a built-in
  **invite loop** (Kindred's resonance invite already does this). The almanac is
  single-player utility with no viral loop.
- **The Chinese engine is a differentiator, not a barrier** — to US astrology fans
  tired of sun-signs, "real Eastern astrology / BaZi" is fresher + deeper.

## 1. Two front doors, one engine

| | Auspice | Kindred (US) |
|---|---|---|
| Market | 海外华人 diaspora · East-Asia (ja/ko/vi) | US / Western astrology audience |
| Language | Chinese-first (+ ja 六曜/旧暦) | **English-first** |
| Hook | 黄历 / 择日 / daily almanac | **Compatibility (合盘)** |
| Growth | birthday funnel (single-player) | **invite loop** (compatibility needs 2) |
| Engine | `astro-core` (BaZi/ZiWei) | same `astro-core` |
| Almanac (宜忌/择日) | yes | **no** (not universal) |

The Auspice→Kindred cross-app funnel stays frozen — they serve different audiences.

## 2. Packaging: layered disclosure (no distance, no loss of 本真)

Western astrology itself is full of jargon (houses, transits, retrogrades). Co-Star
won with **plain-language insight on top, machinery hidden, drill-in for the curious**.
Mirror it:

1. **Surface = universal plain English.** "Compatibility", "Your life timeline",
   "What if". The reading reads emotional: *"You two have an easy, magnetic pull —
   but clash on money."* No 干支 on the hero.
2. **Enter via two bridges Westerners already half-know:**
   - **Chinese zodiac (生肖)** — broadly known in the West (year of the dragon). The
     anchor: lead in via the familiar animal, then reveal a deeper system behind it.
   - **Five elements (五行)** — the most transferable part. Westerners relate to
     "elements" (Western astro has 4). *"You're Fire, they're Water"* is intuitive +
     fresh. Element-compatibility is the killer simplification.
3. **BaZi / Zi Wei = the authentic-depth selling point**, surfaced as a feature
   ("real Chinese astrology, Four Pillars"), not hidden, not jargon-first.
4. **Raw 干支 (甲子) lives in the drill-in / glossary**, never the hero.

**本真 preserved** = the real engine still computes + the depth is one tap away.
**Distance removed** = plain-English front, 生肖/五行 bridge, no almanac, no jargon
opener.

### Term mapping (中 → US surface → 本真 in drill-in)
| 中 | US surface | depth |
|---|---|---|
| 生肖 | Chinese zodiac (use directly — the bridge) | — |
| 五行 | Elements (Wood/Fire/Earth/Metal/Water) | 生克 = how elements relate |
| 八字 | BaZi / Four Pillars (learnable, like "natal chart") | 干支四柱 in details |
| 紫微斗数 | Zi Wei / Purple Star astrology | 命宫/四化 in advanced |
| 合盘 | Compatibility / synastry | 日主互补 / 地支冲合 in drill-in |
| 大运 / 流年 | Luck cycles / life timeline | 干支 labels on nodes |
| 用神 / 化解 | your favorable element / how to balance | 通关/调候 in deep reading |
| 宜忌 / 择日 / 黄历 | **omit from the US app** | — (diaspora only) |

## 3. US main flow (compatibility-led)

```
Onboard: your birth → "Your Chinese zodiac is the Dragon · element Fire"  (familiar bridge)
   ↓
Add someone (or INVITE them — the viral loop; partner fills their own birth,
   PII stays off your device, Kindred's existing resonance model)
   ↓
Compatibility: a score + element/zodiac read in plain English + the aha-hook line
   ↓  (unlock: one-time or subscription)
Deep reading (six chapters, LLM) + relationship timeline (favorable windows ahead)
   ↓
Drill-in (for the curious): BaZi four pillars, 干支, 用神 — the authentic depth
```

## 4. What already exists (reuse — mostly repositioning, not greenfield)

| Need | Already built |
|---|---|
| Compatibility score/grade/dims | `calculateHeHun` (astro-core) |
| Six-chapter deep reading (LLM) | svc-astro/hehun synastry chapters |
| Invite / resonance loop (PII-safe) | `useBondInvitation` + bonds invite routes |
| Solo + paired bonds | `useSoloBond` / `useBondList` / `useSynastryReport` |
| Relationship timeline + node push | `useBondsTimeline` + `buildTimelineNotificationPlan` |
| 4 locales incl. en | `apps/kindred-app/lib/i18n.ts` |
| App shell, paywall, IAP | kindred-app (commerce/paywall, iap.ts) |

**The work is repositioning, not rebuild**: make English primary, lead with
compatibility + 生肖/五行, rewrite copy to plain-language insight, surface BaZi as
"authentic depth", push 干支 into drill-in, and turn on the invite-loop growth.

## 5. What this changes vs the synastry-in-Auspice work
- Auspice keeps S1–S4/S6 (diaspora 合盘 timeline + notifications) — still valid for
  the diaspora audience.
- Kindred is unfrozen FOR THE US, with its own acquisition (compatibility virality),
  NOT funneled from Auspice.
- The astro-core engine + synastry/timeline logic is shared; the divergence is
  front-door framing + language + go-to-market.

## 6. Open questions
- **Brand/name** for the US app — "Kindred" English-friendly? or a new US name?
- **English BaZi vocabulary** — "BaZi" vs "Four Pillars" vs "Chinese astrology" as
  the primary term; how much to teach vs hide.
- **生肖/五行 onboarding** — lead with zodiac animal (familiar) then reveal BaZi?
- **Invite loop mechanics for US** — SMS/link share copy; the resonance landing page
  in English.
- **Monetization** — same content-buyout vs subscription split? Compatibility report
  one-time + relationship-timeline/push subscription mirrors the Auspice model.
- **Almanac** — confirm fully omitted from the US app.

## 7. Risks
- Crowded US astrology market — differentiation = authentic Eastern engine + the
  compatibility invite loop, not "another sun-sign app".
- Authenticity vs approachability is a copy/UX discipline, not a one-time decision —
  every screen must hold the layered-disclosure line.
- Reviving Kindred means re-owning its launch tasks (EAS/ASC/RevenueCat) for a 2nd app.
