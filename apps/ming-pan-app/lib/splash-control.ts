/**
 * Splash intent — controls whether the FLIP magic-move intro plays on the
 * home tab.
 *
 * The intro is a cold-launch flourish for a returning, already-onboarded user.
 * It must NOT play right after onboarding submit (the user should land on home
 * directly) — onboarding calls `suppressNextSplash()` before navigating.
 */

let played = false
let suppressOnce = false

/**
 * Request that the next home mount skip the intro (e.g. right after onboarding
 * submit). One-shot — consumed by the next `consumeSplashDecision()`.
 */
export function suppressNextSplash(): void {
  suppressOnce = true
}

/**
 * Decide (once, on home mount) whether to skip the splash. Skips if the splash
 * already ran this JS session, or a one-shot suppression was requested. Records
 * that home has now been shown so later remounts this session also skip.
 */
export function consumeSplashDecision(): boolean {
  const skip = played || suppressOnce
  played = true
  suppressOnce = false
  return skip
}
