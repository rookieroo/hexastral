# RevenueCat + App Store Connect — Multi-Flagship Entitlement Setup

> Operational walkthrough for the **G.1.a** entitlement schema (Phase G).  
> Code mapping: [apps/hexastral-api/src/config/products.ts](../../apps/hexastral-api/src/config/products.ts).  
> Package boundaries (unrelated): [ADR-0005](../decisions/0005-package-boundaries.md).  
> **Dashboard steps are human-only** — [local-manual-checklist.md](../local-manual-checklist.md) §5.
>
> Outcome after following this doc: 4 entitlements + 8 IAP subscription products
> created and wired so that the existing `POST /webhooks/revenuecat` handler
> ([apps/hexastral-api/src/routes/webhook.ts](../../apps/hexastral-api/src/routes/webhook.ts))
> grants the right entitlement on purchase. The single source of truth for
> product ↔ entitlement mapping lives in
> [apps/hexastral-api/src/config/products.ts](../../apps/hexastral-api/src/config/products.ts) —
> keep this file in sync when you add or rename products.

---

## 0. Vocabulary

| Term | Where it lives | What it is |
|---|---|---|
| **Entitlement** | RevenueCat | A capability flag, e.g. `kindred_pro`. Apps check `entitlements.active[key]`. |
| **Product / SKU** | App Store Connect + Google Play | A purchasable thing, e.g. `kindred_pro_monthly`. |
| **Offering / Package** | RevenueCat | A bundle of products presented to the user (Monthly + Annual). |

One product can grant multiple entitlements (e.g., `universe_pro_*` grants `kindred_pro` + `feng_pro` + `hexastral_pro` + `universe_pro`).

---

## 1. The 4 entitlements

| Key | Unlocks |
|---|---|
| `kindred_pro` | Kindred flagship Pro features (deep synastry, BaZi pair LLM, annual forecast) |
| `feng_pro` | Fēng flagship Pro features (multi-photo synthesis, auspicious-date LLM, advanced compass overlays) |
| `hexastral_pro` | HexAstral flagship Pro (90-day Daily Signal history, deep ZiWei/BaZi, chat credits multiplier) |
| `universe_pro` | Implies all three flagships' Pro + every satellite's Pro tier |

Naming convention: lowercase, snake_case, suffix `_pro`. Don't rename — these strings are the contract between RevenueCat ⇄ webhook ⇄ `useEntitlements()` ⇄ feature gates.

---

## 2. The 8 subscription products

| Product ID | Plan | Grants |
|---|---|---|
| `kindred_pro_monthly` | Monthly | `kindred_pro` |
| `kindred_pro_annual` | Annual | `kindred_pro` |
| `feng_pro_monthly` | Monthly | `feng_pro` |
| `feng_pro_annual` | Annual | `feng_pro` |
| `hexastral_pro_monthly` | Monthly | `hexastral_pro` |
| `hexastral_pro_annual` | Annual | `hexastral_pro` |
| `universe_pro_monthly` | Monthly | `kindred_pro` + `feng_pro` + `hexastral_pro` + `universe_pro` |
| `universe_pro_annual` | Annual | (same) |

Legacy CoinCast products (`coincast_pro_monthly` / `_annual`) and consumables (`hexastral_chat_5`, `hexastral_divination_3`, `coincast_cast_pack_10`, single-reading SKUs) remain unchanged — they were already in production-ready state.

Pricing suggestion (sandbox first; revise after market test):

| Plan | Monthly | Annual |
|---|---:|---:|
| `kindred_pro` | $9.99 | $79.99 |
| `feng_pro` | $12.99 | $99.99 |
| `hexastral_pro` | $7.99 | $59.99 |
| `universe_pro` | $19.99 | $149.99 |

Higher anchor for Fēng reflects B2B / one-shot consult substitution. Universe Pro discount equals ~25% off the sum to drive cross-flagship upgrade.

---

## 3. App Store Connect — Create the 8 products

> Path: **My Apps → HexAstral → Monetization → Subscriptions**

For each of the 8 products:

1. **Subscription Group**
   - Create a single group named `hexastral_universe` if not already.
   - All 8 products go in this group so users can upgrade/downgrade between them with prorated billing.

2. **Add Subscription**
   - **Reference Name**: same as Product ID (e.g. `kindred_pro_monthly`).
   - **Product ID**: the exact ID from §2 (App Store will scope it under your bundle ID).
   - **Subscription Duration**: 1 Month or 1 Year.
   - **Subscription Pricing**: enter monthly or annual price. Apple will auto-generate territory pricing — review for tier consistency.

3. **Localizations** (minimum: en, zh-Hans, zh-Hant, ja, ko)
   - **Display Name**: e.g. "Kindred Pro Monthly"
   - **Description**: 1-2 sentences explaining what the user gets.

4. **App Store Promotion**
   - Upload a 1024×1024 image (can reuse flagship icon variant per product family).
   - Enable promotion if you want the product visible in search before app launch.

5. **Status**
   - Initial state: **Ready to Submit** — needs at least one localization complete.
   - Won't activate until App Review or sandbox tester purchase.

6. **Review**
   - Apple flags products tied to an in-review app version. If hexastral-api is live but the flagship apps are not yet submitted, products can sit in "Waiting for Review" indefinitely — that's fine for sandbox testing.

Repeat for Google Play Console under **Monetize → Products → Subscriptions** if you ship Android.

---

## 4. RevenueCat — Create entitlements and attach products

> Path: **Project → Entitlements**

### 4.1 Create the 4 entitlements

For each of `kindred_pro`, `feng_pro`, `hexastral_pro`, `universe_pro`:

1. Click **+ New entitlement**.
2. **Identifier**: lowercase entitlement key from §1 (no spaces, exact match).
3. **Display name**: human-readable, e.g. "Kindred Pro".
4. Save.

### 4.2 Register the 8 products

> Path: **Project → Products**

For each product ID from §2:

1. Click **+ New product**.
2. **Store**: App Store (and Google Play if applicable).
3. **Identifier**: exact Product ID from App Store Connect.
4. **Type**: Auto-renewable subscription.
5. Save.

### 4.3 Attach products to entitlements

> Path: **Project → Entitlements → click an entitlement → "Attached products"**

| Entitlement | Attached products |
|---|---|
| `kindred_pro` | `kindred_pro_monthly`, `kindred_pro_annual`, `universe_pro_monthly`, `universe_pro_annual` |
| `feng_pro` | `feng_pro_monthly`, `feng_pro_annual`, `universe_pro_monthly`, `universe_pro_annual` |
| `hexastral_pro` | `hexastral_pro_monthly`, `hexastral_pro_annual`, `universe_pro_monthly`, `universe_pro_annual` |
| `universe_pro` | `universe_pro_monthly`, `universe_pro_annual` |

Universe Pro intentionally attaches to all three vertical entitlements so client-side `useEntitlements()` reflects the union without server roundtrip.

### 4.4 Create offerings

> Path: **Project → Offerings**

Create 4 offerings, one per flagship-family CTA surface:

- `yuan_default` — packages: `monthly` (= `kindred_pro_monthly`), `annual` (= `kindred_pro_annual`)
- `feng_default` — packages: `feng_pro_monthly`, `feng_pro_annual`
- `hexastral_default` — packages: `hexastral_pro_monthly`, `hexastral_pro_annual`
- `universe_default` — packages: `universe_pro_monthly`, `universe_pro_annual`

The `SatellitePaywall` (and equivalent flagship paywalls) call `Purchases.getOfferings()` and pick the offering whose identifier matches the current funnel's `suggestedFlagship`.

### 4.5 Webhook URL

> Path: **Project → Integrations → Webhooks**

- **URL**: `https://api.hexastral.com/webhooks/revenuecat`
- **Authorization header**: `Bearer <secret>` — the same secret that `REVENUECAT_WEBHOOK_SECRET` in `apps/hexastral-api/.dev.vars` and Cloudflare secrets is set to.
- **Events to send**: at minimum `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `NON_RENEWING_PURCHASE`. (Already covered by the existing handler.)

If you rotate the secret:
```bash
cd apps/hexastral-api
wrangler secret put REVENUECAT_WEBHOOK_SECRET
# then paste the new value into RevenueCat Authorization header
```

---

## 5. App-side SDK keys

In **RevenueCat → Project Settings → API keys**, copy the **public SDK keys** (prefixed `appl_` for iOS, `goog_` for Android, `test_` for sandbox).

Each app (3 flagships + 5 satellites) needs these in its `app.config.js` `extra` block:

```js
extra: {
  REVENUECAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  REVENUECAT_ANDROID_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
}
```

[`packages/satellite-runtime/src/use-purchases.ts`](../../packages/satellite-runtime/src/use-purchases.ts) reads these and calls `Purchases.configure({ apiKey })`. Same hook also covers flagships once they call `usePurchases()` in `_layout.tsx`.

For local dev, put placeholder `test_xxx` keys in `.env`. The hook detects `REPLACE_*` placeholders and skips `Purchases.configure` to avoid a native crash on launch.

---

## 6. Sandbox testing checklist

1. Create a sandbox tester in App Store Connect → **Users and Access → Sandbox Testers**.
2. Sign out of the App Store on the device → install the dev build → sign in with the sandbox tester on the **first paywall prompt** (not in Settings).
3. Purchase `kindred_pro_monthly` → verify:
   - RevenueCat dashboard → **Customers** shows the user with active `kindred_pro` entitlement.
   - `POST /webhooks/revenuecat` returns `200` with `action: 'subscription_activated'` and `entitlements: ['kindred_pro']`.
   - D1: `SELECT * FROM user_entitlements WHERE user_id = '<rcAppUserId>' AND entitlement_key = 'kindred_pro'` returns one row with `expires_at` populated.
   - App: re-launch → `useEntitlements().kindred_pro.active === true`.
4. Purchase `universe_pro_annual` → verify all 4 entitlements appear in D1.
5. Cancel from device Settings → verify `subscription_cancelled` webhook action and `expires_at` unchanged (access continues until period end).
6. Wait for sandbox expiry (5 min for monthly, ~1 hour for annual) → verify `subscription_expired` and `expires_at` updated to `now()`.

---

## 7. When you add a 9th product later

1. Add the entry to [`apps/hexastral-api/src/config/products.ts`](../../apps/hexastral-api/src/config/products.ts) (and declare which entitlements it grants).
2. Create the product in App Store Connect (and Google Play if applicable).
3. Register the product in RevenueCat → attach to the relevant entitlements.
4. Deploy hexastral-api (`cd apps/hexastral-api && bun deploy`).
5. No app-side code changes needed if it grants existing entitlements.

If you're adding a **new entitlement key** (e.g. `bazi_pro` when you launch a BaZi flagship), also:

6. Add the key to `EntitlementKey` type in [`apps/hexastral-api/src/config/products.ts`](../../apps/hexastral-api/src/config/products.ts).
7. Add the key to `EntitlementsState` default in [`packages/satellite-runtime/src/entitlements/use-entitlements.ts`](../../packages/satellite-runtime/src/entitlements/use-entitlements.ts).
8. Update [`docs/setup/revenuecat-entitlements.md`](./revenuecat-entitlements.md) (this file) §1 + §4.3.
