/**
 * Expo config plugin — iCloud Documents container for Syel sealed reading photos.
 * Never grants access to period drafts (`xingqi-period/`).
 */

const { createRequire } = require('node:module')

const requireFromExpo = createRequire(require.resolve('expo/package.json'))
const { withEntitlementsPlist, withInfoPlist } = requireFromExpo('@expo/config-plugins')

const CONTAINER_ID = 'iCloud.com.hexastral.syel'

/** @type {import('@expo/config-plugins').ConfigPlugin} */
module.exports = function withIcloudDocuments(config) {
  let next = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.icloud-container-identifiers'] = [CONTAINER_ID]
    cfg.modResults['com.apple.developer.ubiquity-container-identifiers'] = [CONTAINER_ID]
    cfg.modResults['com.apple.developer.icloud-services'] = ['CloudDocuments']
    return cfg
  })

  next = withInfoPlist(next, (cfg) => {
    cfg.modResults.NSUbiquitousContainers = {
      [CONTAINER_ID]: {
        NSUbiquitousContainerIsDocumentScopePublic: false,
        NSUbiquitousContainerName: 'Syel',
        NSUbiquitousContainerSupportedFolderLevels: 'None',
      },
    }
    return cfg
  })

  return next
}
