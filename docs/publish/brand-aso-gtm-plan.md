# Brand · ASO · GTM — the two-app launch plan (Yuel + Yuun)

> **Status**: DECIDED (2026-06-10). Companion to [decisions/0024-app-brand-naming.md](decisions/0024-app-brand-naming.md)
> (Accepted same day). Launch storefronts are FIXED: **US · Japan · Singapore ·
> Malaysia · Thailand**. This doc is the single source for store naming, the
> per-storefront metadata matrix, the Auspice repositioning resolution, the
> cold-start GTM, and the domain/link architecture. Produced from a 13-agent
> research pass (naming clearance, storefront indexing mechanics, US/JP/SEA market
> sweeps, GTM playbooks, two adversarial strategy drafts + critique).
>
> The ONE pre-launch gate is name clearance (human task). Everything else here
> runs parallel to App Review.

## 1. Brands (final)

| | Consumer brand | Was | Anchor | Status |
|---|---|---|---|---|
| Compatibility app (`kindred-app`) | **Yuel** | Kindred | 缘 yuán | 🟢 confirmed — zero exact marks in all 5 jurisdictions, zero exact-name apps in all 5 storefronts, `yuel.app` unregistered (RDAP 2026-06-10) |
| Timeline app (`auspice-app`) | **Yuun** | Auspice (← Cycle) | 运 yùn | 🟢 frontrunner — replaces **Yune (RETIRED)**: "Yune: Pregnancy & Baby App" (Yune Ltd, UK) live on US+SG stores since 2026-03-23 fired ADR-0024's walk-away trigger |

Key facts (full evidence in ADR-0024 screening log):

- `yuel.app` and `yuun.app` are **both unregistered** (registry-level RDAP check,
  2026-06-10). Both `.com`s are long-held by third parties — the primary domains
  are the `.app` pair. Register both **before any public artifact names them**
  (ITU filings are public and watched by squatters). No get*/variant defensive
  registrations — the squat surface is unbounded; bad-faith variants are handled
  by trademark + UDRP. Do set a **backorder/drop-watch on `yuun.com`** (held
  since 2010, no nameservers, **expires 2026-09-07** — a realistic drop) and a
  free watch on `yuel.com` (expires 2027-01).
- Pronunciation: Yuel = "YOO-el" (mnemonic: *fuel with a Y*; Yule-homophone drift
  is benign for a relationship app). Yuun = "yoon" (*moon with a Y* — apt for a
  life-cycles app). Katakana fixed once, printed everywhere: **ユエル / ユーン**.
- Device display name = bare Latin wordmark in all locales. Katakana appears only
  in the JP store title and JP marketing.
- JP caveat: Granblue Fantasy's ユエル owns JP web/social SEO for the string —
  legal-clear, but budget extra JP brand-search work; App Store itself is empty.
- Sibling confusability accepted with mitigations (distinct visual identities,
  always-on descriptors); revisit if the Universe bundle ever ships (ADR-0024).
- Clearance scope for counsel: USPTO TESS cl 9/42/**45**, JPO katakana forms,
  IPOS/MyIPO/DIP direct. File ITU same week; registration never gates launch.
- Submission-order doctrine unchanged: **Yuun first (Reference, low-risk), Yuel
  the day Yuun approves. Never both in review simultaneously.**

## 2. Storefront → locale matrix (the mechanical core)

Which App Store metadata locales are **search-indexed** on our five storefronts
(Apple ASC reference + AppTweak/MobileAction/aso.dev, re-verify near launch):

| Storefront | Indexed locales | Implication |
|---|---|---|
| US | en-US **+ es-MX, zh-Hans, zh-Hant**, fr, ko, pt-BR, ru, vi, ar | secondary locales = extra US-ranked keyword characters |
| Japan | ja + en-US | JP needs its own localized **name** — only ja+en-US count |
| Singapore | **en-GB** + zh-Hans | zh-Hans does double duty (US + SG) |
| Malaysia | **en-GB** + ms | **Chinese is NOT indexed in MY** — MY Chinese search "bazi" in English; ms field = English/romanized overflow |
| Thailand | **en-GB** + th | English-only reaches almost nobody organically in TH |

> **NARROWED 2026-06 (founder decision):** the 8-locale expansion below is
> **deferred, not pursued for now**. Ship only the **4 languages the apps
> actually localize in-product — en-US, zh-Hans, zh-Hant, ja** — and drop the
> ASO-overflow locales (en-GB, ms, th, es-MX) + the SG/MY/TH storefront push.
> Applied **suite-wide** — both `apps/auspice-app/aso-metadata.json` (Yuun) and
> `apps/kindred-app/aso-metadata.json` (Yuel) now hold 4 locales each. The
> reasoning below is retained as the case for a future re-expansion, not the
> current plan.
>
> **Operational rule (why this is safe):** set each app's App Store Connect
> **Primary Language to English (en-US)** — every storefront without a zh/ja
> localization then falls back to the en-US listing. **Availability ≠
> localization:** keep sales territories broad (US/JP/SG/MY/HK/TW, TH optional);
> the app still ships + is purchasable everywhere. What the 4-locale scope
> knowingly forgoes is **organic search rank + local-language conversion in
> TH/Malay** (en-GB was the English locale Apple indexes in SG/MY/TH; ms/th were
> the local fields; es-MX was a US keyword-overflow vehicle, not a country). Add
> th/ms back if those markets become priorities — Apple Ads in those countries
> works regardless.

Consequences:

1. **Ship 8 iOS metadata locales per app**: en-US, **en-GB (new — mandatory, the
   only English indexed in SG/MY/TH)**, ja, zh-Hans, zh-Hant (already written;
   US-indexed — keep), **ms (new)**, **th (new)**, **es-MX (new — US keyword
   overflow only, mirrors en-US visible fields)**.
2. en-GB is **shared** across SG/MY/TH — per-country English differentiation
   happens via Apple Ads bids, not metadata.
3. Apple Ads is available in all five countries. Validate keyword volumes with
   Apple's first-party **Monthly Search Term Rank** report (Ads → Insights)
   before freezing keyword fields — all third-party volume numbers in this plan
   are directional.
4. Google Play = phase 2 (post-iOS validation): en-US default + ja-JP, th, ms-MY
   listings; long description is indexed there, write it keyword-bearing.
5. Screenshot captions are reportedly OCR-indexed (mid-2025, unconfirmed) — put
   "life timeline / what-if" phrasing in captions as bonus, never as the primary
   carrier of a keyword.

## 3. Yuun (Auspice) — repositioning without losing 4.3(b) safety

Founder call (ADR-0024): global face leads with **life timeline + what-if**, the
almanac becomes a layer. Research verdict on the underlying belief: **half-right**
— calendar/almanac demand IS confined to the Chinese-diaspora segment, but in
SG/MY that segment searches in **English** with real volume (SG = #1 in APAC for
Lunar-New-Year search; tong-shu wedding-date selection is mainstream SG practice).
So: the **title goes global where the global story sells (US/JP); the keywords and
the SEA English face stay local where the diaspora demand lives.**

The 4.3(b) tension is resolved by splitting WHO sees WHAT:

1. **Titles/subtitles carry the repositioning** (en-US leads "Life Timeline"; ja
   leads 人生グラフ — a pre-existing JP concept needing zero education). "Timeline /
   what-if / journal" appear on no prohibition list.
2. **The v1 review-default screenshot deck does NOT move**: calendar-utility-led,
   BaZi timeline stays at S5 with the "reflection, not prediction" caption,
   exactly per [screenshot-direction.md](screenshot-direction.md). Fresh
   publisher + the June-9 2026 guideline tightening (fortune-telling named;
   low-traction apps now removable) = maximum scrutiny at v1. Do not test Apple
   with the deck.
3. **Custom product pages carry the aggressive story**: all paid/social/web
   traffic (Apple Ads, TikTok, yuun.app) lands on a CPP whose deck is 100%
   timeline+what-if-led. App Review judges the default listing; growth traffic
   sees the global face. Post-approval, ratchet the default deck toward
   timeline-first one revision at a time.
4. **REFERENCE stays primary category** for v1. Revisit only with an approval
   track record.
5. ADR-0024's open question is closed: Yuun is the **same app** — one record,
   per-locale names give it two faces (global timeline face = en-US/ja; diaspora
   calendar face = en-GB/zh).

## 4. ASO matrix — drafted strings

Rules baked in below (from the adversarial critique):

- **No `_doNotUse` term ships anywhere, including invisible keyword fields, in any
  locale, in any version.** The previously floated "v1.1 widenings" (ja 相性占い,
  大安/仏滅, "chinese zodiac" with bare "zodiac", th วันมงคล) are **deleted, not
  staged** — 占い/大安/仏滅/通胜/zodiac/auspicious are verbatim ban-list or
  ADR-0015 auto-reject entries with no hidden-field carve-out. Capture that demand
  via Apple Ads bids (ads are not metadata) and web content instead.
- **Extend `_doNotUse` to Thai before metadata freeze**: ดูดวง, หมอดู, เนื้อคู่,
  ดวง, ดวงคู่, ฤกษ์ดี, วันมงคล (fortune/soulmate/auspicious register).
- "tong shu" (romanized 通胜) stays OUT of committed strings — 通胜 is on the
  Auspice ban list; "chinese almanac / lunar calendar / date selection / wedding
  date" carry the same intent safely.
- No term repeated across name/subtitle/keywords within a locale (wasted indexed
  characters). Scrub again at freeze with the `_charCounts` pass.
- th/ms strings below need **native review** before freeze (machine-drafted).

### Yuel — `kindred-app` (Lifestyle primary / Education secondary, unchanged)

| Locale | Title (≤30) | Subtitle (≤30) | Keyword themes (≤100, dedupe at freeze) |
|---|---|---|---|
| en-US | **Yuel Birth Chart Compatibility** (30) | **Relationship & Couple Insights** (30) | test, quiz, synastry¹, bazi, four pillars, five elements, chinese, marriage, partner, match |
| en-GB (SG/MY/TH) | **Yuel: BaZi Compatibility** (24) | **Couples Chart & Insights** (24) | couple bazi, marriage compatibility, four pillars, relationship, birth chart, chinese — mirrors SG/MY service wording ("Couple Bazi Reading") |
| zh-Hans (US+SG) | **Yuel 八字合盘** (9) | **合婚配对 · AI 关系分析** (14) | 四柱, 五行, 日主, 性格, 命盘, 情侣, 夫妻 — never 缘分预测/运势 |
| zh-Hant (US) | **Yuel 八字合盤** (9) | **合婚配對 · AI 關係分析** (14) | traditional mirror, different long-tail picks than zh-Hans |
| ja (JP) | **ユエル Yuel｜四柱推命の相性** (16) | **ふたりの命式を本格分析** (11) | 診断, カップル, 結婚, 夫婦, 命盤, 性格分析, AI — 相性診断 register; 占い/運勢 stay banned |
| ms (MY) | mirror en-GB | mirror en-GB | English/romanized overflow: bazi calculator, couple reading, serasi, perkahwinan, chinese |
| th (TH) | **Yuel ความเข้ากันคู่รัก** (~22) | **วิเคราะห์คู่จากวันเกิด** (~20) | สมพงษ์², คู่รัก, แต่งงาน, ปาจื้อ, ความรัก — native review required |
| es-MX (US overflow) | mirror en-US | mirror en-US | couple quiz, relationship test, wedding, pareja, compatibilidad, date night |

¹ "synastry" is high-intent but Western-astrology jargon a reviewer can read —
keep in the invisible field only, drop first if metadata gets questioned.
² Bare สมพงษ์ (the Thai birth-date couple-matching tradition) is the culturally
exact hook; the ดวง- prefixed forms are banned register.

US register ruling: **"Birth Chart Compatibility" + insight-subtitle wins** over
"Compatibility Test" — the shipped description says *"Not generic compatibility
quizzes"* (a "Test" title would be a 2.3.7 metadata-accuracy contradiction AND
self-buckets into the saturated quiz frame). "Test/quiz" demand is captured via
the keyword field + ASA exact-match. Note both en-US strings sit at exactly 30/30
— any edit forces a re-count.

### Yuun — `auspice-app` (Reference primary / Lifestyle secondary, unchanged for v1)

| Locale | Title (≤30) | Subtitle (≤30) | Keyword themes |
|---|---|---|---|
| en-US | **Yuun: Life Timeline & Almanac** (29) | **Chinese Calendar · Solar Terms** (30) | lunar, bazi, what if, journal, life map, birthday reminder, festival, new year, widget, family |
| en-GB (SG/MY/TH) | **Yuun: Chinese Calendar & BaZi** (29) | **Life Timeline · Solar Terms** (27) | chinese almanac, lunar calendar, date selection, wedding date, festival, cny, birthday — calendar-led face stays PERMANENTLY for SEA |
| zh-Hans (US+SG) | **Yuun 中华万年历** (10) | **人生时间轴 · 节气 · 黄历** (15) | 农历, 二十四节气, 八字, 大运, 流年, 春节, 中秋, 家人生日提醒, 小组件 — 黄历 OK; never 运势/黄道吉日/通胜/吉时 |
| zh-Hant (US) | **Yuun 中華萬年曆** (10) | **人生時間軸 · 節氣 · 黃曆** (15) | traditional mirror |
| ja (JP) | **ユーン Yuun｜万年暦と人生グラフ** (18) | **大運・二十四節気・六曜・旧暦** (14) | 四柱推命, 命式, カレンダー, 誕生日, 中華暦, 春節, ウィジェット, もしも — 人生グラフ/大運 are existing JP vocabulary; 六曜 is a stronger JP hook than the old ASO admitted (47.7% attention) but 大安/仏滅 stay banned |
| ms (MY) | mirror en-GB | mirror en-GB | kalendar cina, almanak cina, tarikh, cny, kalendar lunar + English overflow |
| th (TH) | **Yuun ปฏิทินจีน** (~14) | **ตรุษจีน · ปฏิทินจันทรคติ** (24) | ปฏิทินจีน, ตรุษจีน, ปาจื้อ, ปฏิทินจันทรคติ — lightweight; TH is low-priority for Yuun |
| es-MX (US overflow) | mirror en-US | mirror en-US | calendario chino, lunar, planner, seasons, life journal |

JP positioning note: 四柱推命 is fully domesticated in Japan (celebrity
practitioners, native 命式/大運 vocabulary) — leading with it signals 本格
(authentic), not foreign. The what-if branch has **no JP analog found**
(「もしも」分岐) — it is both the JP marketing hook and the 4.3(b) uniqueness
story. JP trust runs on 監修 (supervising practitioner) — a partnership is the
long-term JP unlock neither app has today.

## 5. GTM — solo-sized core (cut to what one person can run during launch month)

Hard context: the June-9 2026 guideline update means a failed cold start is now
also a store-presence risk (Apple may remove low-traction apps in the named
fortune-telling cluster). And the actual critical path (rename sweep, dual-AASA
migration, Kindred #8's blocked human IAP task, 8-locale screenshots × 2 apps)
already fills June. So GTM commits to FOUR things; everything else is explicitly
deferred.

### Phase 0 — this week, gates everything

1. Counsel knockout Yuel + Yuun (scope in §1); file ITU same week.
2. Register `yuel.app` + `yuun.app`; backorder `yuun.com`, watch `yuel.com`
   (human task).
3. Repo rename sweep **BEFORE creating App Store Connect records** (records are
   born under final names — zero rename debt). Frozen: bundleIds, schemes, App
   Group, EAS projectIds, IAP ids (`hexastral_personal` etc.).
4. Fix doc drift first: ROADMAP/launch-checklist/auspice-launch still say
   `com.hexastral.cycle` (incl. App Group) — correct before any Apple portal
   capability steps.

### Yuel cold-start (priority order, committed)

1. **Invite-loop engineering before any reach spend** (product work, highest
   ROI/hour): OG-tagged share cards with a partial pair tease; web landing
   renders a partial result, CTA = "add your birth details"; deferred deep link
   into the partner-fill flow; share prompt fires when the first solo result
   renders (cycle time compounds like K). ONE funnel metric:
   invite→click→install→partner-complete. Realistic bar **K≥0.2** — the loop
   multiplies external traffic ~1.2–1.7×; it does not replace it.
2. **ONE TikTok account (US)**: text-slideshow factory batch-generated from the
   report engine ("Rat × Horse: why this pairing fights about time";
   Five-Elements pair dynamics), 1–2/day sustainable; the 宣纸/ink visual system
   is the differentiation vs generic zodiac-meme accounts. Plus ~$500
   micro-creator seeding (5–10 couple-creators at $50–150/video, couple-test
   reaction format — the RizzGPT cold-start mechanism). Marketing language and
   ASO metadata are SEPARATE registers — TikTok captions never leak into the
   store listing.
3. **Apple Ads floor**: $20–30/day US exact-match on "compatibility test",
   "couples quiz", "relationship compatibility" (ads may say what metadata
   can't). US Lifestyle benchmarks: CPT ~$1.55–2.5, CPI ~$3.45–5. Judge on
   partner-complete CPA, not install CPA. Brand-defense on "Yuel" once live.
4. **Featuring nominations now** (App Launch type, all five storefronts) +
   calendar Qixi (Aug 2026) and Lunar New Year (Feb 2027) cultural-moment
   pitches — WePlay's SEA LNY featuring is the precedent.

Sequencing rule: do not scale reach until the invite funnel converts — reach
into a leaky two-player loop wastes the one-shot window.

### Yuun (light, ASO-led)

- Organic ASO + the 8-locale matrix does the work; **no paid** until Yuel's
  playbook proves out. SG is the beachhead: incumbents are 3.3★/~100-rating
  digitized paper almanacs — design quality wins ratings velocity cheaply.
- CPPs carry the timeline/what-if deck for any ad/social traffic (§3).
- Cross-promo: intent-based Discover placement **from Yuel only** (≤10% of
  pushes). The Auspice→Kindred funnel direction stays OFF per
  synastry-in-auspice-plan §6 — do not reintroduce it.

### Deferred until both apps are approved + the loop converts

Second/localized TikTok accounts · Xiaohongshu SG/MY (ICP is exact: Chinese,
female, 16–34 — first regional move when capacity exists) · web teaser
calculator on yuel.app (gate on a Keyword Planner volume check) · JP push (相性診断
register, shindanmaker-style X share card, 年末年始 year-versioned report
「2027年のふたり」) · Reddit (30 min/week, disclosed founder account, manual
rule-check per subreddit) · Product Hunt (one low-effort launch for backlinks
only) · Google Play.

### Pricing per region

SG = US parity; MY ≈ 70%; TH ≈ 50% (Apple tier equivalents, May 2026 snapshot —
verify in ASC at submission). **TH is a report market, not a subscription
market**: price Yuel's one-time report ≈ THB 119–129, inside the local
100–300-baht per-reading norm. Yuel's $6.99 report is market-validated (=
Co-Star's Eros couples product exactly); CHANI (self-growth register, $107.99/yr,
highest-grossing US astrology app) is the monetization model to study, not the
psychic-marketplace apps.

## 6. Domains & links (hexastral.com becomes invisible to consumers)

- **hexastral.com = infrastructure only**: `api.hexastral.com` (unchanged),
  HMAC/Turnstile, internal services. `useone.tech` = LLC/legal corporate surface.
- **Consumer link surface**: Yuel invites `yuel.app/r/{token}` (replaces
  server-built `hexastral.com/{|zh/|tw/|ja/}resonate/{token}`), report shares
  `yuel.app/p/{shareId}`; Yuun shares `yuun.app/s/{day|makeif|pair|timeline}`.
  One hexastral-web (OpenNext) app, host-routed to both brand domains, carries
  brand pages + link landings (+ the web teaser later).
- **Sequencing (pre-PMF = hard swap is safe)**:
  1. Centralize `WEB_BASE` first — hardcoded in 8+ places (api bonds.ts ×3,
     portfolio.ts, auspice share.ts/config.ts/makeif.tsx, kindred i18n.ts +
     settings + chapter-preview). One env/constant per surface, THEN swap.
  2. Dual-AASA: serve AASA on both brand domains; **ADD** `applinks:yuel.app` /
     `applinks:yuun.app` alongside hexastral.com in app.json AND both checked-in
     .entitlements — never replace.
  3. Lockstep deploy hexastral-api + hexastral-web (server composes invite
     URLs); permanent 301s from hexastral.com paths (share-card PNGs bake the
     old domain into pixels); CORS allowlist gains both brand origins.
- **Legal pages: hexastral.com at launch, brand domains in the first post-launch
  pass.** The privacy URL must resolve at review time and the hexastral.com pages
  are already deployed — a privacy link is the lowest-stakes consumer touchpoint.
  Fix the stale `/privacy/cycle` path (auspice config.ts) NOW either way.

## 6b. Web disclosure (hexastral.com)

**Narrative** (user-facing, not ASC submission order):

- **Flagship:** Yuel (命书 / 合盘) + Kanyu (堪舆) — depth and Pro monetization.
- **Funnel:** Yuun (黄历) + Yaul (六爻) — daily entry, upsell to flagship.

**Implementation:** `apps/hexastral-web/lib/growth/launch-status.ts` drives homepage tiers, sitemap inclusion, and `robots` on hidden SKUs (Dream/Face/StarPalace/EightPillars/omnibus HexAstral). Bump per wave:

| Wave | Config change |
|------|----------------|
| W1 Yuun | `yuun.visibility = live` |
| W2 Yuel | `yuel.visibility = live` |
| W3 Kanyu | `kanyu.visibility = live`, sync `public/brand/kanyu.png` |
| W4 Yaul | `yaul.visibility = live`, show on homepage funnel row |

Marketing footers: Privacy · Terms only (no prominent LLC). JSON-LD `legalName` and Privacy/Terms body keep **UseONE, LLC**.

CTA routing: day-master / compatibility → Yuel (`soulmatch`); sheng-xiao / hexagram index → Yuun (`auspice`) until Yaul ships; feng-shui slugs → Kanyu.

## 7. Standing risks

1. **Yuun is counsel/registrar-unverified** — if it dies, fall back per ADR-0024
   within 48h; ASC record creation waits on the name. (Domains: registry-verified
   available today, but only registration secures them.)
2. **4.3(b)**: the entire defense is the layered posture (utility deck at review,
   CPP for growth, banned-register discipline). If v1 Yuun gets bucketed anyway,
   revert en-US title to calendar-led ("Yuun: Chinese Calendar & BaZi" globally)
   and retry — the title is the cheapest thing to roll back.
3. **JP discoverability is structurally slow at launch**: conservative keywords
   forfeit the head terms (占い ≫ everything), Granblue owns the Yuel string on
   JP web, no 監修. Treat JP as slow-burn; do not judge the launch on it.
4. **All search-volume figures are third-party or inferential** — validate
   against Apple Ads Monthly Search Term Rank before any further metadata churn
   or paid scaling.
5. **K-factor realism**: a 2-player loop lands at K 0.15–0.4. Operating this plan
   as "virality replaces marketing" fails it.
6. **en-GB is shared across SG/MY/TH** — per-country English tuning only via
   Apple Ads bids and the local-language fields.
