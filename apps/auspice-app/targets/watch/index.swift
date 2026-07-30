// Yuun watchOS companion — full SwiftUI app + WatchConnectivity host.

import SwiftUI

@main
struct YuunWatchApp: App {
  init() {
    YuunWatchSession.shared.activate()
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}
