/**
 * RevenueCat product catalog — single source of truth for IAP products ↔ entitlements.
 *
 * Adding a new product? Update this file, then mirror in App Store Connect +
 * RevenueCat dashboard per docs/setup/revenuecat-entitlements.md §7.
 */

export type EntitlementKey = 'yuan_pro' | 'cycle_pro' | 'fate_pro' | 'universe_pro'
// NOTE: fate is a funnel app — no standalone fate_pro subscription. The
// `fate_pro` entitlement is universe_pro-only (Universe-Pro users get the Pro
// experience inside fate, e.g. all chapters unlocked + daily LLM insights).
// NOTE: feng/face are per-use only (ADR-0013 §2 / plan §8) — no standalone sub
// entitlement. Unlimited chat/readings on those come via universe_pro.
export type FlagshipKey = 'yuan' | 'feng' | 'hexastral'
export type SubscriptionPlan = 'monthly' | 'annual'

export type ProductKind = 'subscription' | 'consumable' | 'single_purchase'

/**
 * Per-use credit buckets for the episodic apps (ADR-0013 §4). Stored in the
 * `user_credits` ledger; spent by the episodic reading gates. `feng` is
 * allowance-only (feng one-shots stay in `single_purchases`); the rest also
 * sell as purchasable packs.
 */
export type CreditType = 'feng' | 'face' | 'coincast' | 'dream' | 'numerology'

export interface SubscriptionProduct {
  productId: string
  kind: 'subscription'
  plan: SubscriptionPlan
  grantsEntitlements: readonly EntitlementKey[]
}

export interface ConsumableProduct {
  productId: string
  kind: 'consumable'
  /**
   * `kind` routes the webhook top-up. `chat`/`divination`/`coincast_cast` are
   * legacy `users.*_credits_remaining` columns; `face`/`dream`/`numerology` are
   * ledger-backed (see `ledgerCreditTypeForConsumable`).
   */
  consumable: {
    kind: 'chat' | 'cast' | 'coincast_cast' | 'face' | 'dream' | 'numerology'
    credits: number
  }
}

export interface SinglePurchaseProduct {
  productId: string
  kind: 'single_purchase'
  singleSku: 'cast' | 'fate_reading' | 'compatibility' | 'feng_analysis'
}

export type ProductSpec = SubscriptionProduct | ConsumableProduct | SinglePurchaseProduct

export const ALL_ENTITLEMENT_KEYS: readonly EntitlementKey[] = [
  'yuan_pro',
  'cycle_pro',
  'fate_pro',
  'universe_pro',
] as const

export const PRODUCTS: readonly ProductSpec[] = [
  // ── Flagship subscriptions ─────────────────────────────────────────────
  {
    productId: 'yuan_pro_monthly',
    kind: 'subscription',
    plan: 'monthly',
    grantsEntitlements: ['yuan_pro'],
  },
  {
    productId: 'yuan_pro_annual',
    kind: 'subscription',
    plan: 'annual',
    grantsEntitlements: ['yuan_pro'],
  },
  // ── Recurring-satellite subscriptions (revised tier hierarchy) ─────────
  // Subscription flagships: cycle (daily 黄历) + yuan (compatibility).
  // fate was originally planned as a sub flagship (see ADR-0012) but moved to
  // funnel tier — its monetization is invite-unlock + Ecosystem upsell to
  // cycle/yuan. No standalone fate_pro subscription product.
  {
    productId: 'cycle_pro_monthly',
    kind: 'subscription',
    plan: 'monthly',
    grantsEntitlements: ['cycle_pro'],
  },
  {
    productId: 'cycle_pro_annual',
    kind: 'subscription',
    plan: 'annual',
    grantsEntitlements: ['cycle_pro'],
  },

  {
    productId: 'universe_pro_monthly',
    kind: 'subscription',
    plan: 'monthly',
    grantsEntitlements: ['yuan_pro', 'cycle_pro', 'fate_pro', 'universe_pro'],
  },
  {
    productId: 'universe_pro_annual',
    kind: 'subscription',
    plan: 'annual',
    grantsEntitlements: ['yuan_pro', 'cycle_pro', 'fate_pro', 'universe_pro'],
  },

  // ── Legacy satellite subscription (CoinCast Pro — funnels to HexAstral) ─
  // Kept separate from the new entitlement model: still writes the legacy
  // `users.coincast_pro_expires_at` column to avoid breaking existing CoinCast
  // gating. Grant a real entitlement only after CoinCast UI migrates to
  // `useEntitlements()`.
  {
    productId: 'coincast_pro_monthly',
    kind: 'subscription',
    plan: 'monthly',
    grantsEntitlements: [],
  },
  {
    productId: 'coincast_pro_annual',
    kind: 'subscription',
    plan: 'annual',
    grantsEntitlements: [],
  },

  // ── Consumables ────────────────────────────────────────────────────────
  {
    productId: 'hexastral_chat_5',
    kind: 'consumable',
    consumable: { kind: 'chat', credits: 5 },
  },
  {
    productId: 'hexastral_cast_3',
    kind: 'consumable',
    consumable: { kind: 'cast', credits: 3 },
  },
  {
    productId: 'coincast_cast_pack_10',
    kind: 'consumable',
    consumable: { kind: 'coincast_cast', credits: 10 },
  },
  // ADR-0012/0013: ledger-backed episodic packs. Face flips sub→consumable
  // (per-reading); dream/numerology are low-band packs.
  {
    productId: 'faceoracle_reading',
    kind: 'consumable',
    consumable: { kind: 'face', credits: 1 },
  },
  {
    productId: 'dream_pack_10',
    kind: 'consumable',
    consumable: { kind: 'dream', credits: 10 },
  },
  {
    productId: 'numerology_pack_10',
    kind: 'consumable',
    consumable: { kind: 'numerology', credits: 10 },
  },

  // ── Single purchases ───────────────────────────────────────────────────
  {
    productId: 'hexastral_cast_single',
    kind: 'single_purchase',
    singleSku: 'cast',
  },
  {
    productId: 'hexastral_fate_reading',
    kind: 'single_purchase',
    singleSku: 'fate_reading',
  },
  {
    productId: 'hexastral_compatibility',
    kind: 'single_purchase',
    singleSku: 'compatibility',
  },
  // ADR-0012: Fēng one-shot site analysis. The 'feng_analysis' SKU is already
  // wired in access-check.ts (SKU_IAP_META → hexastral_feng_single, $4.99) and the
  // single_purchases sku_id enum — this registers the product so the webhook accepts it.
  {
    productId: 'hexastral_feng_single',
    kind: 'single_purchase',
    singleSku: 'feng_analysis',
  },
] as const

const BY_ID: ReadonlyMap<string, ProductSpec> = new Map(PRODUCTS.map((p) => [p.productId, p]))

export function getProduct(productId: string): ProductSpec | undefined {
  return BY_ID.get(productId)
}

export function isSubscriptionProduct(p: ProductSpec): p is SubscriptionProduct {
  return p.kind === 'subscription'
}

export function isConsumableProduct(p: ProductSpec): p is ConsumableProduct {
  return p.kind === 'consumable'
}

export function isSinglePurchaseProduct(p: ProductSpec): p is SinglePurchaseProduct {
  return p.kind === 'single_purchase'
}

/** Legacy: CoinCast Pro writes its own `coincast_pro_expires_at` column. */
export const COINCAST_PRO_PRODUCT_IDS: ReadonlySet<string> = new Set([
  'coincast_pro_monthly',
  'coincast_pro_annual',
])

/**
 * Consumable `kind` → ledger `CreditType` for the ledger-backed packs. Legacy
 * column-backed kinds (`chat`/`divination`/`coincast_cast`) return null and keep
 * topping up `users.*_credits_remaining` until they migrate.
 */
export function ledgerCreditTypeForConsumable(
  kind: ConsumableProduct['consumable']['kind']
): CreditType | null {
  return kind === 'face' || kind === 'dream' || kind === 'numerology' ? kind : null
}

/**
 * universe_pro monthly consumable allowance (ADR-0012 §4) — granted into the
 * `allowance` source of `user_credits` each period, capped so COGS ≪ price.
 * Illustrative; tune with market data. feng = 1 site-audit/period.
 */
export const UNIVERSE_MONTHLY_ALLOWANCE: Record<CreditType, number> = {
  feng: 1,
  face: 5,
  coincast: 10,
  dream: 10,
  numerology: 10,
}

/**
 * Per-entitlement monthly reading allowance, granted into the `allowance` source of
 * `user_credits` on subscription activation/renewal and zeroed on expiration
 * (use-it-or-lose-it). The webhook merges these across all entitlements a product
 * grants (max per type). Only universe_pro carries an allowance today — episodic apps
 * are per-use only and have no standalone sub (ADR-0013 §2); the map stays keyed by
 * entitlement so a future allowance-bearing sub is a one-line add.
 */
export const ENTITLEMENT_MONTHLY_ALLOWANCE: Partial<
  Record<EntitlementKey, Partial<Record<CreditType, number>>>
> = {
  universe_pro: UNIVERSE_MONTHLY_ALLOWANCE,
}
