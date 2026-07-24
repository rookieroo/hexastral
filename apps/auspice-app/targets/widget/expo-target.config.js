/**
 * Apple Widget Extension target for Auspice, wired into Xcode by
 * `@bacons/apple-targets` on `expo prebuild`. The widget + the main app share an
 * App Group so the RN bridge (lib/widget-bridge.ts) can hand off the day's 黄历.
 * The main app declares the SAME group via app.json → expo.ios.entitlements.
 *
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  type: 'widget',
  name: 'AuspiceWidget',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.hexastral.yuun'],
  },
}
