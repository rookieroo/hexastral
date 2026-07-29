/**
 * Watch face complications (WidgetKit on watchOS) for Yuun.
 * Reads the same App Group as the iPhone home-screen widget.
 *
 * Type MUST be `watch-widget` (not `watch`) — bacons `watch` is a full
 * companion app; complications need the WidgetKit extension point on watchOS.
 *
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  type: 'watch-widget',
  name: 'YuunWatch',
  displayName: 'Yuun',
  deploymentTarget: '10.0',
  /** Must be prefixed by companion Watch App (`….watch`). */
  bundleIdentifier: '.watch.widget',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.hexastral.yuun'],
  },
}
