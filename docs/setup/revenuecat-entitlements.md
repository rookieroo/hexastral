# RevenueCat + App Store Connect — Entitlement Setup

> Operational walkthrough for the live entitlement schema. **Source of truth for
> every product/entitlement string is
> [apps/hexastral-api/src/config/products.ts](../../apps/hexastral-api/src/config/products.ts)** —
> if this doc ever disagrees with that file, the file wins.
> Webhook handler: [apps/hexastral-api/src/routes/webhook.ts](../../apps/hexastral-api/src/routes/webhook.ts).
> Dashboard steps are **human-only** — see the launch checklist in
> [docs/publish/README.md](../publish/README.md) §3.
>
> **Reconciled 2026-06-25.** This doc previously listed `feng_pro` / `hexastral_pro`
> entitlements and standalone `feng_pro_*` / `hexastral_pro_*` subscription products.
> Those names are **defunct** — they never existed in the live catalog. The real
> per-app entitlements are `kindred_pro` (Yuel) and `auspice_pro` (Yuun); `fate_pro`
> is universe-only (no standalone product); `universe_pro` is **deferred to Phase 2**.
> See §1 and §7.

---

## 0. Vocabulary

| Term | Where it lives | What it is |
|---|---|---|
| **Entitlement** | RevenueCat | A capability flag, e.g. `kindred_pro`. Apps check `entitlements.active[key]`. |
| **Product / SKU** | App Store Connect + Google Play | A purchasable thing, e.g. `kindred_pro_monthly`. |
| **Offering / Package** | RevenueCat | A bundle of products presented to the user (Monthly + Annual). |

One product can grant multiple entitlements — e.g. `universe_pro_*` grants
`kindred_pro` + `auspice_pro` + `fate_pro` + `universe_pro` (Phase 2; see §7).

---

## 1. Entitlements

The catalog defines four entitlement keys
([`EntitlementKey` in products.ts](../../apps/hexastral-api/src/config/products.ts)):

| Key | Unlocks | Sold at MVP? |
|---|---|---|
| `kindred_pro` | Yuel Pro: relationship timeline, deep synastry, BaZi-pair LLM, unlimited AI chat, full personal 命书 | **Yes** |
| `auspice_pro` | Yuun Pro: BaZi life timeline & what-if, personal BaZi/ZiWei deep-read, family unlimited, 农历 birthday push, full 黄历, widgets ×3, Apple Watch, cross-device sync | **Yes** |
| `fate_pro` | Pro experience inside the `fate` funnel app (all chapters + daily LLM) | **No** — universe-only, no standalone product (fate is a funnel app) |
| `universe_pro` | Cross-app bundle: implies all per-app Pros + every satellite's Pro | **No** — deferred to Phase 2 (§7) |

Naming convention: lowercase, snake_case, suffix `_pro`. **Do not rename** — these
strings are the contract between RevenueCat ⇄ webhook ⇄ `useEntitlements()` ⇄ feature
gates. (The RevenueCat entitlement Identifier for Yuel **must be exactly `kindred_pro`**;
the client was reconciled away from the old `hexastral_kindred_pro`.)

### MVP: create only these two

Per the launch-scope decision (2026-06), create **`kindred_pro`** and **`auspice_pro`**
only. Do **not** create `universe_pro` (or any `universe_pro_*` product / `universe_default`
offering) at MVP — cross-app value is ~nil with two apps live and it enlarges the review
surface. The paywalls already cannot surface universe, so no code change is needed to defer it.

---

## 2. Subscription products (MVP)

Create these in App Store Connect, then register the same IDs in RevenueCat:

| Product ID | App | Plan | Grants | Price (confirm in ASC) |
|---|---|---|---|---|
| `kindred_pro_monthly` | Yuel | Monthly | `kindred_pro` | $7.99/mo (founder-agreed) |
| `kindred_pro_annual` | Yuel | Annual | `kindred_pro` | $47.99/yr (founder-agreed) |
| `auspice_pro_monthly` | Yuun | Monthly | `auspice_pro` | $4.99/mo (per aso-metadata; confirm) |
| `auspice_pro_annual` | Yuun | Annual | `auspice_pro` | $39.99/yr (per aso-metadata; confirm) |

Plus Yuel's **one-time 合盘 unlock** (not a subscription):

| Product ID | App | Type | Grants | Price |
|---|---|---|---|---|
| `hexastral_compatibility` | Yuel | Consumable (server-applied, per-bond) | — (the API marks the specific bond unlocked) | $6.99 |

> The `hexastral_compatibility` product is a `single_purchase` (singleSku
> `compatibility`) in products.ts; the webhook's `NON_RENEWING_PURCHASE` path applies
> it to the bond the user was unlocking. It grants no entitlement flag — access is
> per-bond, server-side.

**Phase 2 (do NOT create at MVP):** `universe_pro_monthly` / `universe_pro_annual`,
which grant `kindred_pro` + `auspice_pro` + `fate_pro` + `universe_pro`.

**Other products already in the catalog** (legacy / other apps — unrelated to the Yuel +
Yuun launch; leave as-is): `coincast_pro_monthly`/`_annual`, the consumables
(`hexastral_chat_5`, `hexastral_cast_3`, `coincast_cast_pack_{1,5,10}`, `faceoracle_reading`,
`dream_pack_10`, `numerology_pack_10`), and the single-purchase SKUs
(`hexastral_cast_single`, `hexastral_fate_reading`, `hexastral_feng_single`).

Founder-agreed pricing is the binding number where given; Yuun monthly/annual mirror the
prices advertised in [apps/auspice-app/aso-metadata.json](../../apps/auspice-app/aso-metadata.json)
— reconcile the ASC tier against the store copy before submit.

---

## 3. App Store Connect — create the products

> Path: **My Apps → (the app) → Monetization → Subscriptions / In-App Purchases**

1. **Subscription Group**
   - Create one group, `hexastral_universe`, and put all subscription products in it so
     users can move between plans with prorated billing. (The one-time
     `hexastral_compatibility` is an In-App Purchase, not part of the group.)

2. **Add each product**
   - **Reference Name**: same as Product ID (e.g. `kindred_pro_monthly`).
   - **Product ID**: the exact ID from §2 (App Store scopes it under the bundle ID).
   - **Duration**: 1 Month or 1 Year (subscriptions); the compatibility unlock is a
     Consumable.
   - **Pricing**: enter the price; review Apple's auto-generated territory pricing.

3. **Localizations** (ship locales: en, zh-Hans, zh-Hant, ja)
   - **Display Name**: e.g. "Yuel Pro (Monthly)".
   - **Description**: 1–2 sentences on what the user gets.

4. **App Store Promotion** (optional): 1024×1024 image; enable to surface the product in
   search before launch.

5. **Status**: starts **Ready to Submit** once one localization is complete; activates on
   App Review or a sandbox purchase. Products tied to an in-review version can sit in
   "Waiting for Review" — fine for sandbox testing.

Repeat under Google Play **Monetize → Products** only if you ship Android.

---

## 4. RevenueCat — entitlements, products, offerings

### 4.1 Create the entitlements (MVP)

> Path: **Project → Entitlements → + New entitlement**

| Identifier (exact) | Display name |
|---|---|
| `kindred_pro` | Yuel Pro |
| `auspice_pro` | Yuun Pro |

(Identifier must match the string exactly — no spaces.) Defer `universe_pro` /
`fate_pro` to Phase 2.

### 4.2 Register the products

> Path: **Project → Products → + New product**

Register `kindred_pro_monthly`, `kindred_pro_annual`, `auspice_pro_monthly`,
`auspice_pro_annual` as **Auto-renewable subscription**, and `hexastral_compatibility` as
a **Consumable** (Store: App Store; add Google Play if shipping Android). Use the exact
IDs from §2.

### 4.3 Attach products to entitlements

> Path: **Project → Entitlements → (entitlement) → Attached products**

| Entitlement | Attached products (MVP) |
|---|---|
| `kindred_pro` | `kindred_pro_monthly`, `kindred_pro_annual` |
| `auspice_pro` | `auspice_pro_monthly`, `auspice_pro_annual` |

When `universe_pro` ships (Phase 2), also attach `universe_pro_monthly` / `_annual` to
**both** of the above (and create the `universe_pro` entitlement attached to the
universe products), so client-side `useEntitlements()` reflects the union without a
server roundtrip. `hexastral_compatibility` attaches to **no** entitlement — it is
applied per-bond by the webhook.

### 4.4 Create offerings

> Path: **Project → Offerings**

Create two offerings at MVP and set each as the app's *current* offering:

- `yuan_default` (Yuel) — packages: `monthly` = `kindred_pro_monthly`, `annual` = `kindred_pro_annual`
- `auspice_default` (Yuun) — packages: `monthly` = `auspice_pro_monthly`, `annual` = `auspice_pro_annual`

The Yuel paywall reads only `offerings.current.monthly` / `.annual`; the Yuun paywall
references `auspice_pro_*` directly. Neither surfaces universe — keep it that way.
(`universe_default` is Phase 2; do not create it at MVP.)

### 4.5 Webhook

> Path: **Project → Integrations → Webhooks**

- **URL**: `https://api.hexastral.com/webhooks/revenuecat`
- **Authorization header**: `Bearer <secret>` — same value as the Worker's
  `REVENUECAT_WEBHOOK_SECRET` (set via `wrangler secret put` in `apps/hexastral-api`).
- **Events**: at minimum `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`,
  `NON_RENEWING_PURCHASE` (the last carries the `hexastral_compatibility` unlock). All
  are already handled.

If you rotate the secret:
```bash
cd apps/hexastral-api
wrangler secret put REVENUECAT_WEBHOOK_SECRET
# then paste the new value into the RevenueCat Authorization header
```

---

## 5. App-side SDK keys

In **RevenueCat → Project Settings → API keys**, copy the **public SDK keys** (`appl_`
iOS, `goog_` Android, `test_` sandbox). Each app reads them from EAS env vars wired into
`app.config.js` `extra` (see [docs/publish/README.md](../publish/README.md) §6):

```js
extra: {
  REVENUECAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  REVENUECAT_ANDROID_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
}
```

The purchase hook detects `REPLACE_*` placeholder keys and **skips** `Purchases.configure`
so a dev build doesn't crash — but IAP is dead until real keys are in. Use `test_*` keys
for sandbox builds.

---

## 6. Sandbox testing checklist

1. Create a sandbox tester: App Store Connect → **Users and Access → Sandbox Testers**.
2. Sign out of the App Store on the device → install the dev build → sign in with the
   sandbox tester at the **first paywall prompt** (not in Settings).
3. Purchase `kindred_pro_monthly` → verify:
   - RevenueCat → **Customers** shows the user with active `kindred_pro`.
   - `POST /webhooks/revenuecat` returns `200` with the activation action and
     `entitlements: ['kindred_pro']`.
   - D1: `SELECT * FROM user_entitlements WHERE user_id = '<rcAppUserId>' AND entitlement_key = 'kindred_pro'` returns one row with `expires_at` populated.
   - App: re-launch → `useEntitlements().kindred_pro.active === true`.
4. Purchase `auspice_pro_monthly` in Yuun → verify the `auspice_pro` entitlement appears
   the same way.
5. Purchase `hexastral_compatibility` on a bond → verify `NON_RENEWING_PURCHASE` arrives
   and that specific bond reads as unlocked (no entitlement row; per-bond server state).
6. Cancel from device Settings → verify the cancellation action and that `expires_at` is
   unchanged (access continues until period end).
7. Wait for sandbox expiry (~5 min monthly) → verify the expiration action and
   `expires_at` updated.

---

## 7. Phase 2 / when you add a product later

**Universe Pro (deferred):** when 3+ apps are live, create `universe_pro_monthly` /
`_annual` (granting `kindred_pro` + `auspice_pro` + `fate_pro` + `universe_pro`), the
`universe_pro` entitlement, and a `universe_default` offering; then per §4.3 attach the
universe products to each per-app entitlement. No app-side code change is required — the
plumbing already exists; only the dashboard objects are missing by design.

**Any new product:**
1. Add the entry to [`products.ts`](../../apps/hexastral-api/src/config/products.ts) and
   declare the entitlements it grants.
2. Create it in App Store Connect (and Google Play if applicable).
3. Register it in RevenueCat → attach to the relevant entitlements.
4. Deploy the API (`cd apps/hexastral-api && bun deploy`).
5. No app-side change needed if it grants existing entitlements.

**A new entitlement key** also requires:
6. Add the key to `EntitlementKey` in [`products.ts`](../../apps/hexastral-api/src/config/products.ts).
7. Add the key to the `EntitlementsState` default in
   [`packages/satellite-runtime/src/entitlements/use-entitlements.ts`](../../packages/satellite-runtime/src/entitlements/use-entitlements.ts).
8. Update §1 + §4.3 of this doc.
