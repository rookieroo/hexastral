/**
 * Unified on-device wipe for Syel — period drafts, sealed reading photos,
 * stamps, preferences that must not survive sign-out / consent revoke / delete.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import { setCachedBiometricConsent } from '@/lib/biometric-consent-cache'
import { clearAllHighlights } from '@/lib/highlights'
import { setIcloudPhotoSyncEnabled } from '@/lib/icloud-sync-preference'
import { clearReadingDraft } from '@/lib/reading-draft'
import { clearLastReadingPhotoSnapshot } from '@/lib/reading-photo-stamp'
import { clearAllReadingPhotos } from '@/lib/reading-photos'
import { setDeepNextReading } from '@/lib/reading-preference'

const EXTRA_KEYS = [
  'xingqi_reading_job_pending_v1',
  'xingqi_reading_job_id_v1',
  'xingqi_push_scheduled_v1',
  'xingqi_server_push_active_v1',
]

export type WipeLocalOpts = {
  /** Also clear biometric consent cache (default true). */
  clearConsentCache?: boolean
  /** Turn off iCloud photo sync preference (default true on full wipe). */
  clearIcloudPref?: boolean
  /** Wipe ubiquity mirror when native module is available (default true). */
  wipeIcloudMirror?: boolean
}

/**
 * Clear period sandbox + sealed snapshots + related AsyncStorage.
 * Does not call the server or RevenueCat.
 */
export async function wipeLocalSyelData(opts?: WipeLocalOpts): Promise<void> {
  const clearConsent = opts?.clearConsentCache !== false
  const clearIcloudPref = opts?.clearIcloudPref !== false
  const wipeIcloud = opts?.wipeIcloudMirror !== false

  await clearReadingDraft({ wipePhotos: true })
  await clearAllReadingPhotos()
  await clearLastReadingPhotoSnapshot()
  await clearAllHighlights()
  await setDeepNextReading(false)

  try {
    await AsyncStorage.multiRemove(EXTRA_KEYS)
  } catch {
    // ignore
  }

  if (clearConsent) {
    await setCachedBiometricConsent(false)
  }
  if (clearIcloudPref) {
    await setIcloudPhotoSyncEnabled(false)
  }
  if (wipeIcloud) {
    try {
      const { wipeIcloudReadingPhotos } = await import('@/lib/icloud-sync')
      await wipeIcloudReadingPhotos()
    } catch {
      // Native module may be absent in Expo Go / pre-prebuild.
    }
  }
}

/** Keep account; remove only on-device photo drafts + sealed snapshots. */
export async function clearLocalPhotosOnly(): Promise<void> {
  await clearReadingDraft({ wipePhotos: true })
  await clearAllReadingPhotos()
  await clearLastReadingPhotoSnapshot()
  try {
    const { getIcloudPhotoSyncEnabled } = await import('@/lib/icloud-sync-preference')
    const { wipeIcloudReadingPhotos } = await import('@/lib/icloud-sync')
    if (await getIcloudPhotoSyncEnabled()) await wipeIcloudReadingPhotos()
  } catch {
    // ignore
  }
}
