/**
 * Expo config plugin: WidgetKit entitlements + validation for HexAstral apps.
 *
 * Xcode Widget Extension target generation for Yuun is owned by
 * `@bacons/apple-targets` + `apps/auspice-app/targets/widget/`. This plugin:
 *   - validates props
 *   - ensures the main app App Group entitlement matches `appGroupId`
 *
 * Full PBXNativeTarget mutation remains optional; apple-targets covers Yuun V1.
 */

import {
  type ConfigPlugin,
  withEntitlementsPlist,
} from '@expo/config-plugins'

export interface WidgetKitIosPluginProps {
  /** PascalCase widget extension name. E.g. "AuspiceWidget". */
  widgetName: string
  /** App slug — must match the `AppSlug` type. */
  appSlug: 'yuun' | 'feng' | 'kindred' | 'yuan' | 'mingpan'
  /** Full App Group identifier. */
  appGroupId: string
  /** Whether Watch complications are planned (documented; Watch target via apple-targets). */
  watchComplication?: boolean
}

const withWidgetExtension: ConfigPlugin<WidgetKitIosPluginProps> = (config, props) => {
  if (!props.widgetName || !props.appSlug || !props.appGroupId) {
    throw new Error('[widget-kit-ios] All three of widgetName, appSlug, appGroupId are required')
  }

  // biome-ignore lint/suspicious/noConsole: build-time log is intentional
  console.log(
    `[widget-kit-ios] ${props.appSlug} → ${props.widgetName} group=${props.appGroupId}` +
      (props.watchComplication
        ? ' (watchComplication: YuunWatch via targets/watch-widget)'
        : '')
  )

  return withEntitlementsPlist(config, (cfg) => {
    const key = 'com.apple.security.application-groups'
    const existing = cfg.modResults[key]
    const groups = Array.isArray(existing)
      ? existing.filter((g): g is string => typeof g === 'string')
      : []
    if (!groups.includes(props.appGroupId)) {
      groups.push(props.appGroupId)
    }
    cfg.modResults[key] = groups
    return cfg
  })
}

export default withWidgetExtension
