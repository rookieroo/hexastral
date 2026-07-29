// Yuun watchOS companion — hosts YuunWatch complications and pulls 黄历 from
// iPhone via WatchConnectivity → local App Group (iPhone App Group does not sync).

import SwiftUI
import WatchConnectivity
import WidgetKit

private let APP_GROUP = "group.com.hexastral.yuun"
private let SYNC_KEYS = [
  "hexastral_widget_payload_v1",
  "almanac_days",
  "yuun_widget_locale",
  "yuun_widget_tip_label",
  "yuun_dev_moon_phase",
]

// MARK: - WatchConnectivity → App Group

final class YuunWatchSession: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = YuunWatchSession()

  @Published var hasAlmanac = false
  @Published var statusText = "正在连接 iPhone…"

  func activate() {
    guard WCSession.isSupported() else {
      statusText = "此设备不支持同步"
      return
    }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func ingest(_ dict: [String: Any]) {
    guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return }
    var wrote = false
    for key in SYNC_KEYS {
      if let value = dict[key] as? String, !value.isEmpty {
        defaults.set(value, forKey: key)
        wrote = true
      }
    }
    guard wrote else { return }
    defaults.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "YuunWatch")
    WidgetCenter.shared.reloadAllTimelines()
    DispatchQueue.main.async {
      self.refreshStatusFromDefaults()
    }
    NSLog("[YuunWatch] ingested keys=\(dict.keys.sorted())")
  }

  func refreshStatusFromDefaults() {
    if let defaults = UserDefaults(suiteName: APP_GROUP),
       let json = defaults.string(forKey: "hexastral_widget_payload_v1"),
       !json.isEmpty {
      hasAlmanac = true
      statusText = "黄历已同步 · 请在表盘添加 Yuun"
    } else {
      hasAlmanac = false
      statusText = "打开 iPhone 上的 Yuun 首页，然后回到这里"
    }
  }

  /// Ask iPhone for the latest snapshot (works when iPhone Yuun is reachable).
  func requestSyncFromPhone() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    guard session.activationState == .activated else {
      statusText = "等待连接…"
      session.activate()
      return
    }

    // Always apply buffered applicationContext first.
    if !session.receivedApplicationContext.isEmpty {
      ingest(session.receivedApplicationContext)
    }

    if session.isReachable {
      statusText = "正在从 iPhone 拉取…"
      session.sendMessage(
        ["request": "yuunWidgetSync", "suite": APP_GROUP],
        replyHandler: { reply in
          DispatchQueue.main.async {
            if reply.isEmpty {
              self.statusText = "iPhone 尚无黄历数据 · 请打开 Yuun 首页"
            } else {
              self.ingest(reply)
            }
          }
        },
        errorHandler: { err in
          DispatchQueue.main.async {
            NSLog("[YuunWatch] sendMessage error: \(err.localizedDescription)")
            self.refreshStatusFromDefaults()
            if !self.hasAlmanac {
              self.statusText = "拉取失败 · 请保持 iPhone Yuun 打开"
            }
          }
        }
      )
    } else {
      refreshStatusFromDefaults()
      if !hasAlmanac {
        statusText = "iPhone 未在线 · 请打开 Yuun 后重试"
      }
    }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if let error {
      NSLog("[YuunWatch] activate error: \(error.localizedDescription)")
    }
    DispatchQueue.main.async {
      if activationState == .activated {
        self.requestSyncFromPhone()
      } else {
        self.statusText = "连接未完成"
      }
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    ingest(applicationContext)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    ingest(userInfo)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    ingest(message)
  }
}

// MARK: - App

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

struct ContentView: View {
  @ObservedObject private var session = YuunWatchSession.shared

  var body: some View {
    VStack(spacing: 10) {
      Text("Yuun")
        .font(.headline)
      Text(session.statusText)
        .font(.caption2)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
      Button("立即同步") {
        session.requestSyncFromPhone()
      }
      .font(.caption2)
    }
    .padding()
    .onAppear {
      session.activate()
      session.refreshStatusFromDefaults()
      session.requestSyncFromPhone()
    }
  }
}
