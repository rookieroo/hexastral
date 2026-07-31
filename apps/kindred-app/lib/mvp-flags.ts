/**
 * Yuel MVP feature flags — flip when Phase 2 (Kindred Pro living layer) ships.
 *
 * MVP monetization: one-time `hexastral_compatibility` on the chapter unlock wall.
 * Subscription surfaces (timeline / what-if / bond chat / Pro paywall CTAs) stay
 * hidden or soft-degraded until this is true.
 */

/** Timeline + What-if + bond Chat + subscription upsell CTAs. */
export const MVP_LIVING_LAYER_ENABLED = false
