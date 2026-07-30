/**
 * Maps portfolio / growth `target_app` keys → iOS bundle identifiers.
 * Used by Sign in with Apple JWT audience checks and token revocation.
 */

import { HTTPException } from 'hono/http-exception'

/** Client brand Syel (ADR-0028); opaque target_app stays `faceoracle`. */
export const TARGET_TO_BUNDLE_ID: Record<string, string> = {
  faceoracle: 'com.hexastral.syel',
  starpalace: 'com.hexastral.starpalace',
  soulmatch: 'com.hexastral.soulmatch',
  fengshui: 'com.hexastral.kanyu',
  dreamoracle: 'com.hexastral.dreamoracle',
  eightpillars: 'com.hexastral.eightpillars',
  coincast: 'com.hexastral.yaul',
  fate: 'com.hexastral.fate',
  auspice: 'com.hexastral.yuun',
}

export function audienceForTarget(targetApp: string): string {
  const bundleId = TARGET_TO_BUNDLE_ID[targetApp]
  if (!bundleId) {
    throw new HTTPException(422, { message: 'Unknown target_app' })
  }
  return bundleId
}
