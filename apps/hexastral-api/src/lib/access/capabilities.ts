/**
 * Capability resolver — the single entitlement-driven gating engine (ADR-0013).
 *
 * A "capability" is one app's paid surface. Subscription apps (fate/yuan/cycle)
 * are unlocked by their entitlement (or universe_pro); episodic apps
 * (feng/face/coincast/dream/numerology) are credit/one-shot gated and have NO
 * per-app subscription entitlement — unlimited chat on those comes only via
 * universe_pro. All gating goes through here (entitlement-driven).
 *
 * Pure (no DB) so it is exhaustively unit-testable; callers pass the active
 * entitlement key set (services/entitlements.getActiveEntitlements).
 */

import type { EntitlementKey } from '../../config/products'
import type { ChatTier, ReadingType } from '../reading-context-builder'

export type Capability =
  | 'fate'
  | 'kindred'
  | 'auspice'
  | 'feng'
  | 'face'
  | 'coincast'
  | 'dream'
  | 'numerology'

/**
 * Subscription apps → the entitlement that unlocks them (and their unlimited chat).
 * Episodic apps (feng/face/coincast/dream/numerology) are absent: per-use gated, with
 * unlimited chat available only through universe_pro (no per-app sub — ADR-0013 §2).
 */
const SUBSCRIPTION_ENTITLEMENT: Partial<Record<Capability, EntitlementKey>> = {
  fate: 'fate_pro',
  kindred: 'kindred_pro',
  auspice: 'auspice_pro',
}

/**
 * The product to offer when an unentitled user hits a paywall for a capability.
 * Subs + feng + coincast already exist in products.ts; face/dream/numerology
 * packs are ADR-0012 targets created in P2 (the ID is informational for the
 * client until then).
 */
const CAPABILITY_UPSELL: Record<Capability, string> = {
  // fate is a funnel app with no standalone subscription — paywall offers
  // Universe-Pro (the only sub that grants the fate_pro entitlement). The
  // SatelliteFlagshipUpsellCard separately routes free fate users to cycle/yuan
  // App Store pages; this is the in-context paywall product id.
  fate: 'universe_pro_monthly',
  kindred: 'kindred_pro_monthly',
  auspice: 'auspice_pro_monthly',
  feng: 'hexastral_feng_single',
  face: 'faceoracle_reading',
  coincast: 'coincast_cast_pack_10',
  dream: 'dream_pack_10',
  numerology: 'numerology_pack_10',
}

/**
 * Resolve which app/capability a chat or reading belongs to. The X-Target-App
 * header wins when it names a known app; otherwise the reading type decides
 * (natal/stellar/report = the 命 fate surface, pair = Kindred, yiching = 六爻, …).
 */
export function resolveCapability(readingType: ReadingType, targetApp?: string | null): Capability {
  switch (targetApp) {
    case 'kindred':
      return 'kindred'
    case 'feng':
      return 'feng'
    case 'auspice':
      return 'auspice'
    case 'fate':
      return 'fate'
    case 'faceoracle':
      return 'face'
    case 'coincast':
      return 'coincast'
    case 'dreamoracle':
      return 'dream'
    case 'numerology':
      return 'numerology'
  }
  switch (readingType) {
    case 'pair':
      return 'kindred'
    case 'feng':
      return 'feng'
    case 'cycle':
      return 'auspice'
    case 'physiognomy':
      return 'face'
    case 'yiching':
      return 'coincast'
    default:
      // natal | stellar | report → the 命 fate surface
      return 'fate'
  }
}

/** True iff the entitlement set unlocks `capability` as a subscription (universe unlocks all). */
export function hasCapability(
  entitlements: readonly EntitlementKey[],
  capability: Capability
): boolean {
  if (entitlements.includes('universe_pro')) return true
  const required = SUBSCRIPTION_ENTITLEMENT[capability]
  return required ? entitlements.includes(required) : false
}

/** The product to offer at a paywall for `capability` (subscription or episodic pack). */
export function upsellProductFor(capability: Capability): string {
  return CAPABILITY_UPSELL[capability]
}

export interface ChatAccess {
  /** free = taste (limited L1 messages) · pro = subscription · universe = cross-app */
  tier: ChatTier
  capability: Capability
  /** Product to offer at the paywall when the free-taste budget is exhausted. */
  upsellProductId: string
}

/**
 * Resolve the chat tier for a reading. universe_pro → cross-app; the matching
 * subscription entitlement → pro; otherwise the free-taste tier (the per-reading
 * message cap is enforced by the caller).
 */
export function resolveChatTier(input: {
  entitlements: readonly EntitlementKey[]
  readingType: ReadingType
  targetApp?: string | null
}): ChatAccess {
  const { entitlements, readingType, targetApp } = input
  const capability = resolveCapability(readingType, targetApp)
  const upsellProductId = CAPABILITY_UPSELL[capability]

  if (entitlements.includes('universe_pro')) {
    return { tier: 'universe', capability, upsellProductId }
  }

  const required = SUBSCRIPTION_ENTITLEMENT[capability]
  if (required && entitlements.includes(required)) {
    return { tier: 'pro', capability, upsellProductId }
  }
  return { tier: 'free', capability, upsellProductId }
}

/** Per-reading free-taste message cap (ADR-0012: ~3 messages, then paywall). */
export const FREE_TASTE_MESSAGES_PER_READING = 3
