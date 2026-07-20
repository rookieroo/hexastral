/**
 * Opt-in iCloud Documents sync for reading photo snapshots (Phase 2 hook).
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

/** No-op until iCloud Documents entitlement ships. Call sites stay wired. */
export async function syncReadingPhotosToICloudIfEnabled(): Promise<void> {
  const enabled = await getIcloudPhotoSyncEnabled()
  if (!enabled) return
  // Phase 2: push reading-photos-index + folders to ubiquity container.
}
