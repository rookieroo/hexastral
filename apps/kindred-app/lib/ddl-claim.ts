/**
 * Pure DDL-claim parsing — kept free of react-native imports so it is unit
 * testable under bun-test (the rest of ./ddl.ts is device I/O: AsyncStorage,
 * Dimensions, expo-linking, network).
 */

import type { DDLSession } from '@zhop/ddl-client'

/** The intent we restore after a cold install: resume B's pending invite. */
export interface KindredAcceptClaim {
  /** The resonate/invite token → routes to /accept/[token]. */
  token: string
  inviterName?: string
}

/** Pull a kindred-accept claim out of a resolved DDL session, or null. */
export function extractAcceptClaim(
  session: DDLSession | null | undefined
): KindredAcceptClaim | null {
  const payload = session?.meta?.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const p = payload as Record<string, unknown>
  if (p.kind !== 'kindred-accept' || typeof p.token !== 'string' || p.token.length === 0)
    return null
  return {
    token: p.token,
    inviterName: typeof p.inviterName === 'string' ? p.inviterName : undefined,
  }
}
