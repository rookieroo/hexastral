/**
 * Expo config plugin: generates the iOS WidgetExtension target for an app.
 *
 * Sprint 1 scope: scaffold only. Plugin reads the `widgetName` option and
 * stamps a WidgetExtension target into ios/ on `expo prebuild --clean`.
 *
 * Sprint 5 scope: complete the Swift TimelineProvider + 3 widget families
 * (Small, Medium, Lock-Screen Rectangular) and Watch ClockKit complication.
 *
 * Usage in an app's app.json:
 *
 *   "plugins": [
 *     [
 *       "@zhop/widget-kit-ios/plugin",
 *       {
 *         "widgetName": "AuspiceWidget",
 *         "appSlug": "cycle",
 *         "appGroupId": "group.com.hexastral.shared.cycle",
 *         "watchComplication": true
 *       }
 *     ]
 *   ]
 *
 * Implementation notes (Sprint 5):
 *   - Use `@expo/config-plugins` ios helpers (withXcodeProject, withEntitlementsPlist)
 *   - Create a new PBXNativeTarget for the widget extension
 *   - Add App Group entitlement (com.apple.security.application-groups) to BOTH
 *     the main app target AND the widget extension target
 *   - Copy templates/Widget/Sources/*.swift into ios/{widgetName}/Sources
 *   - Add Info.plist with NSExtension NSExtensionPointIdentifier =
 *     com.apple.widgetkit-extension
 *   - For Watch: similar but with ClockKit complication target
 */

import type { ConfigPlugin } from '@expo/config-plugins'

export interface WidgetKitIosPluginProps {
  /** PascalCase widget extension name. E.g. "AuspiceWidget". */
  widgetName: string
  /** App slug — must match the `AppSlug` type. */
  appSlug: 'cycle' | 'feng' | 'yuan' | 'mingpan'
  /** Full App Group identifier. Usually `group.com.hexastral.shared.{appSlug}`. */
  appGroupId: string
  /** Whether to also generate a Watch ClockKit complication target. */
  watchComplication?: boolean
}

const withWidgetExtension: ConfigPlugin<WidgetKitIosPluginProps> = (config, props) => {
  if (!props.widgetName || !props.appSlug || !props.appGroupId) {
    throw new Error('[widget-kit-ios] All three of widgetName, appSlug, appGroupId are required')
  }

  // Sprint 1: scaffold only — validate props, no Xcode mutation yet.
  // The actual prebuild mutation happens in Sprint 5 via:
  //   - withXcodeProject (add target, add files)
  //   - withEntitlementsPlist (add app group entitlement)
  //   - withInfoPlist (widget extension Info.plist)
  //   - copyAsset (Swift templates → ios/{widgetName}/Sources)

  // For now: log so devs can verify plugin is loaded.
  // biome-ignore lint/suspicious/noConsole: build-time log is intentional
  console.log(
    `[widget-kit-ios] Plugin loaded for ${props.appSlug} (target: ${props.widgetName}, group: ${props.appGroupId}). Sprint 1 scaffold only — full prebuild integration in Sprint 5.`
  )

  return config
}

export default withWidgetExtension
