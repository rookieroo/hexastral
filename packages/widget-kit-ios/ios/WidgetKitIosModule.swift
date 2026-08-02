import ExpoModulesCore
import Foundation
import WatchConnectivity
import WidgetKit

/**
 * Reloads WidgetKit timelines, flushes App Group UserDefaults, and mirrors
 * Yuun widget keys to a paired Apple Watch via WatchConnectivity.
 *
 * App Groups do NOT sync iPhone ↔ Watch automatically. We push after RN writes,
 * and also reply when the Watch app requests a sync (sendMessage).
 */
public class WidgetKitIosModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetKitIos")

    OnCreate {
      DispatchQueue.main.async {
        WatchConnectivityBridge.shared.activateIfNeeded()
      }
    }

    Function("reloadTimelines") {
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }

    Function("flushAppGroup") { (suiteName: String) in
      UserDefaults(suiteName: suiteName)?.synchronize()
    }

    Function("syncWatchAppGroup") { (suiteName: String) in
      DispatchQueue.main.async {
        // RN SharedGroup setItem does not synchronize; flush before snapshot/push
        // or Watch may receive a payload missing yuun_widget_locale / prefs.
        UserDefaults(suiteName: suiteName)?.synchronize()
        WatchConnectivityBridge.shared.pushAppGroup(suiteName: suiteName, reason: "rn-write")
      }
      // Second push shortly after — UserDefaults / WCSession activation races.
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
        UserDefaults(suiteName: suiteName)?.synchronize()
        WatchConnectivityBridge.shared.pushAppGroup(suiteName: suiteName, reason: "rn-write-retry")
      }
    }
  }
}

// MARK: - WatchConnectivity (iPhone)

private final class WatchConnectivityBridge: NSObject, WCSessionDelegate {
  static let shared = WatchConnectivityBridge()

  private let keys = [
    "hexastral_widget_payload_v1",
    "almanac_days",
    "yuun_widget_locale",
    "yuun_widget_tip_label",
    "yuun_dev_moon_phase",
    "yuun_watch_preferences_v1",
    "yuun_watch_credential",
  ]
  private let devMoonPhaseKey = "yuun_dev_moon_phase"
  private let watchCredentialKey = "yuun_watch_credential"

  private var pendingSuiteName: String?
  private var lastSuiteName: String = "group.com.hexastral.yuun"

  func activateIfNeeded() {
    assert(Thread.isMainThread)
    guard WCSession.isSupported() else {
      NSLog("[WidgetKitIos] WCSession unsupported")
      return
    }
    let session = WCSession.default
    session.delegate = self
    if session.activationState == .notActivated {
      NSLog("[WidgetKitIos] activating WCSession…")
      session.activate()
    }
  }

  func snapshotPayload(suiteName: String) -> [String: String] {
    guard let defaults = UserDefaults(suiteName: suiteName) else { return [:] }
    defaults.synchronize()
    var payload: [String: String] = [:]
    for key in keys {
      if let value = defaults.string(forKey: key), !value.isEmpty {
        payload[key] = value
      } else if let data = defaults.data(forKey: key),
                let s = String(data: data, encoding: .utf8), !s.isEmpty {
        payload[key] = s
      } else if let any = defaults.object(forKey: key) {
        // SharedGroup may store non-string; coerce.
        if let n = any as? NSNumber {
          payload[key] = n.stringValue
        } else if let s = any as? String, !s.isEmpty {
          payload[key] = s
        } else if let s = any as? NSString, s.length > 0 {
          payload[key] = s as String
        }
      }
    }
    // A missing DEV override must cross the phone/watch boundary too. The
    // empty value is a tombstone; otherwise Watch keeps its previous phase
    // forever after “Follow system date” removes the iPhone key.
    if payload[devMoonPhaseKey] == nil {
      payload[devMoonPhaseKey] = ""
    }
    // Credential: only tombstone when RN wrote an explicit empty string.
    // Missing key must NOT clear Watch Keychain — widget payload sync often
    // runs before provisionYuunWatch and would otherwise wipe the bearer.
    if let raw = defaults.object(forKey: watchCredentialKey) as? String, raw.isEmpty {
      payload[watchCredentialKey] = ""
    }
    return payload
  }

  func pushAppGroup(suiteName: String, reason: String) {
    assert(Thread.isMainThread)
    lastSuiteName = suiteName
    activateIfNeeded()

    guard WCSession.isSupported() else { return }
    let session = WCSession.default

    guard session.activationState == .activated else {
      NSLog("[WidgetKitIos] push deferred (\(reason)): not activated yet")
      pendingSuiteName = suiteName
      session.activate()
      return
    }

    // Re-query each push — install state can lag right after first install.
    let paired = session.isPaired
    let watchApp = session.isWatchAppInstalled
    let reachable = session.isReachable
    NSLog(
      "[WidgetKitIos] push (\(reason)) paired=\(paired) watchApp=\(watchApp) reachable=\(reachable) complicationBudget=\(session.remainingComplicationUserInfoTransfers)"
    )

    guard paired else {
      NSLog("[WidgetKitIos] skip: Watch not paired")
      return
    }
    guard watchApp else {
      NSLog("[WidgetKitIos] skip: Yuun Watch app not installed on Watch")
      return
    }

    let payload = snapshotPayload(suiteName: suiteName)
    guard !payload.isEmpty else {
      NSLog("[WidgetKitIos] skip: App Group empty (suite=\(suiteName))")
      return
    }
    let bytes = payload.values.reduce(0) { $0 + $1.utf8.count }
    NSLog("[WidgetKitIos] payload keys=\(payload.keys.sorted()) bytes≈\(bytes)")

    do {
      try session.updateApplicationContext(payload)
      NSLog("[WidgetKitIos] updateApplicationContext ok")
    } catch {
      NSLog("[WidgetKitIos] updateApplicationContext failed: \(error.localizedDescription)")
    }

    if session.remainingComplicationUserInfoTransfers > 0 {
      session.transferCurrentComplicationUserInfo(payload)
      NSLog("[WidgetKitIos] transferCurrentComplicationUserInfo queued")
    } else {
      session.transferUserInfo(payload)
      NSLog("[WidgetKitIos] transferUserInfo queued (no complication budget)")
    }

    // Fast path when Watch app is open in foreground.
    if reachable {
      session.sendMessage(
        payload,
        replyHandler: { _ in
          NSLog("[WidgetKitIos] sendMessage delivered")
        },
        errorHandler: { err in
          NSLog("[WidgetKitIos] sendMessage error: \(err.localizedDescription)")
        }
      )
    }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if let error {
      NSLog("[WidgetKitIos] activate error: \(error.localizedDescription)")
    }
    NSLog("[WidgetKitIos] activated state=\(activationState.rawValue) paired=\(session.isPaired) watchApp=\(session.isWatchAppInstalled)")
    if activationState == .activated {
      let suite = pendingSuiteName ?? lastSuiteName
      pendingSuiteName = nil
      DispatchQueue.main.async {
        self.pushAppGroup(suiteName: suite, reason: "did-activate")
      }
    }
  }

  /// Watch opened Yuun and asked for the latest 黄历 snapshot.
  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    let req = message["request"] as? String
    NSLog("[WidgetKitIos] didReceiveMessage request=\(req ?? "?")")
    if req == "yuunWidgetSync" {
      let suite = (message["suite"] as? String) ?? lastSuiteName
      lastSuiteName = suite
      let payload = snapshotPayload(suiteName: suite)
      let bytes = payload.values.reduce(0) { $0 + $1.utf8.count }

      // applicationContext before the reply so Watch can ingest either channel.
      if !payload.isEmpty {
        do {
          try session.updateApplicationContext(payload)
          NSLog("[WidgetKitIos] watch-request updateApplicationContext ok bytes≈\(bytes)")
        } catch {
          NSLog(
            "[WidgetKitIos] watch-request updateApplicationContext failed: \(error.localizedDescription)"
          )
        }
        if session.remainingComplicationUserInfoTransfers > 0 {
          session.transferCurrentComplicationUserInfo(payload)
        }
      }

      // sendMessage replies are property-list limited (~65KB practical ceiling).
      if bytes > 50_000 {
        NSLog("[WidgetKitIos] reply ACK only (bytes≈\(bytes))")
        replyHandler([
          "ok": payload.isEmpty ? "0" : "1",
          "via": "applicationContext",
          "bytes": String(bytes),
        ])
      } else {
        NSLog("[WidgetKitIos] reply snapshot keys=\(payload.keys.sorted()) bytes≈\(bytes)")
        replyHandler(payload)
      }
      return
    }
    replyHandler([:])
  }

  #if os(iOS)
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    NSLog("[WidgetKitIos] reachability → \(session.isReachable)")
    if session.isReachable {
      DispatchQueue.main.async {
        self.pushAppGroup(suiteName: self.lastSuiteName, reason: "reachable")
      }
    }
  }
  #endif
}
