// App Group read/write for widget envelope + watch preferences.

import Foundation
import WidgetKit

final class WatchPayloadStore: ObservableObject {
  static let shared = WatchPayloadStore()

  @Published private(set) var envelope: WidgetEnvelope?
  @Published private(set) var lastUpdatedAt: Date?
  @Published private(set) var isStale = false
  /// Bumped when prefs / plain locale key change so SwiftUI re-reads `resolvedLocale`.
  @Published private(set) var localeEpoch: Int = 0

  /// Phone App locale (incl. Me → Language · DEV), never watchOS language first.
  /// Order matters: a stale English `envelope.locale` used to beat a fresh
  /// `yuun_widget_locale` / prefs write from the phone — that is why DEV 繁体
  /// could still show English when the Watch system language is en.
  var resolvedLocale: WatchLocale {
    if let prefs = loadPreferences()?.locale, !prefs.isEmpty {
      return WatchLocale.normalize(prefs)
    }
    if let defaults = UserDefaults(suiteName: WatchStoreKeys.appGroup),
       let loc = defaults.string(forKey: WatchStoreKeys.locale), !loc.isEmpty {
      return WatchLocale.normalize(loc)
    }
    if let loc = envelope?.locale, !loc.isEmpty {
      return WatchLocale.normalize(loc)
    }
    let preferred = Locale.preferredLanguages.first ?? "en"
    return WatchLocale.normalize(preferred)
  }

  var chrome: SharedChrome? {
    envelope?.data.chrome
  }

  private init() {
    reloadFromDefaults()
  }

  func reloadFromDefaults() {
    let prevEpochLocale = localeEpoch
    let prevRaw = defaults?.string(forKey: WatchStoreKeys.locale)
    let prevPrefs = defaults?.string(forKey: WatchStoreKeys.preferences)
    envelope = readEnvelope()
    if let iso = envelope?.updatedAt {
      lastUpdatedAt = ISO8601DateFormatter().date(from: iso)
    } else {
      lastUpdatedAt = nil
    }
    isStale = computeStale()
    let nextRaw = defaults?.string(forKey: WatchStoreKeys.locale)
    let nextPrefs = defaults?.string(forKey: WatchStoreKeys.preferences)
    if prevRaw != nextRaw || prevPrefs != nextPrefs {
      localeEpoch = prevEpochLocale + 1
      NSLog("[YuunWatch] resolvedLocale → \(resolvedLocale.rawValue)")
    }
  }

  private func computeStale() -> Bool {
    guard let freshUntil = envelope?.freshUntil,
          let until = ISO8601DateFormatter().date(from: freshUntil)
    else {
      return envelope == nil
    }
    return Date() > until
  }

  private var defaults: UserDefaults? {
    UserDefaults(suiteName: WatchStoreKeys.appGroup)
  }

  private func defaultsJSON(key: String) -> Data? {
    guard let suite = defaults else { return nil }
    if let s = suite.string(forKey: key), let d = s.data(using: .utf8) { return d }
    if let d = suite.data(forKey: key) { return d }
    if let obj = suite.object(forKey: key),
       JSONSerialization.isValidJSONObject(obj),
       let d = try? JSONSerialization.data(withJSONObject: obj) {
      return d
    }
    return nil
  }

  func readEnvelope() -> WidgetEnvelope? {
    guard let data = defaultsJSON(key: WatchStoreKeys.payload) else { return nil }
    return try? JSONDecoder().decode(WidgetEnvelope.self, from: data)
  }

  func writeEnvelope(_ env: WidgetEnvelope) {
    let merged = mergeEnvelope(env)
    guard let suite = defaults else { return }
    guard let data = try? JSONEncoder().encode(merged),
          let json = String(data: data, encoding: .utf8)
    else { return }

    let tmpKey = "\(WatchStoreKeys.payload).tmp"
    suite.set(json, forKey: tmpKey)
    suite.set(json, forKey: WatchStoreKeys.payload)
    suite.removeObject(forKey: tmpKey)
    if let loc = merged.locale, !loc.isEmpty {
      suite.set(loc, forKey: WatchStoreKeys.locale)
    }
    if let tip = merged.data.chrome?.tip {
      suite.set(tip, forKey: WatchStoreKeys.tipLabel)
    }
    suite.synchronize()

    DispatchQueue.main.async {
      self.envelope = merged
      if let iso = merged.updatedAt {
        self.lastUpdatedAt = ISO8601DateFormatter().date(from: iso)
      }
      self.isStale = self.computeStale()
    }

    WidgetCenter.shared.reloadTimelines(ofKind: WatchStoreKeys.widgetKind)
    WidgetCenter.shared.reloadAllTimelines()
    NSLog("[YuunWatch] wrote envelope days=\(merged.data.days.count)")
  }

  /// When a refresh omits personalized / tip fields, keep prior same-date values.
  /// Fit is only preserved while prefs still carry a birthDate (cleared birth → drop fit).
  func mergeEnvelope(_ incoming: WidgetEnvelope) -> WidgetEnvelope {
    guard let prior = readEnvelope() ?? envelope else { return incoming }
    let keepFit = !(loadPreferences()?.birthDate ?? "").isEmpty
    var byDate: [String: SharedDay] = [:]
    for day in prior.data.days {
      byDate[day.date] = day
    }

    let mergedDays: [SharedDay] = incoming.data.days.map { neu in
      guard let old = byDate[neu.date] else { return neu }
      return SharedDay(
        date: neu.date,
        ganZhi: neu.ganZhi,
        elementColor: neu.elementColor,
        lunar: neu.lunar,
        solarTerm: neu.solarTerm,
        yi: neu.yi,
        ji: neu.ji,
        fit: keepFit ? (nonEmpty(neu.fit) ?? old.fit) : nil,
        moonPhase: neu.moonPhase,
        officer: neu.officer ?? old.officer,
        mansion: neu.mansion ?? old.mansion,
        clashShengxiao: neu.clashShengxiao ?? old.clashShengxiao,
        ganzhiYear: neu.ganzhiYear ?? old.ganzhiYear,
        yiShort: neu.yiShort ?? old.yiShort,
        jiShort: neu.jiShort ?? old.jiShort,
        yiLong: neu.yiLong ?? old.yiLong,
        jiLong: neu.jiLong ?? old.jiLong,
        ganZhiPinyin: neu.ganZhiPinyin ?? old.ganZhiPinyin,
        fitSummary: keepFit ? (nonEmpty(neu.fitSummary) ?? old.fitSummary) : nil,
        dayTip: nonEmpty(neu.dayTip) ?? old.dayTip,
        tipLabel: nonEmpty(neu.tipLabel) ?? old.tipLabel
      )
    }

    return WidgetEnvelope(
      updatedAt: incoming.updatedAt ?? prior.updatedAt,
      appSlug: incoming.appSlug ?? prior.appSlug,
      locale: incoming.locale ?? prior.locale,
      freshUntil: incoming.freshUntil ?? prior.freshUntil,
      data: WidgetEnvelopeData(
        days: mergedDays,
        chrome: incoming.data.chrome ?? prior.data.chrome
      )
    )
  }

  private func nonEmpty(_ value: String?) -> String? {
    guard let value, !value.isEmpty else { return nil }
    return value
  }

  func day(for date: String) -> SharedDay? {
    envelope?.data.days.first { $0.date == date }
  }

  func allDaysSorted() -> [SharedDay] {
    (envelope?.data.days ?? []).sorted { $0.date < $1.date }
  }

  func loadPreferences() -> WatchPreferences? {
    guard let suite = defaults else { return nil }
    let data: Data?
    if let raw = suite.string(forKey: WatchStoreKeys.preferences) {
      data = raw.data(using: .utf8)
    } else if let d = suite.data(forKey: WatchStoreKeys.preferences) {
      data = d
    } else {
      data = nil
    }
    guard let data else { return nil }
    if let prefs = try? JSONDecoder().decode(WatchPreferences.self, from: data) {
      return prefs
    }
    // SharedGroup / WCSession sometimes delivers a JSON *string* as Data of a
    // quoted string — unwrap one layer.
    if let quoted = try? JSONDecoder().decode(String.self, from: data),
       let inner = quoted.data(using: .utf8),
       let prefs = try? JSONDecoder().decode(WatchPreferences.self, from: inner) {
      return prefs
    }
    return nil
  }

  func savePreferences(_ prefs: WatchPreferences) {
    guard let suite = defaults,
          let data = try? JSONEncoder().encode(prefs),
          let json = String(data: data, encoding: .utf8)
    else { return }
    suite.set(json, forKey: WatchStoreKeys.preferences)
    suite.synchronize()
  }

  func devMoonPhaseOverride() -> Double? {
    guard let suite = defaults else { return nil }
    if let s = suite.string(forKey: WatchStoreKeys.devMoonPhase)?.trimmingCharacters(in: .whitespacesAndNewlines),
       !s.isEmpty,
       let v = Double(s), v >= 0, v <= 1 {
      return v
    }
    if let n = suite.object(forKey: WatchStoreKeys.devMoonPhase) as? NSNumber {
      let v = n.doubleValue
      if v >= 0 && v <= 1 { return v }
    }
    return nil
  }

  func phase(for day: SharedDay) -> Double {
    devMoonPhaseOverride() ?? day.moonPhase
  }

  func label(_ key: String, fallback: String) -> String {
    switch key {
    case "good": return chrome?.good ?? fallback
    case "avoid": return chrome?.avoid ?? fallback
    case "forYou": return chrome?.forYou ?? fallback
    default: return fallback
    }
  }
}

func ymdString(_ date: Date) -> String {
  let f = DateFormatter()
  f.calendar = Calendar(identifier: .gregorian)
  f.dateFormat = "yyyy-MM-dd"
  return f.string(from: date)
}

func parseYmd(_ iso: String) -> (year: Int, month: Int, day: Int)? {
  let parts = iso.split(separator: "-").compactMap { Int($0) }
  guard parts.count == 3 else { return nil }
  return (parts[0], parts[1], parts[2])
}
