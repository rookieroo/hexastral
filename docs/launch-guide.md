# Launch guide — first-time App Store / Google Play release

> End-to-end, **never-done-this-before** walkthrough: accounts → store apps → IAP
> (RevenueCat) → assets → EAS build → TestFlight → App Review → release. Pairs with
> [local-manual-checklist.md](local-manual-checklist.md) (the terse TL;DR tables) and
> [setup/revenuecat-entitlements.md](setup/revenuecat-entitlements.md) (RC entitlement detail).
>
> **Golden rule for a first launch: ship ONE app end-to-end first** (recommend **Cycle** —
> simplest: a subscription, no biometrics, daily-return value), learn the full pipeline,
> then fan out. Don't submit 8 apps in parallel on attempt #1.

---

## 0. Strategy — iOS-first, Android fast-follow (recommendation)

**Do iOS first to launch; build Android in parallel but submit it as a fast-follow.** Reasons:

- All 8 apps are Expo/RN with **both `bundleIdentifier` (iOS) and `package` (Android) already set**, and **RevenueCat abstracts billing across both** — so the *incremental* Android cost is mostly store listings + screenshots + Google Play Billing product creation + a testing pass, not new app code.
- iOS-first keeps the **first** review loop to one set of variables (premium/metaphysics also skews iOS ARPU). One clean iOS launch teaches the pipeline.
- **Google Play account is already approved** (sunk cost done) → don't waste it; queue Android right after the first iOS app is live and validated.

**Verdict:** worth pursuing Google Play, but **sequence it** — iOS (Cycle) → validate → iOS fan-out + Android (Cycle) → Android fan-out. Don't let Android block the first iOS submission.

---

## 1. The launch catalog (create the SIMPLIFIED set — §8 of monetization plan)

Create only the go-forward model. The legacy `hexastral_pro` / `coincast_pro` / standalone `faceoracle_pro` / `feng_pro` subs in `products.ts` are **retiring (ADR-0013 §2, P5)** — do NOT create them in the stores.

| App (bundle id) | Tier | Store products to create | Server entitlement / SKU |
|---|---|---|---|
| **fate** `com.hexastral.fate` | funnel | _none_ — invite-unlock + Ecosystem upsell to cycle/yuan | `fate_pro` (granted via `universe_pro` only) |
| **yuan** `com.hexastral.yuan` | sub flagship | `yuan_pro_monthly`, `yuan_pro_annual` | `yuan_pro` |
| **cycle** `com.hexastral.cycle` | sub flagship | `cycle_pro_monthly`, `cycle_pro_annual` | `cycle_pro` |
| **(bundle)** | bundle | `universe_pro_monthly`, `universe_pro_annual` | `universe_pro` (grants yuan/cycle/fate + allowance) |
| **feng** `com.hexastral.feng` | one-shot | `hexastral_feng_single` | SKU `feng_analysis` |
| **faceoracle** `com.hexastral.faceoracle` | consumable | `faceoracle_reading` | credit `face` (+ biometric consent gate) |
| **coincast** `com.hexastral.coincast` | consumable | `coincast_cast_pack_10` | credit `coincast` |
| **dreamoracle** `com.hexastral.dreamoracle` | consumable | `dream_pack_10` | credit `dream` |
| **numerology** `com.hexastral.numerology` | consumable | `numerology_pack_10` | credit `numerology` |

> Product IDs are the **single source of truth in `apps/hexastral-api/src/config/products.ts`** — the App Store / Play / RC IDs must match these strings exactly, and client `growth-config` imports them (never redefines). Reconcile the yuan-app divergence (`hexastral_yuan_pro_monthly` → `yuan_pro_monthly`) before creating products (ADR-0013 §6).

---

## 2. One-time accounts (do once for the whole org)

1. **Apple Developer Program** — enroll as **useone-tech LLC** (org account, needs D-U-N-S number; ~1–2 weeks if not done). $99/yr.
2. **App Store Connect (ASC)** — auto-available once enrolled. Add the **Paid Apps Agreement** + banking + tax (Agreements, Tax, and Banking) — **IAP will not work until this is "Active"**.
3. **Google Play Console** — already approved ✓. One-time $25. Set up the **Payments profile** (merchant account) — same blocker: no IAP without it.
4. **RevenueCat** — one project ("HexAstral"); add an **App** per platform per store app later (§5).
5. **Legal pages live** (blocks review): `hexastral-web` `/[locale]/privacy` (exists) + add `/[locale]/terms` + the **face biometric addendum**; documents must name **useone-tech LLC** as controller. See monetization plan §8.4.

---

## 3. Per-app: Apple Developer + App Store Connect

For each app (start with **Cycle**):

**a. Identifiers** (developer.apple.com → Certificates, IDs & Profiles → Identifiers)
- Register an **App ID** for the bundle id (e.g. `com.hexastral.cycle`). Enable capabilities the app uses (Push if used; **Sign in with Apple** for fate/yuan).

**b. ASC app record** (App Store Connect → Apps → +)
- Platform iOS, name (locale-specific per [ADR-0001](decisions/0001-yuan-naming.md) for Yuán), primary language, bundle id, SKU (any internal string).
- **App Privacy** questionnaire → declare data collected. For **faceoracle**: declare **"Sensitive Info / Biometric"**-adjacent + that data is sent to a third party (Gemini). Privacy Policy URL = the hexastral-web page.
- **Age rating**, category (Lifestyle / Entertainment — NOT "Medical").

**c. IAP / subscription products** (ASC → app → Monetization)
- **Subscriptions** (fate/yuan/cycle/universe): create a **Subscription Group** per app (see §4), add monthly + annual at the `products.ts` IDs, set price tiers per territory, add a **localized display name + description** (required), and the **review screenshot**.
- **Consumables / non-consumables** (feng one-shot, face/coin/dream/numerology packs): create under In-App Purchases with the matching IDs.
- Each product needs localized metadata or it's "Missing Metadata" and won't submit.

---

## 4. Subscription groups + crossgrade (avoid double-charge)

Per monetization plan §8.5 / ADR-0013:

- In **each subscription app**, put that app's sub **and** `universe_pro` in the **SAME Subscription Group** → upgrading sub → universe is a native **crossgrade with auto-proration** (Apple refunds the unused portion; **no cancel/refund, no double-charge**).
- Set **upgrade/downgrade levels** within the group (universe = highest level).
- **Cross-app caveat** (e.g. cycle_pro bought in cycle-app, then universe in fate-app = different app/group → StoreKit can't auto-cancel): **steer the "upgrade to universe" CTA to occur inside the app the user already subscribes to**. RevenueCat holds the account-level entitlement so access never gaps.

---

## 5. RevenueCat configuration

[setup/revenuecat-entitlements.md](setup/revenuecat-entitlements.md) has the entitlement table; the flow:

1. **Project → Apps**: add an **App Store** app (per iOS app) + later a **Play Store** app (per Android app). Paste the **App Store shared secret** (ASC → app → App Information) and the **Play service-account JSON**.
2. **Products**: import/add each store product ID (must equal `products.ts` IDs).
3. **Entitlements**: create `fate_pro`, `yuan_pro`, `cycle_pro`, `universe_pro` (+ episodic credits are server-ledger, not RC entitlements). Attach products → entitlements per the catalog (universe_pro product attaches to all flagship entitlements).
4. **Offerings**: build the paywall offering(s) the client renders (monthly/annual packages).
5. **Webhook** → `POST https://api.hexastral.com/api/iap/webhook` (confirm the live path in `routes/webhook.ts`); set the **Authorization Bearer secret** and store it as the worker secret the webhook verifies (constant-time check already implemented). RC events drive `user_entitlements` + the credit ledger.
6. Paste each app's **RC public SDK key** into its `.env` (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`).

---

## 6. Digital assets (per app)

See [phase-f-designer-brief.md](phase-f-designer-brief.md) for the spec. Minimum to submit:

- **App icon** 1024×1024 (no alpha, no rounded corners) — `assets/icon.png`.
- **Adaptive icon** (Android) — foreground + background.
- **Splash** — `assets/splash.png`.
- **Screenshots** — iOS requires **6.7"** (1290×2796) + **6.5"**; iPad if the app supports it. Google Play: phone + feature graphic 1024×500. Provide **per primary locale** (en/zh/zh-Hant/ja). The home/report screens were designed to "photograph well" — capture those.
- **Promo text / description / keywords** — pull from each app's `aso-metadata.json`.

> Designer-blocked items are tracked in [local-manual-checklist.md](local-manual-checklist.md). Placeholder icons will pass TestFlight but **not** App Review.

---

## 7. Build → TestFlight (EAS)

```bash
cd apps/cycle-app
eas login
eas init                       # fills EAS_PROJECT_ID → paste into app.json extra.eas.projectId + eas.json
eas build --profile production --platform ios
eas submit --profile production --platform ios   # uploads the .ipa to ASC → TestFlight
```

- First iOS build prompts to create **distribution cert + provisioning profile** — let EAS manage them.
- After processing (~10–30 min), the build appears in **ASC → TestFlight**. Add **Internal testers** (your own Apple IDs, no review) → install via the TestFlight app.
- **Smoke test on a real device**: onboarding → reading → **chat (free taste → 402 wall)** → **purchase in sandbox** (use a Sandbox Apple ID; ASC → Users and Access → Sandbox Testers) → verify the entitlement unlocks (server `user_entitlements` row appears) → **Restore Purchases** works.
- For **faceoracle**: verify the **biometric consent screen** gates the first upload, and that declining → no VLM call (server returns `biometric_consent_required` 403).

---

## 8. App Review prep — rejection-proofing

Most first-submission rejections come from these (all addressable up front):

- **3.1.2 (subscriptions)**: the paywall must show **title, duration, price-per-period, what's included**, and **functional links to Terms (EULA) + Privacy Policy**; the app must have a **Restore Purchases** button and a link to manage/cancel. Auto-renew disclosure text required.
- **3.1.1**: don't gate purchasable content behind anything but IAP; no external-purchase mentions in-app (US allows external link entitlement, but keep V1 simple = IAP only).
- **"Subscription provides ongoing value"**: this is why **feng/face are NOT subscriptions** (one-shot/consumable) — a sub with no recurring value gets rejected.
- **5.1.2 / biometrics**: faceoracle must have the explicit consent flow + privacy disclosure of Gemini processing + retention (feature vectors only). Have a **demo account / steps** ready in App Review notes.
- **Account deletion** (5.1.1(v)): if the app has accounts, it must offer in-app deletion (revoke-apple + delete user already exist server-side — wire the UI).
- **Metadata**: every IAP localized; screenshots match the actual app; no placeholder text.
- **App Review notes**: provide a test login (or note it's anonymous), a **sandbox purchase walkthrough**, and for faceoracle a sample face image + the consent steps.

---

## 9. Submit → release

1. ASC → app → **add the build** to the version, fill "What's New", attach screenshots + IAP.
2. Submit for Review (subscriptions are reviewed **with** the app's first version). Typical 24–48h.
3. On approval: **Manual release** (recommended for #1 so you control timing) or phased release.
4. Flip any server feature flags / confirm `wrangler` deploys are live (`api.hexastral.com/api/health`), webhook secret set, D1 migrated (`bun db:migrate:prod`, incl. `0003` biometric-consent).

---

## 10. Google Play parallel track (fast-follow)

Per app, after iOS is validated:

1. **Play Console → Create app** → bundle = the `package` id (already set, e.g. `com.hexastral.cycle`).
2. **Monetization → Products**: create **Subscriptions** (base plans monthly/annual) + **In-app products** (consumables) at the **same IDs** as `products.ts` (RC requires ID parity to share entitlement logic).
3. **Play Billing**: link the **service-account JSON** into RevenueCat (Play app) for purchase validation + the **Real-time Developer Notifications (RTDN)** Pub/Sub topic → RC.
4. **Data safety** form (Play's privacy questionnaire) — declare biometric for faceoracle.
5. Build + submit:
   ```bash
   cd apps/cycle-app
   eas build --profile production --platform android
   eas submit --profile production --platform android   # to the Play internal testing track
   ```
6. Promote **Internal testing → Closed → Production**. Play review is usually faster but the **first app on a new account can take days** (account vetting).

> RevenueCat means the **client paywall + entitlement code is identical** across platforms — only store config + assets differ.

---

## 11. Post-launch

- **Webhook health**: alert on RC webhook failures; the planned **RC REST reconciliation sweep** (ADR-0013 §5b) self-heals missed events — wire it before scale.
- **Fair-use telemetry**: watch `429 fair_use_limited` rate (chat) + `[llm-router.metric]` lines (model/fallback/cost) to tune `CHAT_FAIRUSE_GUARD_CONFIG` (currently ~120/day) and the routing fallback order.
- **Subscription metrics**: RC dashboards (conversion, churn, trial→paid). Validate universe crossgrade proration on a real upgrade.
- **Refund/cancel**: handled by the stores; the webhook expiration path zeroes universe allowance + drops entitlements.

---

## 12. Recommended first-pass order

1. Legal pages live (`/privacy` + `/terms` + biometric addendum). · Accounts + agreements **Active**.
2. **Cycle** end-to-end on **iOS**: ASC app + `cycle_pro` group + RC + assets + EAS → TestFlight → sandbox purchase → submit → release.
3. Repeat for **fate**, **yuan**, then **universe_pro** wiring, then the episodic apps (faceoracle last — biometric review is the most involved).
4. **Android (Cycle)** once iOS Cycle is approved → then Android fan-out.
