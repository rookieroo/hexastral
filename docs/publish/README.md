# Publish Checklist — Yuel & Yuun (App Store)

> **可执行上架 Runbook**：[yuun-yuel-launch-runbook.md](./yuun-yuel-launch-runbook.md)  
> **Bundle 改名后 Portal（五 App）**：[post-bundle-rename-portal.md](./post-bundle-rename-portal.md)  
> **App Store Connect 逐步操作**：[asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md)  
> **Google Play Console 提交表单包（Yuun）**：[yuun-google-play-console.md](./yuun-google-play-console.md)  
> **US 商标申报材料**：[trademark-filing-prep.md](./trademark-filing-prep.md)
>
> Every task here is **human / console work** that cannot be done from the repo:
> App Store Connect, RevenueCat dashboard, Apple Developer portal, real secrets,
> screenshots, and the production deploy. **Code-side submit blockers for Yuun /
> Yuel / Syel are largely closed** (see § Code readiness below); remaining work
> is almost entirely console + secrets.
>
> Canonical IAP mapping: [apps/hexastral-api/src/config/products.ts](../../apps/hexastral-api/src/config/products.ts).
> RevenueCat walkthrough: [docs/setup/revenuecat-entitlements.md](../setup/revenuecat-entitlements.md).
> Brand decision: ADR-0024.

Last updated: 2026-07-31.

---

## Code readiness snapshot (2026-07-31)

| Brand | Directory | Code for Submit | Still human |
|---|---|---|---|
| **Yuun** | `auspice-app` | ✅ Server Pro for LLM routes; `ALLOW_DEV_PRO=0`; Delete Account; Paywall 3.1.2; leap birthday + morning push budget | RC `appl_*`, `ascAppId`, `CYCLE_CALENDAR_SECRET`, Widget evidence / strip ASO, [pre-submit-smoke.md](../apps/yuun/pre-submit-smoke.md) → Submit |
| **Yuel** | `kindred-app` | ✅ Invite UL harden; Delete Account; Paywall; Pro + one-time unlock; [pre-submit-audit.md](../apps/yuel/pre-submit-audit.md) | ASC/RC three products (`kindred_pro_*` + `hexastral_compatibility`), carry-over smoke, [pre-submit-smoke.md](../apps/yuel/pre-submit-smoke.md) → Submit after Yuun Approved |
| **Syel** | `xingqi-app` | ✅ `faceoracle_pro` chat/capability + VLM gate; production reading-job copy; ja push + rest-theme 3d; 五章文案; iCloud empty toggle removed | EAS `projectId` still `REPLACE_*`; RC/ASC; [regression-checklist.md](../apps/xingqi/regression-checklist.md) |
| **Kanyu** | `feng-app` | ⚠️ Engine + queue OK; **LLM prose quality not submit-blocking for V1 wave order but not Review-grade yet** — see [feng/report-quality-plan.md](../apps/feng/report-quality-plan.md) | Vision/synthesis P0 + ASC/RC |
| **Yaul** | `coin-cast-app` | ❌ **Not App Store ready** — casting/physics largely coded, but ASO claims 五帝钱 skins that are not shipped; privacy URL gated while `visibility: hidden`; production RC/ASC placeholders | Product sign-off + ASO fix + legal URL + ASC/RC — [coincast/README.md](../apps/coincast/README.md) § Readiness |

**Ship / submit order (technical):** Yuun → Yuel → (Kanyu after prose P0) → Yaul last. Syel is post-wave but code-ready for parallel console prep.

**API / D1:** `ALLOW_DEV_PRO: "0"` live; HMAC exemptions for notify stale-token + physiognomy `purge-inactive`; migrations through **0040** (0039 push no-verbatim-repeat guard + 0040 push metrics `auspice_push_sends`/`auspice_push_opens`). Prefer `bun db:migrate:prod` then `bun deploy` — do not assume “through 0018” or older tips from previous docs.

---

## 0. App identity (the permanent facts)

> **Frozen bundle IDs (2026-07):** `com.hexastral.{yuel,yuun,kanyu,yaul,syel}` — brand-aligned. Do not recreate under old engineering suffixes (`kindred`/`auspice`/`feng`/`coincast`/`xingqi`). Directory + RC product ids remain engineering names.

| | **Yuel** | **Yuun** |
|---|---|---|
| Directory | `apps/kindred-app` | `apps/auspice-app` |
| Display name (store + device) | Yuel | Yuun |
| Bundle ID (permanent) | `com.hexastral.yuel` | `com.hexastral.yuun` |
| Internal codename (do NOT user-surface) | kindred | auspice |
| EAS Expo slug | `yuan` (immutable; matches cloud project) | `auspice` |
| Primary category | Lifestyle (2nd: Education) | Reference |
| Brand domain (live) | `yuel.hexastral.com` | `yuun.hexastral.com` |
| Apple Team ID | `L9Z47DW56X` | `L9Z47DW56X` |
| Version / build | 0.1.0 / EAS auto-increment | 1.0.0 / EAS auto-increment |
| **IAP model (MVP)** | **3 keys:** `kindred_pro_monthly` / `kindred_pro_annual` + one-time `hexastral_compatibility` | **2 keys:** `auspice_pro_monthly` / `auspice_pro_annual` |

**Yaul** (coin-cast, pre-launch — same worker pattern as Yuel/Yuun):

| | **Yaul** |
|---|---|
| Directory | `apps/coin-cast-app` |
| Display name (store + device) | Yaul |
| Bundle ID (permanent) | `com.hexastral.yaul` |
| Internal codename | coincast |
| Primary category | Reference (2nd: Education) |
| Brand domain (live) | `yaul.hexastral.com` |
| Privacy / Terms | `yaul.hexastral.com/<seg>/privacy/yaul` · `yaul.hexastral.com/<seg>/terms` |
| Associated Domains | `applinks:yaul.hexastral.com` + apex `hexastral.com` (deep links) |
| Submit blocker | ASO/legal/ASC/RC — **not** a greenfield empty app; see § Code readiness |

> **Naming policy (ADR-0024 + decided 2026-06):** Yuel/Yuun are the *brand /
> display* layer only. The internal codenames (`kindred`, `auspice`) and the
> RevenueCat entitlement/product IDs stay as-is — the brand is not yet legally
> final (USPTO clearance pending), so do **not** bake `yuel_`/`yuun_` into the
> permanent IAP product IDs. Brand surfaces only in the ASC localized display
> names, which are freely changeable.

---

## 1. Apple Developer portal (both apps)

- [ ] Register App ID for `com.hexastral.yuel` (Yuel)
- [ ] Register App ID for `com.hexastral.yuun` (Yuun)
- [ ] Enable **Sign in with Apple** capability on **both** bundle IDs (apps set `usesAppleSignIn: true`)
- [ ] Add Associated Domains for the applinks each app declares:
  - Yuel: `applinks:yuel.hexastral.com`
  - Yuun: `applinks:hexastral.com`, `applinks:www.hexastral.com`, `applinks:yuun.hexastral.com`
- [ ] Regenerate provisioning profiles **after** enabling the capability above
- [ ] Create a sandbox tester (Users and Access → Sandbox Testers) for IAP testing

---

## 2. App Store Connect — app records

For **each** app (Yuel, then Yuun):

- [ ] Create the app record (bundle ID from §0; Primary Language = English so
      un-localized storefronts fall back to en-US)
- [ ] Set categories per §0
- [ ] Localize the listing for the 4 shipping locales: **en-US, zh-Hans, zh-Hant, ja**
      (copy lives in each app's `aso-metadata.json`)
- [ ] Content rating: 12+
- [ ] **Privacy Policy URL** and **Terms URL** (the binding ASC fields — must resolve):
  - Yuel privacy: `https://yuel.hexastral.com/<seg>/privacy/yuel` · terms: `https://yuel.hexastral.com/<seg>/terms`
    (`<seg>` = `en` | `zh` | `tw` | `ja`)
  - Yuun privacy: `https://yuun.hexastral.com/<seg>/privacy/yuun` · terms: `https://yuun.hexastral.com/<seg>/terms`
    (`<seg>` = `en` | `zh` | `tw` | `ja`) — **RESOLVED 2026-06-25**: Yuun was switched to the
    locale-segmented form so it matches Yuel. `apps/auspice-app/lib/config.ts` now exports
    `privacyUrl(locale)` / `termsUrl(locale)` (were static locale-blind constants), the
    settings screen (`app/(tabs)/me.tsx`) passes the active locale, and the 4
    `aso-metadata.json` descriptions were corrected from the bare `hexastral.com/privacy`
    to `yuun.hexastral.com/<seg>/{privacy/auspice,terms}`. The web route
    `app/[locale]/privacy/[appKey]` exists with `localePrefix: 'as-needed'` (defaultLocale
    `en`) and `appKey=auspice` is registered, so each segmented URL maps to a real page.
    **Still human:** the web routes are code-only until `hexastral-web` is deployed (§5) —
    confirm the URLs return 200 live after that deploy, then paste them into the ASC
    Privacy/Terms fields per App Store locale.
- [ ] Privacy "nutrition" labels:
  - Both apps: **No tracking** (`NSPrivacyTracking: false`), no ATT.
  - Data collected: Apple email (sign-in only), Purchases. Yuel also: user-typed
    birth dates / partner birthdays (typed into the app, not device contacts).
  - **Yuun push metrics (2026-07):** declare **Product Interaction — Not linked —
    Analytics** (push tap usage analytics). The metrics tables store only a salted
    one-way device key (`metricsDeviceKey`), never the raw device id — nothing is
    linkable to an account. `app.json` `NSPrivacyCollectedDataTypes` already ships
    this row (Linked=false, Analytics + App Functionality); paste the matching
    row in ASC. Android Play Data safety: "App activity — collected, not shared" +
    "Device or other IDs — app functionality".
- [ ] Get the **ascAppId** Apple assigns → paste into `eas.json` submit config (see §6)

---

## 3. RevenueCat dashboard

Follow [docs/setup/revenuecat-entitlements.md](../setup/revenuecat-entitlements.md).
**MVP scope (decided 2026-06): ship per-app Pro only.** See §7.

> ✅ **UPDATED 2026-08-01:** Yuel MVP ships **all three** products: `kindred_pro_monthly`,
> `kindred_pro_annual`, and one-time `hexastral_compatibility`. Yuun ships **two**
> subscription products only. Do **not** create `universe_pro` at MVP.
> `products.ts` remains the engineering catalog SSOT.
>
> **Yuel Pro grants:** personal 命书 + monthly relationship layer + living layer
> (timeline / what-if / AI chat with **monthly allowance**, not unlimited) + **3**
> synastry unlocks (or birth recomputes) per month. No daily almanac (Yuun owns that).
> 合盘 remains separately purchasable when monthly unlocks are exhausted.

### 3.1 Entitlements (MVP create)
- [ ] `kindred_pro` (Yuel) — display name "Yuel Pro"
- [ ] `auspice_pro` (Yuun) — display name "Yuun Pro"
- [ ] **Do NOT create** `universe_pro` at MVP (see §7)

### 3.2 Products (create in ASC + register in RevenueCat with the *exact* IDs)
| App | Product ID | Type | Grants entitlement | Price (confirm in ASC) | MVP? |
|---|---|---|---|---|---|
| Yuel | `kindred_pro_monthly` | auto-renew sub | `kindred_pro` | $7.99/mo | **Yes** |
| Yuel | `kindred_pro_annual` | auto-renew sub | `kindred_pro` | $47.99/yr | **Yes** |
| Yuel | `hexastral_compatibility` | consumable (server-applied, per-bond) | — | $6.99 | **Yes** |
| Yuun | `auspice_pro_monthly` | auto-renew sub | `auspice_pro` | TBD — confirm | **Yes** |
| Yuun | `auspice_pro_annual` | auto-renew sub | `auspice_pro` | TBD — confirm | **Yes** |

- [ ] Yuel: put `kindred_pro_*` in Subscription Group; offering `yuan_default`; also register `hexastral_compatibility` (NON_RENEWING_PURCHASE webhook)
- [ ] Yuun: put subscription products in Subscription Group; offering `auspice_default`
- [ ] **Webhook**: `https://api.hexastral.com/webhooks/revenuecat`, `Authorization: Bearer <secret>`
      (same value as the Worker's `REVENUECAT_WEBHOOK_SECRET`). Events: `INITIAL_PURCHASE`,
      `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `NON_RENEWING_PURCHASE`.
- [ ] Copy the public SDK keys (`appl_*` iOS, `goog_*` Android, `test_*` sandbox) → §6

---

## 4. Secrets — Cloudflare Worker (hexastral-api)

- [ ] `REVENUECAT_WEBHOOK_SECRET` — must equal the RevenueCat webhook Bearer token
      (`cd apps/hexastral-api && wrangler secret put REVENUECAT_WEBHOOK_SECRET`)
- [ ] Any Yuun calendar/push secret required by `apps/yuun/launch.md` (e.g. the
      calendar signing secret) — confirm against that doc before deploy

---

## 5. Backend deploy + DB migration

> Migrations are **sequential and cumulative**. `bun db:migrate:prod` applies every
> unapplied migration in order. Current tip **0040** (0039 push no-verbatim-repeat
> guard `last_body_key`; 0040 push metrics `auspice_push_sends` / `auspice_push_opens`;
> earlier push-queue / timezone work 0031–0034). Older notes that said “through 0018”
> are obsolete — always migrate to the current tip before relying on push / birthday /
> FaceOracle cron paths.

Order (local wrangler — no CI exists):
- [ ] Internal services first: `svc-astro`, `svc-notify`, `svc-signal`, `svc-geocode`,
      `svc-mailer`, `svc-admin-notify`, `svc-tail` (each: `cd services/<svc> && bun deploy`)
- [ ] API + migrations:
      ```bash
      cd apps/hexastral-api
      bun db:migrate:prod      # applies all pending migrations (…→0040+) to remote D1
      bun deploy
      ```
- [ ] Web (serves the privacy/terms + invite landings on all brand domains):
      `cd apps/hexastral-web && bun deploy`
- [ ] Verify `https://api.hexastral.com/webhooks/revenuecat` is reachable
- [ ] Spot-check Yuun/Yuel privacy URLs return **200** for `en`/`zh`/`tw`/`ja` segments

---

## 6. eas.json secrets (both apps — currently `REPLACE_WITH_*` placeholders)

For `apps/kindred-app/eas.json` **and** `apps/auspice-app/eas.json`:
- [x] `EXPO_PUBLIC_EAS_PROJECT_ID` — both apps linked (`auspice` `269d6ab5-…`, Yuel slug **`yuan`** project `95b2e753-…`)
- [ ] `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_*`; `test_*` for sandbox builds)
- [ ] `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_*`, only if shipping Android)
- [ ] `submit.production.ios.ascAppId` (from §2; `appleTeamId` is already `L9Z47DW56X`)

> The app no-ops RevenueCat while the key still looks like `REPLACE_WITH_*`, so
> builds won't crash — but IAP is dead until real keys are in.

---

## 7. MVP scope decisions (do NOT ship these at launch)

- **Universe Pro** (`universe_pro`, the cross-app bundle): plumbing exists in code,
  but **do not create the `universe_pro_*` products or a `universe_default` offering**
  at MVP. Reason: cross-app value is ~nil with only 2 apps live, it complicates
  pricing and enlarges the review surface. Add it as a Phase-2 upsell once 3+ apps
  ship. No code change needed — the paywalls already can't surface it.
- **Cross-app memory** (`crossAppMemoryEnabled`): opt-in, default false, gated to
  the universe tier — so with no universe sold, it is already off. The Yuel settings
  toggle that surfaced it has been **removed from the app** (server flag stays
  default-false; `lib/memory-preference.ts` kept dormant for post-MVP restore). Keep
  "links data across apps" **off** the privacy labels even though terms/privacy text
  mentions the capability. Same-app portfolio memory (Pro) is fine to keep.
- **Yuel solo personal report** (`hexastral_personal`, $4.99): client button is
  null-guarded and won't render until the product exists in ASC. Optional post-launch.

---

## 8. Screenshots & final preflight

- [ ] Screenshots: 6.7" iPhone, 5–6 per locale × 4 locales, per
      [docs/publish/screenshot-direction.md](./screenshot-direction.md) (two-chart compare /
      invite / AI chat for Yuel; almanac / timeline for Yuun — avoid zodiac/fortune visuals)
- [ ] Reviewer notes + a demo account (template in [launch-checklist.md](../launch-checklist.md))
- [~] `bun typecheck && bun lint && bun test` (2026-06-25): **typecheck clean** (36/36;
      fixed a pre-existing type error in `packages/scenario-kindred/src/components/ChapterPager.tsx`
      — the `widths` array needed `as const` for RN's `DimensionValue`), **test clean**
      (993 pass / 0 fail). **lint is NOT clean** — pre-existing format drift, see §9.
- [x] aso-metadata char-count — script added at `scripts/aso-charcount.mjs`; run
      `node scripts/aso-charcount.mjs apps/auspice-app/aso-metadata.json apps/kindred-app/aso-metadata.json`.
      Both apps verified within limits 2026-06-25 (Yuun en-US description 2228/4000 after the URL edit).
- [ ] Build + submit:
      ```bash
      cd apps/kindred-app   # then apps/auspice-app
      eas build --profile production --platform ios
      eas submit --platform ios
      ```

Submission order (ADR-0019): ship the lower-risk Reference app (Yuun) first to
build publisher credibility, then Yuel.

---

## 9. Known issues to resolve before/at submission

- [x] **Yuun privacy/terms URL** — RESOLVED 2026-06-25 (see §2). Switched Yuun to the
      locale-segmented form like Yuel: `lib/config.ts` now exports `privacyUrl(locale)` /
      `termsUrl(locale)`, `me.tsx` passes the locale, and the 4 `aso-metadata.json`
      descriptions were corrected to `yuun.hexastral.com/<seg>/...`. Live 200-check still
      pending the `hexastral-web` deploy (§5).
- [x] **revenuecat-entitlements.md was stale** — RESOLVED 2026-06-25: rewritten to match
      `products.ts` (`kindred_pro`/`auspice_pro`; `fate_pro` universe-only; `universe_pro`
      Phase 2). See §3.
- [ ] **`bun lint` is red on `main` (pre-existing format drift)** — found 2026-06-25:
      ~21 Biome errors across 7 workspaces (astro-core, auspice-app, hexastral-api,
      hexastral-web, kindred-app, scenario-kindred, scenario-yuan), almost all `format`
      category + one `organizeImports`. **Not introduced by the URL/doc work** — those
      files pass Biome. Fix is mechanical and safe: `bun lint:fix` (≈400 lines across ~22
      files); kept out of this pass so it doesn't muddy the launch diff. Run it as a
      dedicated formatting commit, confirm `bun lint` green, then re-run `bun typecheck && bun test`.
- [ ] **CJK font** (`NotoSerifSC`) not bundled in Yuel (offline blocker) — ships on
      system serif; revisit post-launch for polish.
- [x] **Yuun orphan one-time-purchase scaffolding** — `apps/auspice-app/lib/synastry-iap.ts`
      (unused `hexastral_compatibility` one-time purchase) **deleted** so Yuun's code matches
      its subscription-only MVP. Restore from git when the synastry-in-auspice PLAN is built.
- [x] **Dead duplicate route** — `bonds.ts` had `POST /:id/unlock` registered twice; the
      second (legacy coins / `unlockedDimensions` model) was shadowed by the live
      `single_purchase` handler and **deleted**. (Project-wide scan: the only other duplicate,
      `signal.ts` `.get('/')`, is two distinct routers — not dead.)
</content>
