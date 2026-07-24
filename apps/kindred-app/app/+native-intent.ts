/**
 * expo-router system-path rewriter — maps incoming external deep-link paths to
 * the in-app route tree (the route groups in parens aren't part of the public
 * URL, so a bare `yuel://reading?...` would otherwise 404).
 *
 *   yuel://reading?date=...&time=...&gender=...  →  /(reading)/full?<same query>
 *
 * The full personal 命书 now lives in-app at (reading)/full (Yuel/Yuun split,
 * Phase 1). A peer app (or a legacy Yuun hand-off) opens the user's own report
 * via the `reading` host; we rewrite it to the grouped route, preserving the
 * query string so (reading)/full's useLocalSearchParams seeds saveSelfBirth when
 * no self birth is set yet. All other paths pass through untouched.
 */

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const qIndex = path.indexOf('?')
    const rawPath = qIndex === -1 ? path : path.slice(0, qIndex)
    const query = qIndex === -1 ? '' : path.slice(qIndex + 1)
    // `path` arrives in several shapes across dev / standalone / iOS cold-start:
    // "yuel://reading?…", "/reading?…", or an Expo Go "/--/reading?…". All of
    // them carry `reading` as the first REAL segment, so normalize before matching
    // (strip a leading scheme, the Expo Go `--` separator, and leading slashes).
    // This matters: if we don't rewrite, a bare "/reading" falls through to the
    // root dynamic route `(bonds)/[id]` (id="reading") and renders "Bond not
    // found" instead of the personal reading the Yuun hand-off intended.
    const firstSegment = rawPath
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '') // strip a leading URL scheme
      .replace(/^\/?--\//, '') // strip the Expo Go dev separator
      .split('/')
      .find((s) => s.length > 0)
    if (firstSegment === 'reading') {
      return query ? `/(reading)/full?${query}` : '/(reading)/full'
    }
  } catch {
    // Fall through to the original path on any parse failure.
  }
  return path
}
