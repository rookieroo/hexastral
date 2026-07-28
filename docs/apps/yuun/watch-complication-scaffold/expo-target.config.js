/**
 * Watch complication target for Yuun — reads the same App Group as the
 * home-screen widget. Full watch-face templates remain preview-only in RN.
 *
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  type: 'watch',
  name: 'AuspiceWatch',
  deploymentTarget: '10.0',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.hexastral.yuun'],
  },
}
