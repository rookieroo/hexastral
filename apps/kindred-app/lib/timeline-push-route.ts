/**
 * Open-redirect allowlist for Kindred timeline / bond push tap routing.
 * Pure module — safe to unit-test without loading react-native.
 */

const ALLOWED_ROUTE_PREFIXES = ['/(bonds)/', '/(timeline)', '/bonds/', '/timeline'] as const

export function isKindredPushRouteAllowed(route: string): boolean {
  const r = route.trim()
  if (!r.startsWith('/')) return false
  return ALLOWED_ROUTE_PREFIXES.some((p) => r === p || r.startsWith(p))
}
