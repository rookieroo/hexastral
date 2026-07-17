# CoinCast — MVP / launch doc

**Directory:** `apps/coin-cast-app` · **Bundle:** `com.hexastral.coincast` · **Internal codename:** CoinCast

**Consumer brand (proposed):** **Yaul** (爻 yáo) — coined Latin wordmark like Yuun/Yuel. App Store title carries 易经/六爻/I Ching; bare brand on home screen. See `aso-metadata.json` + § Brand below.

Growth satellite — standalone I Ching oracle with 3D coin casting and portfolio-linked history.

---

## Brand (store vs code)

| Layer | Name | Notes |
|---|---|---|
| **Consumer brand** | **Yaul** | Proposed; pending trademark knockout (same process as Yuel/Yuun). Pronunciation ≈「yahl」; anchor 爻 (hexagram line). |
| **App Store title** | `Yaul · 易经六爻摇卦` / `Yaul: I Ching Liu Yao Cast` | 六爻 · 易经 · 摇卦 only in **indexed** title/subtitle/keywords — not in the bare wordmark. |
| **Device display name** | `Yaul` | `app.json` `expo.name` = Yaul; brand home at `yaul.hexastral.com`. |
| **Brand domain** | `yaul.hexastral.com` | Same worker as Yuel/Yuun; privacy at `/privacy/coincast`. |
| **Bundle / RC / API** | `coincast` / `com.hexastral.coincast` | Unchanged — rename pass is optional post-launch. |
| **Retired** | CoinCast | Conflicts with [Coincast — Send Crypto](https://apps.apple.com/us/app/coincast-send-crypto/id1517543384); too descriptive for trademark. |

**Alternates** if counsel blocks Yaul: Guun (卦), Zhaol (兆), Shiel (筮) — listed in `aso-metadata.json`.

**ASO SSOT:** `apps/coin-cast-app/aso-metadata.json` (4 locales: en-US, zh-Hans, zh-Hant, ja).

---

## Positioning (App Store)

> Rigorous 易经 companion — real coin physics, classical line rules (6/7/8/9), and cited commentary. Study tool + journal framing, not generic fortune spam.

**Visual:** Zinc structural UI; ink-stone altar; logo coin caps (default) with optional custom face upload.

**Coin skins:** Default Yaul logo coin. Settings → upload a custom face (contain fit, no crop). Regenerate bundled caps: `node apps/coin-cast-app/scripts/gen-logo-coin-face.mjs`.

**Brand mark:** `docs/design/coins/coincast-mark-three.svg` (三枚方孔钱) · `wu-zhu.svg` (单枚参考). Regenerate app icons: `node apps/coin-cast-app/scripts/gen-brand-assets.mjs` (needs `rsvg-convert`).

---

## MVP scope (current)

| Layer | Shipped | Notes |
|---|---|---|
| Casting | Per-line DeviceMotion → fixed-step 3-coin physics | Final rigid-body faces are authoritative; no silent random fallback |
| Output | **Classical tier** (free quota): hexagram + I Ching corpus + na-jia, no LLM · **AI tier** (cast pack / Pro): personalized LLM commentary via `svc-astro` `/yiching/cast` | `yaoValues` from six motion-caused or explicitly assisted lines |
| Personalization | None for divination — birth charts live in **Yuun** / **Yuel** | CoinCast is one-question-one-cast; no birth info in the cast pipeline |
| Monetization | **Consumable-first:** 1 / 5 / 10 cast packs | `coincast_pro_*` for skins + quota; `universe_pro` cross-app |
| Quota | Guest 3/day · linked 3/month + credits | `evaluateCoincastQuota` |
| Upgrade | Classical reading → AI in-place (`POST .../upgrade-ai`) | 1 credit or Pro; same hexagram |
| Memory | Opt-in portfolio memory (Settings) | AI casts only; index + recall |
| Platform | iOS (Expo 54) | Settings via top-right + left-swipe (Fēng model) |

### Casting provenance and privacy

Each line has one source:

- **感应摇卦 / motion:** Yaul captures DeviceMotion only during that line, preserving real sampling intervals, acceleration, gravity direction, angular velocity, and device/person differences. A fixed-step Cannon world consumes the frames, and the three settled cap orientations produce 6/7/8/9.
- **数字代摇 / digital assistance:** an explicit, confirmed fallback using secure random bytes when motion sensing or physical settling cannot complete. It is never presented as a motion-caused line.

Raw motion frames remain local and are discarded after the line. Yaul retains a SHA-256 motion digest for each line, then submits one aggregate 64-character digest with the six `yaoValues`.

Motion that is too short, interrupted, missing samples, or lacks basic directional change is rejected as incomplete rather than normalized into an artificial “fair” shake. Different users and devices are intentionally allowed to cause different trajectories.

### Custom coin upload

The picker handles denied/limited access, cancellation, stale native builds, unsupported images, and storage failures separately. Images are decoded through Expo ImageManipulator, scaled to a 2048 px maximum without cropping, converted to JPEG, validated, and atomically persisted before the previous file is deleted. Rebuild the iOS dev client after native module or permission changes; a Metro JS refresh does not update `Info.plist` or Pods.

### Post-MVP

- 40-stalk method, hexagram journal, 64-gua study path, widget/watch

---

## Monetization

| SKU | Type | Purpose |
|---|---|---|
| `coincast_cast_pack_1` | consumable | +1 AI commentary cast credit |
| `coincast_cast_pack_5` | consumable | +5 AI commentary cast credits |
| `coincast_cast_pack_10` | consumable | +10 AI commentary cast credits |
| `coincast_pro_monthly` / `_annual` | subscription | Unlimited casts + AI on each cast + coin skins |
| `universe_pro_*` | subscription | All app Pros + shared birth info |

Paywall surfaces **packs first**, subscriptions secondary. ASC **Display Names** should read **Yaul AI Deep Read ×N** (Product IDs stay `coincast_cast_pack_*`).

---

## Birth info & chart apps

CoinCast **does not** collect or use birth info for 六爻. Settings → **八字与命盘** opens a funnel to:

- **Yuun** (`auspice-app`) — personal BaZi + Zi Wei + life timeline  
- **Yuel** (`kindred-app`) — two-chart synastry  

Birth data SSOT remains `GET/PUT /api/portfolio/birth-info`, edited only in apps that need a chart.

---

## Technical dependencies

- `@zhop/portfolio-client` — preview/linked, readings
- `@zhop/satellite-runtime` — HMAC, purchases, bootstrap
- `hexastral-api` — `portfolio` target `coincast`
- `svc-astro` — `/yiching/cast`

---

## Commands

```bash
cd apps/coin-cast-app
bun dev
bun typecheck
eas build --profile production --platform ios
```
