/**
 * expo-router system-path rewriter — maps incoming external deep-link paths to
 * the in-app route tree (route groups in parens aren't part of the public URL).
 *
 *   yuel://reading?…                         →  /(reading)/full?…
 *   /resonate/{token}                         →  /accept/{token}
 *   https://yuel.hexastral.com/resonate/{tok} →  /accept/{token}
 *   yuel:///accept/{token}                    →  /accept/{token}
 */

/** Pure helper — unit-tested without loading react-native. */
export function rewriteKindredSystemPath(path: string): string {
  try {
    const qIndex = path.indexOf('?')
    const rawPath = qIndex === -1 ? path : path.slice(0, qIndex)
    const query = qIndex === -1 ? '' : path.slice(qIndex + 1)

    // Normalize: strip scheme, optional authority (host), Expo Go `--`, empties.
    // UL may arrive as "/resonate/x", "yuel://resonate/x", or a full https URL.
    let rest = rawPath.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    // After scheme strip, an https UL leaves "host/path…" — drop host when it
    // looks like a domain (contains a dot) before the first real path segment.
    if (/^[^/]+\.[^/]+/.test(rest)) {
      const slash = rest.indexOf('/')
      rest = slash === -1 ? '' : rest.slice(slash + 1)
    }
    rest = rest.replace(/^\/?--\//, '')
    const segments = rest.split('/').filter((s) => s.length > 0)
    const firstSegment = segments[0]

    if (firstSegment === 'reading') {
      return query ? `/(reading)/full?${query}` : '/(reading)/full'
    }

    if ((firstSegment === 'resonate' || firstSegment === 'accept') && segments[1]) {
      const token = encodeURIComponent(segments[1])
      return query ? `/accept/${token}?${query}` : `/accept/${token}`
    }
  } catch {
    // Fall through.
  }
  return path
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return rewriteKindredSystemPath(path)
}
