/**
 * expo-router system-path rewriter — maps incoming external deep-link paths to
 * the in-app route tree.
 *
 *   https://www.hexastral.com/lp/hexagram/{readingId}      ┐
 *   https://www.hexastral.com/{locale}/lp/hexagram/{id}    ├─→  /detail?readingId={id}
 *   https://www.hexastral.com/tools/hexagram/{id}          ┘
 *
 * Those `/lp/hexagram/*`, `/lp/yiching/*`, `/tools/hexagram/*` paths are the
 * coincast entries in the web Apple-App-Site-Association, so iOS hands a tapped
 * link to this app; we rewrite to the detail sheet, which loads the reading by
 * id for its signed-in owner. The plain `coincast://detail?readingId=…` scheme
 * form already resolves via the route tree, so it passes through untouched.
 * All other paths pass through unchanged.
 */

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const segments = path
      .split('?')[0]
      .split('#')[0]
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '') // strip a leading URL scheme
      .split('/')
      .filter((s) => s.length > 0)
    const kindIdx = segments.findIndex((s) => s === 'hexagram' || s === 'yiching')
    const readingId = kindIdx >= 0 ? segments[kindIdx + 1] : undefined
    if (readingId) {
      return `/detail?readingId=${encodeURIComponent(readingId)}`
    }
  } catch {
    // Fall through to the original path on any parse failure.
  }
  return path
}
