/**
 * Adopt UIKit UIScene lifecycle for iOS 27 / Xcode 27 (SDK 54 + expo-dev-client).
 *
 * Strategy (from expo/expo#50250 — SDK 54 specific):
 *   - Keep window + startReactNative in AppDelegate (dev-launcher needs a key
 *     window during didFinishLaunching).
 *   - Append SceneDelegate that only *adopts* that window onto UIWindowScene.
 *   - Declare UIApplicationSceneManifest.
 *
 * Moving startReactNative into SceneDelegate works on SDK 55+, but fatalErrors
 * on SDK 54 via ExpoDevLauncherAppDelegateSubscriber.
 */

const { createRequire } = require('node:module')

const requireFromExpo = createRequire(require.resolve('expo/package.json'))
const { withAppDelegate, withInfoPlist } = requireFromExpo('@expo/config-plugins')

const SCENE_MARKER = '/* withUiSceneLifecycle */'

const SCENE_DELEGATE_SWIFT = `
${SCENE_MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate
    else { return }

    // Adopt the window AppDelegate already created and started React Native in.
    // Do NOT create a new window or move startReactNative here on SDK 54 —
    // ExpoDevLauncherAppDelegateSubscriber fatalErrors in didFinishLaunching
    // when no key window exists yet.
    let window = appDelegate.window ?? UIWindow(frame: windowScene.coordinateSpace.bounds)
    window.windowScene = windowScene
    window.overrideUserInterfaceStyle = .unspecified
    self.window = window
    appDelegate.window = window
    window.makeKeyAndVisible()

    for context in connectionOptions.urlContexts {
      SceneDelegate.deliver(url: context.url, options: context.options)
    }
    for activity in connectionOptions.userActivities {
      SceneDelegate.deliver(userActivity: activity)
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      SceneDelegate.deliver(url: context.url, options: context.options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    SceneDelegate.deliver(userActivity: userActivity)
  }

  private static func deliver(url: URL, options sceneOptions: UIScene.OpenURLOptions) {
    guard let delegate = UIApplication.shared.delegate else { return }
    var options: [UIApplication.OpenURLOptionsKey: Any] = [
      .openInPlace: sceneOptions.openInPlace,
    ]
    if let sourceApplication = sceneOptions.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = sceneOptions.annotation {
      options[.annotation] = annotation
    }
    _ = delegate.application?(UIApplication.shared, open: url, options: options)
  }

  private static func deliver(userActivity: NSUserActivity) {
    guard let delegate = UIApplication.shared.delegate else { return }
    _ = delegate.application?(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in })
  }
}
`

/**
 * @param {string} src
 * @returns {string}
 */
function migrateAppDelegate(src) {
  // Already applied the adopt-only SceneDelegate.
  if (src.includes(SCENE_MARKER) && src.includes('window.windowScene = windowScene')) {
    return src
  }

  // Strip a previous (incorrect) "move startReactNative to SceneDelegate" patch.
  let next = src
  if (src.includes(SCENE_MARKER)) {
    const idx = next.indexOf(SCENE_MARKER)
    if (idx >= 0) {
      // Keep everything before the old SceneDelegate block (marker may be on its own line).
      const cut = next.lastIndexOf('\n', idx)
      next = next.slice(0, cut >= 0 ? cut : idx).trimEnd() + '\n'
    }
    // Restore window creation if a prior patch removed it.
    if (!/window\s*=\s*UIWindow\(frame:\s*UIScreen\.main\.bounds\)/.test(next)) {
      next = next.replace(
        /#if os\(iOS\) \|\| os\(tvOS\)\n[\s\S]*?#endif\n\n\s*return super\.application/,
        `#if os(iOS) || os(tvOS)
    // SDK 54 + expo-dev-launcher: window MUST exist before super.application.
    // SceneDelegate only adopts this window onto the UIWindowScene (iOS 27).
    window = UIWindow(frame: UIScreen.main.bounds)
    window?.overrideUserInterfaceStyle = .unspecified
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application`
      )
    }
    // Drop stash-only launchOptions if present (not needed for adopt-only path).
    next = next.replace(/\n\s*var launchOptions: \[UIApplication\.LaunchOptionsKey: Any\]\?\n/, '\n')
    next = next.replace(/\n\s*self\.launchOptions = launchOptions\n/, '\n')
  }

  if (!next.includes(SCENE_MARKER)) {
    next = `${next.trimEnd()}\n${SCENE_DELEGATE_SWIFT}\n`
  }

  return next
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
module.exports = function withUiSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    }
    return cfg
  })

  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withUiSceneLifecycle: expected Swift AppDelegate')
    }
    cfg.modResults.contents = migrateAppDelegate(cfg.modResults.contents)
    return cfg
  })
}
