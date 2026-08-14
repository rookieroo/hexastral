/**
 * Imperative write of the widget envelope to Android SharedPreferences,
 * then reload Glance home widgets.
 */

import { Platform } from 'react-native'

import type { AppSlug, WidgetLocale, WidgetSyncPayload } from './types'

type WidgetKitAndroidNative = {
  writePayload: (payloadJson: string, locale: string, tipLabel: string) => void
  reloadWidgets: () => void
}

function loadNative(): WidgetKitAndroidNative | null {
  if (Platform.OS !== 'android') return null
  try {
    // biome-ignore lint/style/noCommonJs: optional native module
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: <T>(name: string) => T
    }
    return requireNativeModule<WidgetKitAndroidNative>('WidgetKitAndroid')
  } catch {
    return null
  }
}

function tipLabelFromPayload(serialized: string, locale: WidgetLocale): string {
  if (locale === 'en') return ''
  try {
    const parsed = JSON.parse(serialized) as WidgetSyncPayload<{
      days?: Array<{ tipLabel?: string | null }>
      chrome?: { tip?: string | null }
    }>
    const fromChrome = parsed.data?.chrome?.tip
    if (typeof fromChrome === 'string' && fromChrome.length > 0) return fromChrome
    const fromDay = parsed.data?.days?.[0]?.tipLabel
    if (typeof fromDay === 'string' && fromDay.length > 0) return fromDay
  } catch {
    // fall through
  }
  if (locale === 'ja') return '一言'
  if (locale === 'zh-Hant') return '日籤'
  return '日签'
}

/**
 * Write the same envelope JSON used by iOS WidgetKit, then refresh Glance widgets.
 * No-ops on non-Android or when the native module is missing (Expo Go).
 */
export async function writeAndroidWidgetPayload<TData>(
  appSlug: AppSlug,
  locale: WidgetLocale,
  data: TData,
  freshUntil?: string
): Promise<void> {
  if (Platform.OS !== 'android') return

  const native = loadNative()
  if (!native) {
    console.warn(
      '[widget-kit-android] WidgetKitAndroid native module missing — rebuild with expo prebuild / run:android'
    )
    return
  }

  const payload: WidgetSyncPayload<TData> = {
    updatedAt: new Date().toISOString(),
    appSlug,
    locale,
    data,
    freshUntil,
  }
  const serialized = JSON.stringify(payload)
  const tip = tipLabelFromPayload(serialized, locale)

  try {
    native.writePayload(serialized, locale, tip)
    native.reloadWidgets()
  } catch (err: unknown) {
    console.warn('[widget-kit-android] write/reload failed:', err)
  }
}

export function reloadAndroidWidgets(): void {
  if (Platform.OS !== 'android') return
  const native = loadNative()
  try {
    native?.reloadWidgets()
  } catch (err: unknown) {
    console.warn('[widget-kit-android] reload failed:', err)
  }
}
