/**
 * Expo config plugin — bump every CocoaPods target (incl. resource bundles) to the
 * app deployment target. Xcode 16+ rejects RNCAsyncStorage / RNSVG / RevenueCat
 * bundles still pinned at iOS 12–13.
 */
const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

const MARKER = '# @zhop: align pod deployment targets'

const PODFILE_SNIPPET = `
    ${MARKER}
    ios_deployment_target = podfile_properties['ios.deploymentTarget'] || '15.1'
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = ios_deployment_target
      end
    end
    installer.target_installation_results.pod_target_installation_results.each do |_pod_name, target_installation_result|
      target_installation_result.resource_bundle_targets.each do |resource_bundle_target|
        resource_bundle_target.build_configurations.each do |bc|
          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = ios_deployment_target
        end
      end
    end`

function isAlreadyPatched(contents) {
  return contents.includes(MARKER) || contents.includes('resource_bundle_targets.each')
}

function withIosPodDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile')
      if (!fs.existsSync(podfilePath)) return cfg

      let contents = fs.readFileSync(podfilePath, 'utf8')
      if (isAlreadyPatched(contents)) return cfg

      const postInstallClose = /react_native_post_install\([\s\S]*?\n {4}\)\n/
      if (!postInstallClose.test(contents)) {
        throw new Error(
          `withIosPodDeploymentTarget: could not find react_native_post_install block in ${podfilePath}`
        )
      }
      contents = contents.replace(postInstallClose, (match) => `${match}${PODFILE_SNIPPET}\n`)
      fs.writeFileSync(podfilePath, contents)
      return cfg
    },
  ])
}

module.exports = withIosPodDeploymentTarget
