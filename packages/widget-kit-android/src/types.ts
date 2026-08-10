/**
 * Android widget payload keys — keep in sync with @zhop/widget-kit-ios/types.
 * JSON envelope shape is identical on both platforms.
 */

export const WIDGET_PAYLOAD_KEY = 'hexastral_widget_payload_v1'
export const YUUN_LEGACY_DAYS_KEY = 'almanac_days'
export const YUUN_WIDGET_LOCALE_KEY = 'yuun_widget_locale'
export const YUUN_WIDGET_TIP_LABEL_KEY = 'yuun_widget_tip_label'

/** SharedPreferences file name (app-private). */
export const ANDROID_WIDGET_PREFS = 'yuun_widget_prefs'

export type AppSlug = 'yuun' | 'feng' | 'kindred' | 'yuan' | 'mingpan'
export type WidgetLocale = 'en' | 'zh-Hans' | 'zh-Hant' | 'ja'

export interface WidgetSyncPayload<TData = Record<string, unknown>> {
  updatedAt: string
  appSlug: AppSlug
  locale: WidgetLocale
  data: TData
  freshUntil?: string
}
