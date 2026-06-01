import AsyncStorage from '@react-native-async-storage/async-storage'

import type { DDLSession } from '@zhop/ddl-client/types'

/** Last resolved DDL KV session snapshot (minus fingerprint) — for stubs / future routing. */
const META_KEY_SUFFIX = ':last_ddl_meta_json'

export function lastDdlMetaKey(storagePrefix: string): string {
  return `${storagePrefix}${META_KEY_SUFFIX}`
}

export async function storeLastResolvedDdlSession(
  storagePrefix: string,
  session: DDLSession | null | undefined
): Promise<void> {
  const raw = JSON.stringify(session?.meta ?? null)
  await AsyncStorage.setItem(lastDdlMetaKey(storagePrefix), raw)
}

export async function readLastResolvedDdlMeta(
  storagePrefix: string
): Promise<Record<string, unknown> | null> {
  const raw = await AsyncStorage.getItem(lastDdlMetaKey(storagePrefix))
  if (raw === null) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}
