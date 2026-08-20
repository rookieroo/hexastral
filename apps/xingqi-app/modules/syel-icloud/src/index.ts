import { Platform } from 'react-native'

type SyelIcloudNative = {
  isIcloudAvailable: () => Promise<boolean>
  getUbiquityDocumentsPath: () => Promise<string | null>
}

function loadNative(): SyelIcloudNative | null {
  if (Platform.OS !== 'ios') return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: <T>(name: string) => T
    }
    return requireNativeModule<SyelIcloudNative>('SyelIcloud')
  } catch {
    return null
  }
}

/** True when the native ubiquity bridge is linked (dev client / release, not Expo Go). */
export function isSyelIcloudBridgeAvailable(): boolean {
  return loadNative() !== null
}

export async function isIcloudAccountAvailable(): Promise<boolean> {
  const native = loadNative()
  if (!native) return false
  try {
    return await native.isIcloudAvailable()
  } catch {
    return false
  }
}

/** Absolute filesystem path to the container Documents directory, or null. */
export async function getUbiquityDocumentsPath(): Promise<string | null> {
  const native = loadNative()
  if (!native) return null
  try {
    const path = await native.getUbiquityDocumentsPath()
    if (!path || typeof path !== 'string') return null
    return path.endsWith('/') ? path : `${path}/`
  } catch {
    return null
  }
}
