# ADR-0024 — App brand naming (coined-word strategy, parallel to launch)

**Status:** Accepted (2026-06-10, same-day amendment). **Yuel** confirmed for the
compatibility app. **Yune RETIRED** — an exact-name consumer-software collision
surfaced the same day (see screening log); **Yuun** promoted to the timeline-app
frontrunner per this ADR's own fallback rule. Formal clearance (attorney/registrar,
outside-sandbox) still pending and remains the only pre-launch gate. Execution
plan: [../brand-aso-gtm-plan.md](../brand-aso-gtm-plan.md).

Supersedes the bare working names **Kindred** and **Auspice** as the *consumer
brands*. (Hexastral stays the engine/publisher umbrella — house-of-brands, never
in a store name; see the cross-app architecture ADRs.)

## Context

Two apps go to global app stores: a US-first compatibility app (was "Kindred")
and a life-timeline / what-if app (was "Auspice", the 黄历 utility). Naming was
re-examined over several rounds:

1. **Bare real words don't hold up.**
   - **Kindred** is crowded on the App Store (Kindred Home Swapping — funded —,
     Kindred networking, Kindred by Keyvision, Kindred Health). The bare term is
     contested and weakly protectable.
   - **Auspice** is iOS-clear but an obscure word most US users can't say/parse,
     so it carries the cost of a coined word **without** the ownership upside.

2. **Auspice is repositioned GLOBAL (founder call, 2026-06-10).** Being a 黄历
   does NOT confine it to the Chinese diaspora. The BaZi **life-timeline + what-if
   (make-if)** inside it are *universal* curiosities (where am I in my life arc /
   what if I'd chosen differently) — the same "one engine, universal feature"
   logic that makes Kindred's *compatibility* global (see
   kindred-us-compatibility-positioning.md). So the global face leads with
   **timeline + what-if**; the almanac/黄历 becomes a layer, not the headline —
   and that global face needs its own coined brand (the obscure-word penalty now
   bites a mass audience).

3. **The distinctiveness principle (why registrability ≈ defensibility).**
   Trademark strength runs generic < descriptive < suggestive < arbitrary <
   fanciful. A name that is *hard to register* is usually *hard to defend* — the
   two move together. So:
   - **Descriptive-in-category words are a trap**: attractive because on-the-nose,
     weak because unownable. `Conjunct` for an astrology app literally names an
     astrology concept → descriptive → slow/weak to register, and `conjunct.com`
     is a held premium domain. Marked 🟡, not the brand to bet on. Same logic
     kills `Compatibility`, `Cusp` (also occupied), etc.
   - A *common* word is fine **only when arbitrary** (Apple/Monarch/Hinge). Those
     are scarce now (the good ones are taken).
   - **Genuinely fanciful coined words win**: always available, strongest mark.
     But "coined" must mean *invented phonemes*, NOT borrowed Latin/Greek roots —
     those (Aevum, Kairos, Chrona, Symbi, Aeon, Lumen, Nova…) are all picked-over.

## Decision

1. **Both apps get genuinely-coined wordmarks.** Anchor the coinage in the real
   命理 concepts the engine computes, romanised for global ears — a brand family:
   - **缘 (yuán → "Yuel")** — connection / compatibility → the Kindred-successor.
   - **运 (yùn → "Yuun")** — 大运/流年 fortune cycles → the Auspice-successor
     (the timeline + what-if read *the 运*). Conceptually exact + sibling to Yuel.
     (Was "Yune"; retired 2026-06-10 on an exact-name software collision — below.)

2. **Process is three-in-one, run in PARALLEL with App Store / Play review — no
   waiting** (registration never gates publishing; US is first-to-use):
   - **Clearance** (fast, the only pre-launch gate): knockout search on the
     finalist before committing the name.
   - **File** the application early (use-based or intent-to-use) — locks the
     priority date; cheap (~one class fee), same-week.
   - **Register** completes in the background (~8–14 mo) — does not block launch.
   - **Multi-country route (decided 2026-06-10; domains secured)**: US ITU first
     (the basic application), then the other four via **Madrid Protocol** within
     the **Paris Convention 6-month priority window** (all five launch countries
     are Madrid members) — one WIPO filing designating JP/SG/MY/TH, single
     renewal. Exception: **Japan files tight to launch, not at window's end**
     (strict first-to-file + active squatting culture; the JP storefront listing
     publishes the name) — and consider a DIRECT JP national filing covering both
     the Latin marks and the katakana forms ユエル/ユーン, which also decouples JP
     from **central attack** (the international registration depends on the US
     basic application for 5 years; if the US cl-9 "YUEL-" cluster draws a 2(d)
     refusal, Madrid designations fall with it). Budget option: designate SG/MY/TH
     for Yuel only first; add Yuun's a round later.
   - **Domain**: register `brand.com`/`.app` alongside filing.
   - Not launching in mainland China → the China first-to-file squatter risk does
     not apply; no urgent CN filing needed.

## Screening log (App Store same-name + brand-in-use, via web search; NOT a
formal USPTO/registrar clearance)

| Candidate | For | Finding | Light |
|---|---|---|---|
| **Yuel** (缘) | Yuán/Kindred | deep sweep 2026-06-10: zero exact marks in all 5 launch jurisdictions (TMview); zero exact-name apps in all 5 storefronts (iTunes API); **yuel.app UNREGISTERED (RDAP)**. Caveats: US cl-9 "YUEL-" Amazon-seller cluster (YUELEE/YUELAN… — counsel knockout before filing); Granblue Fantasy character ユエル owns JP web/social SEO (legal-clear, ASO cost); yuel.com held by a German private party since 2000 (assume unobtainable; watch — expires 2027-01) | 🟢 confirmed |
| Yune (运) | Yùn/Auspice | **"Yune: Pregnancy & Baby App" (Yune Ltd, UK) live on the US + SG App Stores since 2026-03-23** — exact name, consumer subscription software, first use in our primary market = this ADR's walk-away trigger. Independently: yune.com premium-parked (Grails brokerage), yune.app third-party-held, and the JP default reading collapses to ユネ (a real Japanese girl's name), losing the 运 sound | 🔴 RETIRED |
| **Yuun** (运) | Yùn/Auspice | no app-store collision found; one unambiguous pronunciation ("yoon") and one katakana reading (ユーン); **yuun.app UNREGISTERED (RDAP 2026-06-10)**; yuun.com registered (Dynadot holder since 2010, expires 2026-09 — assume unobtainable, watch the drop); only distant-class smallholders (jewelry studio, yuun.io) | 🟢 frontrunner |
| Conjunct | Kindred | no app, but descriptive-in-astrology + conjunct.com is premium-held | 🟡 weak mark |
| Symbi | Kindred | funded roommate-match startup + SymbiMind/Simbi/SymbiCare | 🔴 |
| Aevum | Auspice | aerospace startup + multiple software agencies | 🔴 |
| Chrona | Auspice | several time-mgmt apps (also concept-collides) | 🔴 |
| Kairos | Auspice | Kairos face-AI (funded) + Kairos Software + Panasonic | 🔴 |
| Vael | Auspice | Vael AI writing + Vael legacy + Vael creative | 🔴 |
| Cusp / Kith / Twine / Dyad | Kindred | occupied (Cusp = same-category competitor; Kith = streetwear) | 🔴 |

## Consequences / open items

- **Yuel** (compatibility) + **Yuun** (timeline) proceed, pending: (a) formal USPTO
  TESS clearance in classes 9/42/**45** (45 = dating/personal-relationship services
  — the single most relevant class for a compatibility app, do not drop it),
  (b) JPO clearance of the katakana forms ユエル/ユーン + IPOS (SG), MyIPO (MY),
  DIP (TH) direct checks — TMview's ASEAN coverage lags, (c) **register `yuel.app`
  + `yuun.app` immediately** (both RDAP-confirmed unregistered 2026-06-10) —
  before any public artifact names them (USPTO ITU filings are public and watched
  by squatters). No get*/variant defensive registrations: the squat surface is
  unbounded and the real recourse against bad-faith variants is the trademark +
  UDRP, not preemptive buying. Instead: **backorder/drop-watch `yuun.com`**
  (Dynadot-held since 2010, no nameservers, expires 2026-09-07 — a realistic
  drop) and watch `yuel.com` (DE personal page, expires 2027-01).
  Counsel budget ≈ $2–6K for two marks; if out of budget, downgrade to self-serve
  knockout + single-class US ITU filings, never to skipping clearance.
- Fallbacks if counsel kills a name: Yuun→Yunari (note: yunari.com AND yunari.app
  are both already registered — materially weaker), Yuel→Yuelle (needs own sweep).
- **Sibling confusability (Yuel/Yuun)** — shared Yu- onset, edit distance 2 — is
  ACCEPTED with mitigations: spoken forms are distinct (YOO-el vs YOON), visual
  identities stay strongly distinct, and any copy naming both always carries
  descriptors ("Yuel — compatibility" / "Yuun — life timeline"). Caveat on record:
  the ADR-0012/0015 Universe bundle (`universe_pro`) would co-surface both names by
  design — revisit this acceptance if the bundle ever ships.
- Device display name = the bare Latin wordmark (Yuel / Yuun) in ALL locales;
  katakana companions (ユエル / ユーン) live in the JP store title + marketing only.
  This also closes yuan-launch.md's "(or Kindred in CJK locales)" artifact: there
  is no CJK device name.
- **Renaming cost is low on-store**: the App Store record (and its ratings)
  survives a display-name change, so shipping under a placeholder is *possible* —
  but the brand/word-of-mouth/press equity does NOT transfer, so we lock the
  coined name BEFORE the US push, not after.
- **Product-architecture question CLOSED (2026-06-10)**: Yuun is the **same app**
  (rebranded Auspice, one App Store record, ratings survive). The global
  timeline-led face lives in the en-US/ja metadata + custom product pages; the
  SEA/diaspora calendar-led face lives in the en-GB/zh metadata of the same
  listing. Per-locale store names make one record carry both. See
  [../brand-aso-gtm-plan.md](../brand-aso-gtm-plan.md) §3.
- Hexastral.com stays infrastructure only (share links `kindred.hexastral.com`,
  invite landings, privacy/terms). Give each consumer brand its own clean domain;
  do NOT route a US consumer to bare hexastral.com (reads off-positioning).
