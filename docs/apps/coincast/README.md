# CoinCast — MVP / launch doc

**Directory:** `apps/coin-cast-app` · **Bundle:** `com.hexastral.coincast` · **Display name:** CoinCast

Growth satellite — standalone I Ching oracle. Currently **Expo 54 scaffold only**; this doc is the launch surface until implementation catches up.

Architecture source (historical): [archive ADR-0017](../../archive/decisions/0017-v1.5-wave-face-coin-dream.md) §Coincast.

---

## Positioning (App Store)

> The most rigorous 易经 study companion — real coin physics simulation **and** the 40-stalk classical method, with cited 王弼 / 朱熹 commentary on every line, journaled across time.

**Anti-spam frame:** I-Ching **study tool + hexagram journal** — not generic fortune-telling. Academic 占筮 vs 哲学 framing; 周易 / 系辞 / 说卦 separation.

**Pass-odds target:** 80–85% (highest among oracle-class apps per ADR-0017 scorecard).

---

## MVP scope

| Layer | MVP | Post-MVP |
|---|---|---|
| Casting | Coin physics OR 40-stalk simulation + question/context | Curriculum mode, comparison mode |
| Output | 64-hexagram visualization + 变爻 + classical citations (4 locales) | AI 易经 tutor (Pro) |
| UX | Single consultation result + share | Hexagram Journal (Pro), 64-hexagram study path |
| Monetization | Free unlimited divinations | Pro: journal + AI tutor |
| Platform | iOS (Expo 54) | widget-kit-ios, watch-kit-ios (reuse from portfolio) |

---

## Technical dependencies

- `@zhop/astro-core` — hexagram / line logic (via svc-astro or client-side where deterministic)
- `@zhop/satellite-runtime` — portfolio bootstrap, HMAC, push, flags
- `@zhop/hexastral-client` — signed API to `hexastral-api`
- `hexastral-api` — `/api/divination/*` routes (wire when MVP casting ships)

Follow root [.cursorrules](../../../.cursorrules) §3 for mobile satellite patterns.

---

## TODO (implementation)

- [ ] Wire casting UI to API (replace scaffold home)
- [ ] Implement coin-physics + 40-stalk flows per classical verification rules
- [ ] 64-hexagram result screen with 王弼 / 朱熹 citations (4 locales)
- [ ] RC products + entitlements (free unlimited / Pro journal)
- [ ] `aso-metadata.json` + [screenshot-direction.md](../../publish/screenshot-direction.md) deck
- [ ] EAS production profile + ASC record (after Yuun/Yuel/Feng telemetry validates 4.3(b))
- [ ] Maestro smoke flow under `apps/coin-cast-app/.maestro/` (create when UI exists)

---

## Launch gate

Start ASC submission when:

1. At least one of Yuun / Yuel / Feng is **live** in App Store
2. No 4.3(b) rejection pattern on the V1 apps for category saturation
3. CoinCast MVP checklist above is complete + `bun typecheck` clean

---

## Commands

```bash
cd apps/coin-cast-app
bun dev                    # Metro
npx expo install <pkg>     # native modules
eas build --profile production --platform ios
```
