/**
 * Resolve a bond's display name.
 *
 * Two jobs, one place so the home / threads list / detail never diverge:
 *   1. Fall back gracefully when there's no specific name — use the relationship
 *      label (e.g. "Partner") rather than a blank row.
 *   2. Treat the legacy literal "Unknown" as missing. Mirror bonds created before
 *      the 2026-06 server fix (`bonds.ts` used `inviter.name ?? 'Unknown'`) stored
 *      the literal string "Unknown" as `targetName`; new bonds fall back to the
 *      relationship label server-side, but old rows still carry it. Stripping it
 *      here fixes existing data with no migration.
 *
 * `relTag` is the relationship shown as a secondary tag, omitted when it would
 * just repeat the name (avoids "Partner · Partner").
 */

const LEGACY_UNKNOWN = 'Unknown'

interface BondNameInput {
  targetName?: string | null
  targetUser?: { name: string | null } | null
  relationshipLabel: string
}

export function resolveBondDisplayName(bond: BondNameInput): {
  displayName: string
  relTag: string | null
} {
  const raw = (bond.targetName || bond.targetUser?.name || '').trim()
  const name = raw && raw !== LEGACY_UNKNOWN ? raw : ''
  const displayName = name || bond.relationshipLabel
  const relTag = name && bond.relationshipLabel !== name ? bond.relationshipLabel : null
  return { displayName, relTag }
}
