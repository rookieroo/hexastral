/**
 * expo-router system-path rewriter — maps incoming external deep-link paths to
 * the in-app route tree (the route groups in parens aren't part of the public
 * URL, so a bare `kindred://reading?...` would otherwise 404).
 *
 *   kindred://reading?date=...&time=...&gender=...  →  /(reading)/full?<same query>
 *
 * The full personal 命书 now lives in-app at (reading)/full (Yuel/Yuun split,
 * Phase 1). A peer app (or a legacy Yuun hand-off) opens the user's own report
 * via the `reading` host; we rewrite it to the grouped route, preserving the
 * query string so (reading)/full's useLocalSearchParams seeds saveSelfBirth when
 * no self birth is set yet. All other paths pass through untouched.
 */

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // `path` arrives as a normalized in-app path with the scheme/host already
    // resolved to a leading segment (e.g. "/reading?date=...") — match the
    // `reading` segment regardless of a leading slash, keep the query string.
    const qIndex = path.indexOf('?')
    const rawPath = qIndex === -1 ? path : path.slice(0, qIndex)
    const query = qIndex === -1 ? '' : path.slice(qIndex + 1)
    const segment = rawPath.replace(/^\/+/, '')
    if (segment === 'reading') {
      return query ? `/(reading)/full?${query}` : '/(reading)/full'
    }
  } catch {
    // Fall through to the original path on any parse failure.
  }
  return path
}
