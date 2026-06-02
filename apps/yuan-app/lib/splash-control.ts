/**
 * Splash intent — whether the V15Moon splash plays on the bonds home.
 *
 * The splash is a cold-launch flourish for a returning user. It must NOT play
 * right after onboarding (the user should land on home directly), so the
 * onboarding exits call `suppressNextSplash()` before navigating home.
 *
 * Mirrors apps/ming-pan-app/lib/splash-control.ts.
 */

let played = false
let suppressOnce = false

/** Ask the next home mount to skip the splash (e.g. right after onboarding). */
export function suppressNextSplash(): void {
  suppressOnce = true
}

/**
 * Decide once, on home mount, whether to skip the splash. Skips if it already
 * ran this JS session or a one-shot suppression was requested. Records that
 * home has been shown so later remounts this session also skip.
 */
export function consumeSplashDecision(): boolean {
  const skip = played || suppressOnce
  played = true
  suppressOnce = false
  return skip
}
