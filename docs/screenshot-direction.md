# HexAstral · App Store Screenshot Direction

> **Status**: ACTIVE · 2026-05  
> Companion to `docs/anti-spam-positioning.md`. Reviewer-facing visual register for App Store screenshots across all 4 priority apps. Designer brief.

---

## 1. The principle

App Store reviewer judgment on 4.3(b) is **not purely text-based**. They scan screenshots looking for category-fit signals:

- **Dark + cosmic + mystical symbol** → flagged as horoscope/fortune-telling
- **Calendar + chart + structured data** → flagged as utility/reference
- **Crystal ball + tarot + ouija** → instant 4.3(b) trigger
- **AI chat interface + structured outputs** → AI-tool category

We design screenshots so the visual signal matches the ASO copy (empirical-science / educational-tool register), not against it.

---

## 2. Visual register · approved palette

**Lead with structured data, not mood.** What the screenshot SHOULD show:

| Lead with | Why |
|---|---|
| Tables, columns, labeled rows | "This is a calculator / reference tool" |
| Charts: BaZi 4-pillar grid, ZiWei 12-palace square, Feng Shui floor plan + compass overlay, lunar calendar grid | "This is structured analysis" |
| AI chat interface showing classical-source citations | "This is AI-tool category, like ChatGPT for Chinese cosmology" |
| Annotated source text (Chinese characters with English gloss) | "This is academic / educational" |
| Calendar widgets with 干支 / 节气 labels | "This is calendar utility" |
| Two-panel comparison views (for yuan) | "This is a typology comparison tool" |
| Compass interface with degree readout (for feng) | "This is a precision tool" |

**Color palette** (approved):
- Background: rice paper cream `#F2EBDC` / dark slate `#0C0B0A` / ivory `#E9E2D2`
- Accents: cinnabar red `#9B2226` / gold `#C2A878` / cool steel `#EEF1F4`
- Text: deep ink `#221C14` on cream / cream `#E9E2D2` on dark
- AVOID: purple gradients, magenta, neon blue, holographic glow

**Typography** (approved):
- Headers: Songti SC / STSong / Hoefler Text (classical serif)
- Body: PingFang SC / Helvetica Neue (clean sans)
- Source citations in italic; classical 篆 / 隶 forms permitted as decorative glyphs only (not as data)

---

## 3. FORBIDDEN visuals · do not ship

These visual elements **must not appear** in any screenshot:

| Forbidden | Why |
|---|---|
| Moons, crescents, lunar phases as decorative element | "horoscope category" signal |
| Star fields, constellations, galaxies | "astrology" signal |
| Zodiac wheels, zodiac animal icons (rat/ox/etc.) | Directly cited in 4.3(b) |
| Crystal balls, tarot cards, ouija boards, runes | "divination" signal |
| Third eye, all-seeing eye, ankh, pentagrams | "occult / mystical" signal |
| Glowing auras, halo effects, lens flares around people | "spiritual energy" signal |
| Mystical hand gestures (mudras as decoration) | "spiritual practice" signal |
| Hooded figures, sage archetypes, "mystic" portrait illustrations | "fortune-teller" signal |
| Incense smoke, candle flames as decoration | "ritual / shamanic" signal |
| Dragons, phoenixes used as decoration (not tied to specific BaZi content) | "luck symbol" signal |
| Chinese coins arranged in fortune patterns | "divination" signal |
| Gold ingots, lucky cats, red envelope iconography | "lucky / fortune" signal |
| Mountains shrouded in mist in a "mystical" composition | "spiritual landscape" signal |

**Permitted with care**: lotus flowers (as decorative botanical only), mountains (as landscape only, not "mystical"), water (as landscape only, not "qi flow").

---

## 4. Per-app screenshot strategy

Each app gets up to 10 screenshots in App Store Connect. Strategy by app:

### fate-app (BaZi calculator + AI personality framework)

1. **Hero shot**: BaZi 4-pillar chart with labeled 干支 columns + Day Master highlighted. Tagline: "Your Four Pillars, classically read"
2. AI chat interface: user asks "What does my Day Master mean?", AI responds with classical-source citation (《三命通会》)
3. Five Elements bar chart: showing favorable / unfavorable elements with clean data viz
4. Chapter reading list: structured table of contents (Personality / Career / Relationships / Cycles)
5. Personality archetype card: "Strategist" or "Steward" with classical attribution
6. Decade cycle timeline: horizontal scrolling 大运 / 流年 progression
7. Compatibility preview: two charts side by side (with "Compare with someone" CTA)
8. Settings + privacy: showing on-device computation, opt-in public profile
9. Multi-locale demo: same chart in EN / 中文 / 日本語
10. About / methodology: classical text citations + UseONE LLC attribution

### cycle-app (lunar almanac + day planner)

1. **Hero shot**: today's almanac panel — 干支, 宜 / 忌, 节气, structured data table
2. "Plan a date" tool: user selects "wedding", app returns top-3 dates with classical reasoning
3. Personal annotation: "For you" row showing element fit per day (computed locally)
4. Calendar grid view: month layout with 干支 + 宜/忌 micro-labels per day
5. Solar terms timeline: annual 24 节气 visualization
6. Deep reading sheet: tap on 宜 entry → classical context explanation
7. Notification preview: "Today: favorable for X, avoid Y" (subtle, structured)
8. Settings: timezone, lunar/solar input, language switcher
9. Multi-locale demo
10. About / sources

### yuan-app (BaZi couples chart)

1. **Hero shot**: two BaZi charts side-by-side, labeled "Chart A" / "Chart B"
2. Interaction pattern diagram: 合 / 冲 / 害 / 刑 visualized between the two charts
3. Five Elements comparison: dual bar chart
4. AI chat: "Why do we clash on X?" → classical-source response
5. Invite flow: "Send your partner a private link to fill in their details"
6. Compatibility summary card: "Communication: high · Friction zones: financial · Complementary: 木 ↔ 火"
7. MBTI / Big Five analogy callout: "Like MBTI-pair, but rooted in 1500-year tradition"
8. Privacy: partner data deleted after reading closes
9. Multi-locale demo
10. About / sources

### feng-app (site analysis tool)

1. **Hero shot**: home floor plan with 八卦 sector overlay + compass degree readout
2. On-site capture: photo of a room with compass widget overlay + magnetic declination
3. Per-sector analysis: each 八卦 sector with structured annotations (light, sight lines, threshold)
4. Five Elements interaction diagram: showing dominant element per sector
5. AI chat: "Why is my entrance sector noted?" → classical-source citation (《青囊经》)
6. Permissions / privacy: photos stay on-device, only structured analysis syncs
7. Saved analyses list: structured table of past analyses
8. Compass calibration screen: technical / precision-tool register
9. Multi-locale demo
10. About / sources

---

## 5. Apple App Store technical requirements

| Spec | Value |
|---|---|
| iOS screenshot sizes | **6.7"** (1320×2868), **6.5"** (1242×2688), **5.5"** (1242×2208) at minimum. App Store auto-scales but providing 6.7" master is best. |
| Format | PNG or JPEG, RGB color, sRGB profile |
| File size | < 10 MB each |
| Count | 3-10 screenshots per locale. **6-8 is recommended sweet spot** (too few = looks unfinished; too many = reviewer skim-tires) |
| Captions | Up to 30 char overlay text recommended (per-screenshot tagline). Use the sans-serif system font. |
| Localization | Provide separate screenshot set per locale if text overlays differ. Otherwise English screenshots can serve all locales. |

---

## 6. Designer handoff checklist

When briefing the screenshot designer:

- [ ] Share this doc in full
- [ ] Share each app's `aso-metadata.json` (title / subtitle / description for register reference)
- [ ] Share existing icon assets (for brand consistency)
- [ ] Specify which app is W1 priority — screenshots for W1 must lead the design sprint
- [ ] Specify locales (4) and whether to do per-locale text overlays or English-only
- [ ] Specify the "approved palette" + "forbidden visuals" sections above are constraints, not suggestions
- [ ] Specify deliverable format: PNG, sRGB, 6.7" master + auto-scale downsizes
- [ ] Specify revision cycle: 1 initial draft + 2 revisions
- [ ] Budget: ~$200-600 per app (4 apps × 6-8 screenshots × 4 locales = ~$1500-3000 total if separate locales; ~$400-1200 if English-only with multi-locale captions added later)

---

## 7. Self-check before submission

For each screenshot in each app, ask:

1. Could a 4.3(b) reviewer mistake this for a Western horoscope app screenshot?
2. Does the screenshot LEAD with structured data, not mood?
3. Is there a single forbidden visual element from §3?
4. Does the screenshot match the ASO copy's empirical-science register?

If any answer is wrong, redesign before submitting.

---

## 8. Open items

- Designer hire (see `docs/designer-brief.md`) is currently deferred pending W1 doctrine validation
- Until designer hire: in-house screenshots using Figma + actual app screen captures from device
- Real screenshots from running cycle / fate / yuan / feng apps required to validate "what does the actual UI look like vs. these descriptions" — flag any UI element that breaks the principle
