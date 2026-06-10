# ADR-0024 — App brand naming (coined-word strategy, parallel to launch)

**Status:** Proposed / in progress (2026-06-10). Frontrunners chosen, formal
clearance + registrar checks pending (outside-sandbox, attorney/registrar).

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
   - **运 (yùn → "Yune")** — 大运/流年 fortune cycles → the Auspice-successor
     (the timeline + what-if read *the 运*). Conceptually exact + sibling to Yuel.

2. **Process is three-in-one, run in PARALLEL with App Store / Play review — no
   waiting** (registration never gates publishing; US is first-to-use):
   - **Clearance** (fast, the only pre-launch gate): knockout search on the
     finalist before committing the name.
   - **File** the application early (use-based or intent-to-use) — locks the
     priority date; cheap (~one class fee), same-week.
   - **Register** completes in the background (~8–14 mo) — does not block launch.
   - **Domain**: register `brand.com`/`.app` alongside filing.
   - Not launching in mainland China → the China first-to-file squatter risk does
     not apply; no urgent CN filing needed.

## Screening log (App Store same-name + brand-in-use, via web search; NOT a
formal USPTO/registrar clearance)

| Candidate | For | Finding | Light |
|---|---|---|---|
| **Yuel** (缘) | Yuán/Kindred | no app/software brand on it (one small design studio) | 🟢 frontrunner |
| Yune (运) | Yùn/Auspice | IPG-owned "Yune" marketing agency + a "Yune Net" utility app | 🟡 viable, verify class |
| Conjunct | Kindred | no app, but descriptive-in-astrology + conjunct.com is premium-held | 🟡 weak mark |
| Symbi | Kindred | funded roommate-match startup + SymbiMind/Simbi/SymbiCare | 🔴 |
| Aevum | Auspice | aerospace startup + multiple software agencies | 🔴 |
| Chrona | Auspice | several time-mgmt apps (also concept-collides) | 🔴 |
| Kairos | Auspice | Kairos face-AI (funded) + Kairos Software + Panasonic | 🔴 |
| Vael | Auspice | Vael AI writing + Vael legacy + Vael creative | 🔴 |
| Cusp / Kith / Twine / Dyad | Kindred | occupied (Cusp = same-category competitor; Kith = streetwear) | 🔴 |

## Consequences / open items

- **Yuel** is the working frontrunner for the compatibility app; **Yune** for the
  timeline/what-if app, pending: (a) formal USPTO TESS clearance in software
  classes (9/42/45), (b) `yuel.com|.app` + `yune.com|.app` registrar/WHOIS check,
  (c) the IPG "Yune" mark's class — if it conflicts in software, pick a cleaner
  运-variant (e.g. Yuun/Wyne) rather than fight it.
- **Renaming cost is low on-store**: the App Store record (and its ratings)
  survives a display-name change, so shipping under a placeholder is *possible* —
  but the brand/word-of-mouth/press equity does NOT transfer, so we lock the
  coined name BEFORE the US push, not after.
- **Product-architecture open question** (out of scope here): whether the global
  timeline/what-if "Yune" is the *same* app as the diaspora 黄历 (rebranded global
  face) or a separate front-door on the shared engine — decide separately.
- Hexastral.com stays infrastructure only (share links `kindred.hexastral.com`,
  invite landings, privacy/terms). Give each consumer brand its own clean domain;
  do NOT route a US consumer to bare hexastral.com (reads off-positioning).
