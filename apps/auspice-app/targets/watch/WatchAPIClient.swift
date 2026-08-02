// Network client — bootstrap (Bearer) + public /day refresh.

import Foundation

enum WatchAPIError: LocalizedError {
  case invalidURL
  case httpStatus(Int)
  case decodeFailed
  case noCredential

  var errorDescription: String? {
    switch self {
    case .invalidURL: return "Invalid URL"
    case .httpStatus(let c): return "HTTP \(c)"
    case .decodeFailed: return "Bad response"
    case .noCredential: return "No credential"
    }
  }
}

enum WatchAPIClient {
  private static let defaultBase = "https://api.hexastral.com"

  static var baseURL: URL {
    if let override = Bundle.main.object(forInfoDictionaryKey: "YuunAPIBaseURL") as? String,
       !override.isEmpty,
       let url = URL(string: override) {
      return url
    }
    return URL(string: defaultBase)!
  }

  /// POST /api/auspice/watch/bootstrap with Bearer credential.
  static func bootstrap(
    anchorDate: String,
    locale: String,
    days: Int = 7,
    birthDate: String? = nil,
    yijiMode: String? = nil
  ) async throws -> WidgetEnvelope {
    guard let token = WatchKeychain.loadCredential() else {
      throw WatchAPIError.noCredential
    }
    var url = baseURL
    url.append(path: "/api/auspice/watch/bootstrap")
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    req.cachePolicy = .reloadIgnoringLocalCacheData

    var body: [String: Any] = [
      "anchorDate": anchorDate,
      "locale": locale,
      "days": days,
    ]
    if let birthDate, !birthDate.isEmpty {
      body["birthDate"] = birthDate
    }
    if let yijiMode, !yijiMode.isEmpty {
      body["yijiMode"] = yijiMode
    }
    req.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, resp) = try await URLSession.shared.data(for: req)
    guard let http = resp as? HTTPURLResponse else { throw WatchAPIError.decodeFailed }
    guard (200...299).contains(http.statusCode) else {
      throw WatchAPIError.httpStatus(http.statusCode)
    }
    return try decodeEnvelope(data)
  }

  /// GET /api/auspice/day?date=&locale= — no birthDate (public).
  static func fetchPublicDay(date: String, locale: String) async throws -> WidgetEnvelope {
    var components = URLComponents(url: baseURL.appending(path: "/api/auspice/day"), resolvingAgainstBaseURL: false)!
    components.queryItems = [
      URLQueryItem(name: "date", value: date),
      URLQueryItem(name: "locale", value: locale),
    ]
    guard let url = components.url else { throw WatchAPIError.invalidURL }
    var req = URLRequest(url: url)
    req.cachePolicy = .reloadIgnoringLocalCacheData

    let (data, resp) = try await URLSession.shared.data(for: req)
    guard let http = resp as? HTTPURLResponse else { throw WatchAPIError.decodeFailed }
    guard (200...299).contains(http.statusCode) else {
      throw WatchAPIError.httpStatus(http.statusCode)
    }
    return try mapDayResponseToEnvelope(data, locale: locale)
  }

  /// Bootstrap when credentialed; otherwise merge a single public day into cache.
  /// Stale/invalid Keychain tokens must not block refresh — fall back to public `/day`.
  static func refreshNetwork(locale: String, anchorDate: String) async throws -> WidgetEnvelope {
    let prefs = WatchPayloadStore.shared.loadPreferences()
    if WatchKeychain.hasCredential {
      do {
        return try await bootstrap(
          anchorDate: anchorDate,
          locale: locale,
          days: 7,
          birthDate: prefs?.birthDate,
          yijiMode: prefs?.yijiMode
        )
      } catch {
        NSLog(
          "[YuunWatch] bootstrap failed (\(error.localizedDescription)) — falling back to public /day"
        )
      }
    }
    let single = try await fetchPublicDay(date: anchorDate, locale: locale)
    if var existing = WatchPayloadStore.shared.envelope {
      var days = existing.data.days.filter { $0.date != anchorDate }
      days.append(contentsOf: single.data.days)
      days.sort { $0.date < $1.date }
      existing = WidgetEnvelope(
        updatedAt: single.updatedAt,
        appSlug: "yuun",
        locale: locale,
        freshUntil: single.freshUntil,
        data: WidgetEnvelopeData(days: days, chrome: single.data.chrome ?? existing.data.chrome)
      )
      // writeEnvelope merges tip/fit fields from prior cache.
      return existing
    }
    return single
  }

  private static func decodeEnvelope(_ data: Data) throws -> WidgetEnvelope {
    if let wrapped = try? JSONDecoder().decode(ApiOk<WidgetEnvelope>.self, from: data) {
      return wrapped.data
    }
    if let env = try? JSONDecoder().decode(WidgetEnvelope.self, from: data) {
      return env
    }
    throw WatchAPIError.decodeFailed
  }

  private static func mapDayResponseToEnvelope(_ data: Data, locale: String) throws -> WidgetEnvelope {
    let wrapped = try JSONDecoder().decode(ApiOk<DayPayload>.self, from: data)
    let day = try mapSharedDay(from: wrapped.data, locale: locale)
    let loc = WatchLocale.normalize(locale)
    let chrome = fallbackChrome(for: loc)
    let fresh = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    return WidgetEnvelope(
      updatedAt: ISO8601DateFormatter().string(from: Date()),
      appSlug: "yuun",
      locale: locale,
      freshUntil: ISO8601DateFormatter().string(from: fresh),
      data: WidgetEnvelopeData(days: [day], chrome: chrome)
    )
  }

  private struct ApiOk<T: Decodable>: Decodable {
    let ok: Bool?
    let data: T
  }

  private struct DayPayload: Decodable {
    let date: String
    let day: ApiDay
    let personalization: ApiPersonalization?
    let dailyHook: ApiHook?
  }

  private struct ApiDay: Decodable {
    let ganZhi: String
    let element: String?
    let goodFor: [String]?
    let avoid: [String]?
    let lunarDate: ApiLunar?
    let solarTermToday: ApiName?
    let dayOfficer: String?
    let mansion: ApiMansion?
    let clash: ApiClash?
    let yearGanZhi: ApiYear?
  }

  private struct ApiLunar: Decodable {
    let monthName: String
    let dayName: String
  }

  private struct ApiName: Decodable { let name: String }
  private struct ApiMansion: Decodable { let name: String }
  private struct ApiClash: Decodable { let clashAnimal: String }
  private struct ApiYear: Decodable { let stem: String; let branch: String; let animal: String }
  private struct ApiPersonalization: Decodable {
    let fit: String?
  }

  private struct ApiHook: Decodable {
    let title: String?
  }

  private static let elementColors: [String: String] = [
    "木": "#5B8C5A", "火": "#C25450", "土": "#A0845C", "金": "#8E9AA1", "水": "#4A6FA5",
  ]

  private static let stemColors: [String: String] = [
    "甲": "#5B8C5A", "乙": "#5B8C5A", "丙": "#C25450", "丁": "#C25450",
    "戊": "#A0845C", "己": "#A0845C", "庚": "#8E9AA1", "辛": "#8E9AA1",
    "壬": "#4A6FA5", "癸": "#4A6FA5",
  ]

  private static func mapSharedDay(from payload: DayPayload, locale: String) throws -> SharedDay {
    let d = payload.day
    let loc = WatchLocale.normalize(locale)
    let prefsMode = WatchPayloadStore.shared.loadPreferences()?.yijiMode
    let mode = WatchYijiVocab.resolveMode(prefsMode: prefsMode, locale: loc)
    let good = d.goodFor ?? []
    let avoid = d.avoid ?? []
    let yiShort = WatchYijiVocab.formatList(good, locale: loc, mode: mode, max: 2)
    let yiPlain = WatchYijiVocab.formatList(good, locale: loc, mode: mode, max: loc == .en ? 4 : 5)
    let yiLong = WatchYijiVocab.formatList(good, locale: loc, mode: mode, max: 6)
    let jiShort = WatchYijiVocab.formatList(avoid, locale: loc, mode: mode, max: 2)
    let jiPlain = WatchYijiVocab.formatList(avoid, locale: loc, mode: mode, max: loc == .en ? 4 : 5)
    let jiLong = WatchYijiVocab.formatList(avoid, locale: loc, mode: mode, max: 6)
    let lunar = [d.lunarDate?.monthName, d.lunarDate?.dayName]
      .compactMap { $0 }
      .joined()
    let stem = d.ganZhi.prefix(1)
    let color = d.element.flatMap { elementColors[$0] }
      ?? stemColors[String(stem)] ?? "#8E9AA1"
    let ymd = parseYmd(payload.date)
    let phase: Double = {
      guard let ymd else { return 0.5 }
      return moonPhaseSynodic(year: ymd.year, month: ymd.month, day: ymd.day)
    }()
    let yearLabel: String? = {
      guard let y = d.yearGanZhi else { return nil }
      return "\(y.stem)\(y.branch)年"
    }()
    return SharedDay(
      date: payload.date,
      ganZhi: d.ganZhi,
      elementColor: color,
      lunar: lunar,
      solarTerm: d.solarTermToday?.name ?? "",
      yi: yiPlain,
      ji: jiPlain,
      fit: payload.personalization?.fit,
      moonPhase: phase,
      officer: loc == .en ? nil : d.dayOfficer,
      mansion: loc == .en ? nil : d.mansion?.name,
      clashShengxiao: loc == .en ? nil : d.clash?.clashAnimal,
      ganzhiYear: loc == .en ? nil : yearLabel,
      yiShort: yiShort,
      jiShort: jiShort,
      yiLong: yiLong,
      jiLong: jiLong,
      // Public /day has no For-you summary — do not misuse dailyHook.title.
      fitSummary: nil,
      tipLabel: loc == .en ? nil : fallbackChrome(for: loc).tip
    )
  }

  private static func fallbackChrome(for locale: WatchLocale) -> SharedChrome {
    let ui = WatchI18n.strings(for: locale)
    return SharedChrome(
      good: ui.goodLabel,
      avoid: ui.avoidLabel,
      forYou: ui.forYouLabel,
      tip: locale == .en ? "" : (locale == .ja ? "一言" : (locale == .zhHant ? "日籤" : "日签")),
      lunarFallback: "—",
      emptyHint: ui.noData,
      moonPhaseNames: nil
    )
  }

  /// Synodic phase 0..1 — matches AlmanacEngine / hexastral-tokens.
  private static func moonPhaseSynodic(year: Int, month: Int, day: Int) -> Double {
    let refNewMoonMs: Double = 1_776_315_600_000
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(secondsFromGMT: 0)!
    var comps = DateComponents()
    comps.year = year
    comps.month = month
    comps.day = day
    comps.hour = 12
    guard let noon = cal.date(from: comps) else { return 0.5 }
    let ms = noon.timeIntervalSince1970 * 1000
    let cycle = 29.53059
    var p = ((ms - refNewMoonMs) / 86_400_000).truncatingRemainder(dividingBy: cycle) / cycle
    if p < 0 { p += 1 }
    return p
  }
}
