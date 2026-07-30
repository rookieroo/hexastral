// WatchConnectivity ingest — iPhone → App Group (+ Keychain for credential).

import Foundation
import WatchConnectivity
import WidgetKit

final class YuunWatchSession: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = YuunWatchSession()

  @Published var hasAlmanac = false
  @Published var isSyncing = false
  @Published var statusText = ""

  func activate() {
    guard WCSession.isSupported() else {
      statusText = WatchI18n.currentStrings().syncFailed
      return
    }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  private func stringValue(_ raw: Any?) -> String? {
    if let s = raw as? String { return s }
    if let n = raw as? NSNumber { return n.stringValue }
    if let data = raw as? Data, let s = String(data: data, encoding: .utf8) { return s }
    if JSONSerialization.isValidJSONObject(raw as Any),
       let data = try? JSONSerialization.data(withJSONObject: raw as Any),
       let s = String(data: data, encoding: .utf8) {
      return s
    }
    return nil
  }

  @discardableResult
  func ingest(_ dict: [String: Any]) -> Bool {
    guard let defaults = UserDefaults(suiteName: WatchStoreKeys.appGroup) else { return false }
    var wrote = false

    for key in WatchStoreKeys.syncKeys {
      guard dict.keys.contains(key) else { continue }
      guard let value = stringValue(dict[key]) else { continue }

      if key == WatchStoreKeys.credential {
        if value.isEmpty {
          WatchKeychain.deleteCredential()
          defaults.removeObject(forKey: key)
        } else {
          WatchKeychain.saveCredential(value)
        }
        wrote = true
        continue
      }

      if key == WatchStoreKeys.devMoonPhase, value.isEmpty {
        defaults.removeObject(forKey: key)
        wrote = true
        continue
      }

      if key == WatchStoreKeys.preferences {
        if value.isEmpty {
          defaults.removeObject(forKey: key)
        } else {
          defaults.set(value, forKey: key)
        }
        wrote = true
        continue
      }

      if !value.isEmpty {
        defaults.set(value, forKey: key)
        wrote = true
      }
    }

    guard wrote else { return false }
    defaults.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: WatchStoreKeys.widgetKind)
    WidgetCenter.shared.reloadAllTimelines()
    WatchPayloadStore.shared.reloadFromDefaults()
    refreshHasAlmanac()
    NSLog("[YuunWatch] ingested keys=\(dict.keys.sorted())")
    return true
  }

  private func refreshHasAlmanac() {
    if let json = UserDefaults(suiteName: WatchStoreKeys.appGroup)?
      .string(forKey: WatchStoreKeys.payload), !json.isEmpty {
      hasAlmanac = true
    } else {
      hasAlmanac = false
    }
  }

  func refreshStatusFromDefaults() {
    WatchPayloadStore.shared.reloadFromDefaults()
    refreshHasAlmanac()
    let t = WatchI18n.currentStrings()
    if !isSyncing {
      statusText = hasAlmanac ? t.syncSuccess : t.noData
    }
  }

  private func finishSync(success: Bool, detail: String) {
    isSyncing = false
    statusText = detail
    NSLog("[YuunWatch] sync finish success=\(success) detail=\(detail)")
  }

  func requestSyncFromPhone() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    guard session.activationState == .activated else {
      statusText = WatchI18n.currentStrings().refreshing
      session.activate()
      return
    }

    if !session.receivedApplicationContext.isEmpty {
      _ = ingest(session.receivedApplicationContext)
    }

    if session.isReachable {
      isSyncing = true
      statusText = WatchI18n.currentStrings().refreshing
      session.sendMessage(
        ["request": "yuunWidgetSync", "suite": WatchStoreKeys.appGroup],
        replyHandler: { reply in
          DispatchQueue.main.async {
            let wrote = self.ingest(reply)
            if !session.receivedApplicationContext.isEmpty {
              _ = self.ingest(session.receivedApplicationContext)
            }
            self.refreshStatusFromDefaults()
            if self.hasAlmanac {
              self.finishSync(success: true, detail: WatchI18n.currentStrings().syncSuccess)
              return
            }
            let viaContext = (reply["via"] as? String) == "applicationContext"
            if viaContext || (reply["ok"] as? String) == "1" {
              DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                if !session.receivedApplicationContext.isEmpty {
                  _ = self.ingest(session.receivedApplicationContext)
                }
                self.refreshStatusFromDefaults()
                if self.hasAlmanac {
                  self.finishSync(success: true, detail: WatchI18n.currentStrings().syncSuccess)
                } else {
                  self.finishSync(success: false, detail: WatchI18n.currentStrings().noData)
                }
              }
              return
            }
            if wrote {
              self.finishSync(success: false, detail: WatchI18n.currentStrings().noData)
            } else if reply.isEmpty {
              self.finishSync(success: false, detail: WatchI18n.currentStrings().noData)
            } else {
              self.finishSync(success: false, detail: WatchI18n.currentStrings().syncFailed)
            }
          }
        },
        errorHandler: { err in
          DispatchQueue.main.async {
            NSLog("[YuunWatch] sendMessage error: \(err.localizedDescription)")
            if !session.receivedApplicationContext.isEmpty {
              _ = self.ingest(session.receivedApplicationContext)
            }
            self.refreshStatusFromDefaults()
            if self.hasAlmanac {
              self.finishSync(success: true, detail: WatchI18n.currentStrings().syncSuccess)
            } else {
              self.finishSync(success: false, detail: WatchI18n.currentStrings().syncFailed)
            }
          }
        }
      )
    } else {
      refreshStatusFromDefaults()
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
      }
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    DispatchQueue.main.async {
      _ = self.ingest(applicationContext)
      if self.isSyncing, self.hasAlmanac {
        self.finishSync(success: true, detail: WatchI18n.currentStrings().syncSuccess)
      }
    }
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    _ = ingest(userInfo)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    _ = ingest(message)
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    let wrote = ingest(message)
    replyHandler(["ok": wrote ? "1" : "0"])
  }
}

// MARK: - Network + phone refresh coordinator

@MainActor
final class WatchRefreshController: ObservableObject {
  static let shared = WatchRefreshController()

  @Published var isRefreshing = false
  @Published var bannerMessage: String?
  @Published var bannerIsError = false

  private init() {}

  func refresh(includePhone: Bool = true) async {
    guard !isRefreshing else { return }
    isRefreshing = true
    let t = WatchI18n.currentStrings()
    defer { isRefreshing = false }

    if includePhone {
      YuunWatchSession.shared.requestSyncFromPhone()
      try? await Task.sleep(nanoseconds: 600_000_000)
    }

    let locale = WatchPayloadStore.shared.resolvedLocale.rawValue
    let today = ymdString(Date())
    do {
      let env = try await WatchAPIClient.refreshNetwork(locale: locale, anchorDate: today)
      WatchPayloadStore.shared.writeEnvelope(env)
      bannerMessage = t.syncSuccess
      bannerIsError = false
    } catch {
      NSLog("[YuunWatch] network refresh failed: \(error.localizedDescription)")
      WatchPayloadStore.shared.reloadFromDefaults()
      if WatchPayloadStore.shared.envelope != nil {
        bannerMessage = t.offlineStale
        bannerIsError = true
      } else {
        bannerMessage = t.syncFailed
        bannerIsError = true
      }
    }
  }
}
