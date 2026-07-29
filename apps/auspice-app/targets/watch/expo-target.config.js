/**
 * Minimal watchOS companion app — required host for `targets/watch-widget`
 * (WidgetKit complications). Folder must sort *before* `watch-widget` so
 * bacons can embed the extension into this app (not the iPhone target).
 *
 * `icon` is required: without AppIcon, iPhone Watch app lists Yuun with a
 * blank glyph and install often fails.
 *
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  type: 'watch',
  name: 'YuunWatchApp',
  displayName: 'Yuun',
  deploymentTarget: '10.0',
  /** Parent of watch-widget — extension must be `….watch.*`. */
  bundleIdentifier: '.watch',
  icon: '../../assets/icon.png',
  frameworks: ['WatchConnectivity', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups': ['group.com.hexastral.yuun'],
  },
}
