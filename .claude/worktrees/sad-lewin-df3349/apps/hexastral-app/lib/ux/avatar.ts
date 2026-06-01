/**
 * Deterministic avatar assignment.
 * DJB2 hash maps a userId string to one of AVATAR_COUNT designs — stable,
 * never requiring server state.
 */

export const AVATAR_COUNT = 8

/** DJB2 hash — maps a string to a stable non-negative integer. */
function djb2(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 33) ^ str.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * Returns a stable avatar design index (0–4) for a given userId.
 * The same userId always maps to the same avatar.
 */
export function getAvatarIndex(userId: string): number {
  return djb2(userId) % AVATAR_COUNT
}
