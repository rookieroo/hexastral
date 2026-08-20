/**
 * Opt-in iCloud Documents sync preference for sealed reading photo snapshots.
 * Default off — user must enable in settings before any ubiquity write.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'xingqi_icloud_photo_sync_v1'

export async function getIcloudPhotoSyncEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1'
  } catch {
    return false
  }
}

export async function setIcloudPhotoSyncEnabled(on: boolean): Promise<void> {
  try {
    if (on) await AsyncStorage.setItem(KEY, '1')
    else await AsyncStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/** @deprecated Prefer `@/lib/icloud-sync` — kept so older imports keep resolving. */
export async function syncReadingPhotosToICloudIfEnabled(): Promise<void> {
  const { syncReadingPhotosToICloudIfEnabled: sync } = await import('./icloud-sync')
  await sync()
}
