// Yuun — Home-screen + Lock-screen WidgetKit target (SwiftUI).
//
// Reads 黄历 from App Group (`group.com.hexastral.yuun`):
//   1) envelope key hexastral_widget_payload_v1 (preferred)
//   2) legacy key almanac_days
// Cache miss → AlmanacEngine public subset (no Pro fit).
//
// Families: systemSmall / Medium / Large + accessoryCircular / Rectangular.
// Wired by `@bacons/apple-targets` on `expo prebuild`.

import SwiftUI
import WidgetKit

// MARK: - Shared data

private let APP_GROUP = "group.com.hexastral.yuun"
private let LEGACY_DAYS_KEY = "almanac_days"
private let ENVELOPE_KEY = "hexastral_widget_payload_v1"
/// Plain chrome keys written by RN (survive stale TimelineEntry / decode drift).
private let LOCALE_KEY = "yuun_widget_locale"
private let TIP_LABEL_KEY = "yuun_widget_tip_label"
/// Written by RN `lib/dev-moon-phase.ts` (DEV only).
private let DEV_PHASE_KEY = "yuun_dev_moon_phase"

struct SharedDay: Codable {
  let date: String
  let ganZhi: String
  let elementColor: String
  let lunar: String
  let solarTerm: String
  let yi: String
  let ji: String
  let fit: String?
  let fitSummary: String?
  let dayTip: String?
  let tipLabel: String?
  let moonPhase: Double
  let officer: String?
  let mansion: String?
  let clashShengxiao: String?
  let ganzhiYear: String?
  let yiShort: String?
  let jiShort: String?
  let yiLong: String?
  let jiLong: String?
  let ganZhiPinyin: String?

  enum CodingKeys: String, CodingKey {
    case date, ganZhi, elementColor, lunar, solarTerm, yi, ji, fit, fitSummary, dayTip, tipLabel, moonPhase
    case officer, mansion, clashShengxiao, ganzhiYear, yiShort, jiShort, yiLong, jiLong, ganZhiPinyin
  }

  init(
    date: String, ganZhi: String, elementColor: String, lunar: String, solarTerm: String,
    yi: String, ji: String, fit: String?, moonPhase: Double,
    officer: String? = nil, mansion: String? = nil, clashShengxiao: String? = nil,
    ganzhiYear: String? = nil, yiShort: String? = nil, jiShort: String? = nil,
    yiLong: String? = nil, jiLong: String? = nil, ganZhiPinyin: String? = nil,
    fitSummary: String? = nil, dayTip: String? = nil, tipLabel: String? = nil
  ) {
    self.date = date
    self.ganZhi = ganZhi
    self.elementColor = elementColor
    self.lunar = lunar
    self.solarTerm = solarTerm
    self.yi = yi
    self.ji = ji
    self.fit = fit
    self.fitSummary = fitSummary
    self.dayTip = dayTip
    self.tipLabel = tipLabel
    self.moonPhase = moonPhase
    self.officer = officer
    self.mansion = mansion
    self.clashShengxiao = clashShengxiao
    self.ganzhiYear = ganzhiYear
    self.yiShort = yiShort
    self.jiShort = jiShort
    self.yiLong = yiLong
    self.jiLong = jiLong
    self.ganZhiPinyin = ganZhiPinyin
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    date = try c.decode(String.self, forKey: .date)
    ganZhi = try c.decode(String.self, forKey: .ganZhi)
    elementColor = try c.decode(String.self, forKey: .elementColor)
    lunar = try c.decode(String.self, forKey: .lunar)
    solarTerm = try c.decodeIfPresent(String.self, forKey: .solarTerm) ?? ""
    yi = try c.decode(String.self, forKey: .yi)
    ji = try c.decode(String.self, forKey: .ji)
    fit = try c.decodeIfPresent(String.self, forKey: .fit)
    fitSummary = try c.decodeIfPresent(String.self, forKey: .fitSummary)
    dayTip = try c.decodeIfPresent(String.self, forKey: .dayTip)
    tipLabel = try c.decodeIfPresent(String.self, forKey: .tipLabel)
    moonPhase = try c.decodeIfPresent(Double.self, forKey: .moonPhase) ?? 0.5
    officer = try c.decodeIfPresent(String.self, forKey: .officer)
    mansion = try c.decodeIfPresent(String.self, forKey: .mansion)
    clashShengxiao = try c.decodeIfPresent(String.self, forKey: .clashShengxiao)
    ganzhiYear = try c.decodeIfPresent(String.self, forKey: .ganzhiYear)
    yiShort = try c.decodeIfPresent(String.self, forKey: .yiShort)
    jiShort = try c.decodeIfPresent(String.self, forKey: .jiShort)
    yiLong = try c.decodeIfPresent(String.self, forKey: .yiLong)
    jiLong = try c.decodeIfPresent(String.self, forKey: .jiLong)
    ganZhiPinyin = try c.decodeIfPresent(String.self, forKey: .ganZhiPinyin)
  }
}

private struct LegacyPayload: Decodable {
  let days: [SharedDay]
  let locale: String?
}

/// Locale chrome written by RN (`toWidgetChrome`) — the App owns this copy.
struct SharedChrome: Decodable {
  let good: String?
  let avoid: String?
  let forYou: String?
  /// Empty string is meaningful: "paint no 日签 label" (en).
  let tip: String?
  let lunarFallback: String?
  let emptyHint: String?
  /// 8 names ordered new → waning-crescent (YUUN_MOON_PHASE_ORDER).
  let moonPhaseNames: [String]?
}

private struct EnvelopeData: Decodable {
  let days: [SharedDay]
  let chrome: SharedChrome?
}

private struct Envelope: Decodable {
  let updatedAt: String?
  let locale: String?
  let data: EnvelopeData
}

/// Read App Group JSON stored as String, Data, or already-deserialized Dictionary.
private func defaultsJSON(suite: UserDefaults, key: String) -> Data? {
  if let s = suite.string(forKey: key), let d = s.data(using: .utf8) { return d }
  if let d = suite.data(forKey: key) { return d }
  if let obj = suite.object(forKey: key),
     JSONSerialization.isValidJSONObject(obj),
     let d = try? JSONSerialization.data(withJSONObject: obj) {
    return d
  }
  return nil
}

private func normalizeLocale(_ raw: String) -> String {
  let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
  let lower = t.lowercased()
  if lower.hasPrefix("en") { return "en" }
  if lower.hasPrefix("ja") { return "ja" }
  if lower.contains("hant") || lower.contains("tw") || lower.contains("hk") || lower.contains("mo") {
    return "zh-Hant"
  }
  if lower.hasPrefix("zh") { return "zh-Hans" }
  return t
}

private func deviceLocaleFallback() -> String {
  let preferred = Locale.preferredLanguages.first ?? "en"
  return normalizeLocale(preferred)
}

private func loadLocale() -> String {
  guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return deviceLocaleFallback() }
  // Prefer plain string key (always updated with payload).
  if let loc = defaults.string(forKey: LOCALE_KEY), !loc.isEmpty {
    return normalizeLocale(loc)
  }
  if let data = defaultsJSON(suite: defaults, key: ENVELOPE_KEY),
     let env = try? JSONDecoder().decode(Envelope.self, from: data),
     let loc = env.locale,
     !loc.isEmpty {
    return normalizeLocale(loc)
  }
  if let data = defaultsJSON(suite: defaults, key: LEGACY_DAYS_KEY),
     let legacy = try? JSONDecoder().decode(LegacyPayload.self, from: data),
     let loc = legacy.locale,
     !loc.isEmpty {
    return normalizeLocale(loc)
  }
  return deviceLocaleFallback()
}

private func loadChrome() -> SharedChrome? {
  guard let defaults = UserDefaults(suiteName: APP_GROUP),
        let data = defaultsJSON(suite: defaults, key: ENVELOPE_KEY),
        let env = try? JSONDecoder().decode(Envelope.self, from: data)
  else { return nil }
  return env.data.chrome
}

/// 月相 caption under the logo. Names come exclusively from App i18n.
private func moonCaption(phase: Double, names: [String]?) -> String {
  var p = phase.truncatingRemainder(dividingBy: 1)
  if p < 0 { p += 1 }
  let idx: Int
  if p < 0.02 || p >= 0.98 { idx = 0 }
  else if p < 0.23 { idx = 1 }
  else if p < 0.27 { idx = 2 }
  else if p < 0.48 { idx = 3 }
  else if p < 0.52 { idx = 4 }
  else if p < 0.73 { idx = 5 }
  else if p < 0.77 { idx = 6 }
  else { idx = 7 }
  let lit = Int(((1 - cos(2 * Double.pi * p)) / 2 * 100).rounded())
  guard let names, names.count == 8 else { return "\(lit)%" }
  return "\(names[idx]) · \(lit)%"
}

private func loadDays() -> [SharedDay] {
  guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return [] }

  if let data = defaultsJSON(suite: defaults, key: ENVELOPE_KEY),
     let env = try? JSONDecoder().decode(Envelope.self, from: data) {
    return env.data.days
  }

  if let data = defaultsJSON(suite: defaults, key: LEGACY_DAYS_KEY),
     let payload = try? JSONDecoder().decode(LegacyPayload.self, from: data) {
    return payload.days
  }
  return []
}

private func ymd(_ date: Date) -> String {
  let f = DateFormatter()
  f.calendar = Calendar(identifier: .gregorian)
  f.dateFormat = "yyyy-MM-dd"
  return f.string(from: date)
}

private func color(_ hex: String) -> Color {
  var s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
  if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
  var v: UInt64 = 0
  Scanner(string: s).scanHexInt64(&v)
  return Color(
    red: Double((v >> 16) & 0xff) / 255,
    green: Double((v >> 8) & 0xff) / 255,
    blue: Double(v & 0xff) / 255
  )
}

/// DEV override from App Group, else the day's lunar phase.
private func phaseOf(_ day: SharedDay) -> Double {
  guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return day.moonPhase }
  // Prefer string (RN writes String to avoid ExtensionStorage setInt truncation).
  if let s = defaults.string(forKey: DEV_PHASE_KEY)?.trimmingCharacters(in: .whitespacesAndNewlines),
     !s.isEmpty,
     let v = Double(s),
     v >= 0,
     v <= 1 {
    return v
  }
  if let n = defaults.object(forKey: DEV_PHASE_KEY) as? NSNumber {
    let v = n.doubleValue
    // Reject legacy setInt truncations only when we also have a usable day phase
    // and the stored value looks like a bare int with no fractional intent —
    // actually 0 and 1 are valid phases; always trust NSNumber in [0,1].
    if v >= 0 && v <= 1 { return v }
  }
  return day.moonPhase
}

private func dayFor(_ date: Date) -> SharedDay? {
  let days = loadDays()
  let key = ymd(date)
  if let hit = days.first(where: { $0.date == key }) { return hit }
  if let first = days.first { return first }
  // P4: public subset when App has never written cache
  let cal = Calendar.current
  let y = cal.component(.year, from: date)
  let m = cal.component(.month, from: date)
  let d = cal.component(.day, from: date)
  return AlmanacEngine.publicDay(year: y, month: m, day: d)
}

// MARK: - Timeline

struct AlmanacEntry: TimelineEntry {
  let date: Date
  let day: SharedDay?
}

private let PLACEHOLDER = SharedDay(
  date: "—", ganZhi: "丁未", elementColor: "#A0845C", lunar: "四月十七",
  solarTerm: "芒种", yi: "祭祀 · 祈福 · 出行", ji: "安葬 · 求医", fit: nil, moonPhase: 0.5,
  officer: "成", mansion: "娄金狗", clashShengxiao: "鼠", ganzhiYear: "丙午年",
  yiShort: "祭祀 · 祈福", jiShort: "安葬 · 求医",
  yiLong: "祭祀 · 祈福 · 出行 · 开市 · 入学 · 修造", jiLong: "安葬 · 求医 · 动土"
)

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> AlmanacEntry {
    AlmanacEntry(date: Date(), day: PLACEHOLDER)
  }

  func getSnapshot(in context: Context, completion: @escaping (AlmanacEntry) -> Void) {
    completion(AlmanacEntry(date: Date(), day: dayFor(Date()) ?? PLACEHOLDER))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<AlmanacEntry>) -> Void) {
    let cal = Calendar.current
    let cached = loadDays()
    var entries: [AlmanacEntry] = []
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.dateFormat = "yyyy-MM-dd"

    if cached.isEmpty {
      // Generate 7 public days from today so the widget still updates overnight.
      for i in 0..<7 {
        guard let dayDate = cal.date(byAdding: .day, value: i, to: cal.startOfDay(for: Date())) else { continue }
        entries.append(AlmanacEntry(date: dayDate, day: dayFor(dayDate)))
      }
    } else {
      for d in cached {
        if let start = f.date(from: d.date).map({ cal.startOfDay(for: $0) }) {
          entries.append(AlmanacEntry(date: start, day: d))
        }
      }
    }

    if entries.isEmpty { entries = [AlmanacEntry(date: Date(), day: dayFor(Date()))] }
    // Refresh within the hour so locale/tip chrome updates without waiting until tomorrow.
    let refresh = Date().addingTimeInterval(60 * 30)
    completion(Timeline(entries: entries.sorted { $0.date < $1.date }, policy: .after(refresh)))
  }
}

// MARK: - Palette (Zinc type · 宣纸 / 星空 surfaces)

private struct WidgetPalette {
  let bg: Color
  let text: Color
  let secondary: Color
  let tertiary: Color
  let separator: Color
  let scheme: ColorScheme

  static func make(_ scheme: ColorScheme) -> WidgetPalette {
    if scheme == .light {
      return WidgetPalette(
        bg: color("#F5F0E8"), // ricePaper.ivory
        text: color("#09090B"),
        secondary: color("#71717A"),
        tertiary: color("#A1A1AA"),
        separator: color("#E4E4E7"),
        scheme: .light
      )
    }
    return WidgetPalette(
      bg: color("#0B0B0C"), // rubbing.void
      text: color("#FAFAFA"),
      secondary: color("#A1A1AA"),
      tertiary: color("#71717A"),
      separator: color("#27272A"),
      scheme: .dark
    )
  }
}

/// Deterministic 0…1 hash (no RNG) for grain / stars.
private func widgetHash(_ n: Double) -> Double {
  let x = sin(n * 12.9898) * 43758.5453
  return x - floor(x)
}

/// Light = 宣纸 wash + fibres; dark = 星空 void + stars.
private struct WidgetBackdrop: View {
  let scheme: ColorScheme

  var body: some View {
    Canvas { context, size in
      let w = size.width
      let h = size.height
      if scheme == .light {
        context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(color("#F5F0E8")))
        // Soft washes only — no fibre strokes (real 宣纸 has none).
        let wash = Gradient(colors: [
          color("#EDE6D8").opacity(0.28),
          color("#F5F0E8").opacity(0),
        ])
        context.fill(
          Path(ellipseIn: CGRect(x: w * -0.1, y: h * -0.25, width: w * 1.2, height: h)),
          with: .radialGradient(
            wash,
            center: CGPoint(x: w * 0.45, y: h * 0.28),
            startRadius: 0,
            endRadius: max(w, h) * 0.75
          )
        )
        let corner = Gradient(colors: [
          color("#DDD5C4").opacity(0.14),
          color("#F5F0E8").opacity(0),
        ])
        context.fill(
          Path(ellipseIn: CGRect(x: w * 0.45, y: h * 0.45, width: w * 0.7, height: h * 0.7)),
          with: .radialGradient(
            corner,
            center: CGPoint(x: w * 0.85, y: h * 0.85),
            startRadius: 0,
            endRadius: max(w, h) * 0.45
          )
        )
      } else {
        context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(color("#0B0B0C")))
        let glow = Gradient(colors: [
          color("#27272A").opacity(0.5),
          color("#0B0B0C").opacity(0),
        ])
        context.fill(
          Path(ellipseIn: CGRect(x: w * -0.15, y: h * -0.35, width: w * 1.3, height: h)),
          with: .radialGradient(
            glow,
            center: CGPoint(x: w * 0.5, y: h * 0.2),
            startRadius: 0,
            endRadius: max(w, h) * 0.7
          )
        )
        for i in 0..<40 {
          let x = widgetHash(Double(i) * 1.7 + 2) * w
          let y = widgetHash(Double(i) * 4.3 + 9) * h
          let r = 0.35 + widgetHash(Double(i) * 2.9) * 1.05
          let o = 0.22 + widgetHash(Double(i) * 6.1) * 0.55
          let star = CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)
          context.fill(Path(ellipseIn: star), with: .color(color("#D4D4D8").opacity(o)))
        }
      }
    }
  }
}

// MARK: - Phase logo (HexastralPlanetLogo port)

/// Physical moon: lit face always brighter than void (terminator), independent of
/// UI theme. Surface material only changes — warm ink-on-paper vs cool night zinc.
/// @see `getSphereColors` + `HexastralPlanetLogo` — do NOT invert lit/void with theme.
private struct YuunPhaseLogo: View {
  let phase: Double
  var scheme: ColorScheme = .dark

  private var litColor: Color {
    // Light chrome → warm cream lit; dark chrome → cool zinc lit. Always the BRIGHT side.
    scheme == .light ? color("#EDE6D8") : color("#FAFAFA")
  }
  private var voidColor: Color {
    // Always the DARK side (shadow), never swapped for light mode.
    scheme == .light ? color("#3C2415") : color("#121218")
  }
  private var strokeColor: Color {
    scheme == .light ? color("#3C2415").opacity(0.18) : Color.gray.opacity(0.25)
  }
  private let tiltDeg: Double = 22

  var body: some View {
    Canvas { context, size in
      let side = min(size.width, size.height)
      let cx = side / 2
      let cy = side / 2
      let R = side * 0.42
      let moon = CGRect(x: cx - R, y: cy - R, width: R * 2, height: R * 2)

      var p = phase.truncatingRemainder(dividingBy: 1)
      if p < 0 { p += 1 }
      let isWaning = p > 0.5
      // +1 at 朔 (new), -1 at 望 (full). Do NOT use abs(cos(fold)) — that
      // made new and full share termPos=0 (both looked fully lit).
      let cosPhase = cos(2 * Double.pi * p)
      let termPos = (1 + cosPhase) / 2

      let tilt = tiltDeg * Double.pi / 180
      let sign: CGFloat = isWaning ? -1 : 1
      let gx1 = CGPoint(x: cx - sign * R * cos(tilt), y: cy - R * sin(tilt))
      let gx2 = CGPoint(x: cx + sign * R * cos(tilt), y: cy + R * sin(tilt))

      let pw = 0.42
      let s0 = max(0, termPos - pw * 0.55)
      let s1 = max(0, termPos - pw * 0.12)
      let s2 = min(1, termPos + pw * 0.12)
      let s3 = min(1, termPos + pw * 0.5)

      context.fill(Path(ellipseIn: moon), with: .color(litColor))

      let shadow = Gradient(stops: [
        .init(color: voidColor.opacity(1), location: 0),
        .init(color: voidColor.opacity(1), location: s0),
        .init(color: voidColor.opacity(0.55), location: s1),
        .init(color: voidColor.opacity(0.12), location: s2),
        .init(color: voidColor.opacity(0), location: s3),
        .init(color: voidColor.opacity(0), location: 1),
      ])
      context.fill(
        Path(ellipseIn: moon),
        with: .linearGradient(shadow, startPoint: gx1, endPoint: gx2)
      )

      let limb = Gradient(stops: [
        .init(color: .black.opacity(0), location: 0),
        .init(color: .black.opacity(0), location: 0.72),
        .init(color: .black.opacity(0.1), location: 1),
      ])
      context.fill(
        Path(ellipseIn: moon),
        with: .radialGradient(limb, center: CGPoint(x: cx, y: cy), startRadius: 0, endRadius: R)
      )

      context.stroke(
        Path(ellipseIn: moon),
        with: .color(strokeColor),
        lineWidth: max(0.5, side * 0.012)
      )
    }
    .aspectRatio(1, contentMode: .fit)
  }
}

// MARK: - Views

struct AuspiceWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  @Environment(\.colorScheme) var colorScheme
  var entry: Provider.Entry

  private var palette: WidgetPalette { .make(colorScheme) }
  private var locale: String { loadLocale() }
  private var isEn: Bool { normalizeLocale(locale) == "en" }

  /// Copy written by the App (i18n tables). Nil until the first sync.
  private var appChrome: SharedChrome? { loadChrome() }

  private var goodLabel: String { appChrome?.good ?? "" }
  private var avoidLabel: String { appChrome?.avoid ?? "" }
  private var forYouLabel: String { appChrome?.forYou ?? "" }

  /// Always re-read App Group so we do not paint a stale TimelineEntry (日签 vs Tip).
  private var liveDay: SharedDay? {
    dayFor(entry.date) ?? entry.day
  }

  private var tipLabelChrome: String? {
    guard let tip = appChrome?.tip, !tip.isEmpty else { return nil }
    return tip
  }

  /// Prefer plain tip key → day.tipLabel → locale chrome.
  /// en: never paint 日签/日籤 (hide label; body-only). Stale App Group keys ignored.
  private func resolvedTipLabel(_ d: SharedDay) -> String? {
    if isEn { return nil }
    if let tip = d.dayTip {
      let cjk = tip.unicodeScalars.filter { $0.value >= 0x4E00 && $0.value <= 0x9FFF }.count
      let hasLatin = tip.unicodeScalars.contains { scalar in
        Character(scalar).isLetter && scalar.isASCII
      }
      if hasLatin && cjk == 0 { return nil }
    }
    if let defaults = UserDefaults(suiteName: APP_GROUP),
       let keyLabel = defaults.string(forKey: TIP_LABEL_KEY),
       !keyLabel.isEmpty {
      if keyLabel == "日签" || keyLabel == "日籤" { return tipLabelChrome }
      return keyLabel
    }
    if let label = d.tipLabel, !label.isEmpty {
      if label == "日签" || label == "日籤", normalizeLocale(locale) == "en" { return nil }
      return label
    }
    return tipLabelChrome
  }

  var body: some View {
    Group {
      if let d = liveDay {
        switch family {
        case .systemSmall: small(d)
        case .systemMedium: medium(d)
        case .systemLarge: large(d)
        case .accessoryCircular: circular(d)
        case .accessoryRectangular: rectangular(d)
        default: medium(d)
        }
      } else {
        Text(appChrome?.emptyHint ?? "Yuun")
          .font(.system(size: 13))
          .foregroundColor(palette.secondary)
          .padding()
      }
    }
    .containerBackground(for: .widget) {
      switch family {
      case .accessoryCircular, .accessoryRectangular, .accessoryInline:
        AccessoryWidgetBackground()
      default:
        WidgetBackdrop(scheme: palette.scheme)
      }
    }
  }

  private func lunarMeta(_ d: SharedDay) -> String {
    let lunar = d.lunar.trimmingCharacters(in: .whitespacesAndNewlines)
    // en: lunar / numeric only — omit 丙午年 to cut CJK density.
    if isEn {
      if lunar.isEmpty || lunar == "—" { return d.date }
      return lunar
    }
    let year = (d.ganzhiYear ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    if lunar.isEmpty || lunar == "—" {
      return year.isEmpty ? d.date : year
    }
    if year.isEmpty { return lunar }
    return "\(lunar) · \(year)"
  }

  /// Wiktionary-style English headword: toned Hanyu Pinyin first, Han form
  /// retained in parentheses. Old cached payloads without pinyin keep CJK.
  private func ganZhiHeadword(_ d: SharedDay) -> String {
    guard isEn, let pinyin = d.ganZhiPinyin, !pinyin.isEmpty else { return d.ganZhi }
    return "\(pinyin) (\(d.ganZhi))"
  }

  /// Verb budget per family: `.short` = 2 verbs (small / lock), `.plain` = 4–5
  /// (medium column), `.long` = 6 (large, full width).
  private enum YiJiVariant { case short, plain, long }

  private func yiJiBlock(
    _ d: SharedDay,
    yiSize: CGFloat,
    maxLines: Int,
    variant: YiJiVariant = .plain
  ) -> some View {
    let yiText: String
    let jiText: String
    switch variant {
    case .short:
      yiText = d.yiShort ?? d.yi
      jiText = d.jiShort ?? d.ji
    case .plain:
      yiText = d.yi
      jiText = d.ji
    case .long:
      yiText = d.yiLong ?? d.yi
      jiText = d.jiLong ?? d.ji
    }
    // Short lines are single-line by contract — scale rather than truncate so
    // both verbs survive on narrow small-widget widths.
    let scale: CGFloat = variant == .short ? 0.8 : 1
    return VStack(alignment: .leading, spacing: 3) {
      Text("\(goodLabel) \(yiText)")
        .font(.system(size: yiSize))
        .foregroundColor(palette.text)
        .lineLimit(maxLines)
        .minimumScaleFactor(scale)
        .truncationMode(.tail)
      Text("\(avoidLabel) \(jiText)")
        .font(.system(size: yiSize))
        .foregroundColor(palette.secondary)
        .lineLimit(maxLines)
        .minimumScaleFactor(scale)
        .truncationMode(.tail)
    }
  }

  private func small(_ d: SharedDay) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top, spacing: 10) {
        YuunPhaseLogo(phase: phaseOf(d), scheme: palette.scheme)
          .frame(width: 34, height: 34)
        VStack(alignment: .trailing, spacing: 2) {
          Text(
            d.lunar == "—" || d.lunar.isEmpty
              ? (appChrome?.lunarFallback ?? d.date)
              : d.lunar
          )
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(palette.text)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
          if !isEn, let year = d.ganzhiYear, !year.isEmpty {
            Text(year)
              .font(.system(size: 12))
              .foregroundColor(palette.secondary)
              .lineLimit(1)
          } else if !d.solarTerm.isEmpty {
            Text(d.solarTerm)
              .font(.system(size: 12))
              .foregroundColor(palette.secondary)
              .lineLimit(1)
          }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
      }

      Spacer(minLength: 4)

      Text(ganZhiHeadword(d))
        .font(.system(size: isEn ? 22 : 28, weight: .light))
        .tracking(isEn ? 0 : 2)
        .foregroundColor(palette.text)
        .lineLimit(1)
        .minimumScaleFactor(0.75)

      Spacer(minLength: 4)

      yiJiBlock(d, yiSize: 13, maxLines: 1, variant: .short)
    }
    .padding(14)
  }

  /// 对你而言 summary, else the preset day tip — the sentence for medium/large.
  private func sentence(_ d: SharedDay) -> String? {
    if let summary = d.fitSummary, !summary.isEmpty { return summary }
    if let tip = d.dayTip, !tip.isEmpty { return tip }
    return nil
  }

  private func medium(_ d: SharedDay) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(alignment: .top, spacing: 14) {
        VStack(spacing: 4) {
          YuunPhaseLogo(phase: phaseOf(d), scheme: palette.scheme)
            .frame(width: 42, height: 42)
          Text(ganZhiHeadword(d))
            .font(.system(size: isEn ? 16 : 20, weight: .light))
            .foregroundColor(palette.text)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
          Text(lunarMeta(d))
            .font(.system(size: 11))
            .foregroundColor(palette.secondary)
            .lineLimit(1)
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.75)
        }
        .frame(width: 98)

        VStack(alignment: .leading, spacing: 4) {
          if !d.solarTerm.isEmpty {
            Text(d.solarTerm)
              .font(.system(size: 11))
              .foregroundColor(palette.tertiary)
              .lineLimit(1)
          }
          yiJiBlock(d, yiSize: 14, maxLines: 2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }

      Spacer(minLength: 0)

      // The full sentence owns the footer width. English omits the redundant
      // Favorable / Neutral / Caution category and leads with “For you”.
      VStack(alignment: .leading, spacing: 2) {
        if let fit = d.fit, !isEn {
          Text("\(forYouLabel) · \(fit)")
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(palette.text)
            .lineLimit(1)
        }
        if let line = sentence(d) {
          Text(isEn && d.fitSummary != nil ? "\(forYouLabel) · \(line)" : line)
            .font(.system(size: 12))
            .foregroundColor(palette.secondary)
            .lineLimit(2)
            .truncationMode(.tail)
        }
      }
    }
    .padding(16)
  }

  private func large(_ d: SharedDay) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 4) {
          Text(lunarMeta(d))
            .font(.system(size: 15, weight: .medium))
            .foregroundColor(palette.text)
          if !d.solarTerm.isEmpty {
            Text(d.solarTerm)
              .font(.system(size: 13))
              .foregroundColor(palette.secondary)
          }
          Text(d.date)
            .font(.system(size: 12))
            .foregroundColor(palette.tertiary)
        }
        Spacer()
        VStack(spacing: 4) {
          YuunPhaseLogo(phase: phaseOf(d), scheme: palette.scheme)
            .frame(width: 58, height: 58)
          Text(moonCaption(phase: phaseOf(d), names: appChrome?.moonPhaseNames))
            .font(.system(size: 10))
            .foregroundColor(palette.tertiary)
            .lineLimit(1)
        }
      }

      HStack(alignment: .bottom, spacing: 8) {
        VStack(alignment: .leading, spacing: 0) {
          Text(isEn ? (d.ganZhiPinyin ?? d.ganZhi) : d.ganZhi)
            .font(.system(size: isEn ? 25 : 34, weight: .light))
            .foregroundColor(palette.text)
          // en 副标 — the day pillar is otherwise opaque without CJK.
          if let pinyin = d.ganZhiPinyin, !pinyin.isEmpty {
            Text("(\(d.ganZhi))")
              .font(.system(size: 12))
              .tracking(0.5)
              .foregroundColor(palette.secondary)
              .lineLimit(1)
          }
        }
        if !isEn, let officer = d.officer {
          Text("\(officer)日")
            .font(.system(size: 14))
            .foregroundColor(palette.secondary)
            .padding(.bottom, 5)
        }
      }

      if !isEn, let mansion = d.mansion {
        Text("\(mansion)\(d.clashShengxiao.map { " · 冲\($0)" } ?? "")")
          .font(.system(size: 13))
          .foregroundColor(palette.secondary)
          .lineLimit(1)
      }

      // Slack sits above the 宜忌 rule so the almanac block + footer stay on the
      // bottom edge — en drops 值神/二十八宿 and used to leave a hole down there.
      Spacer(minLength: 4)

      Rectangle().fill(palette.separator).frame(height: 0.5)

      yiJiBlock(d, yiSize: 16, maxLines: 2, variant: .long)

      Rectangle().fill(palette.separator).frame(height: 0.5)

      if d.fit != nil || d.fitSummary != nil {
        VStack(alignment: .leading, spacing: 4) {
          Text(isEn ? forYouLabel : "\(forYouLabel) · \(d.fit ?? "")")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(palette.text)
            .lineLimit(1)
          if let summary = d.fitSummary, !summary.isEmpty {
            Text(summary)
              .font(.system(size: 14))
              .foregroundColor(palette.secondary)
              .lineLimit(3)
          }
        }
      }

      if let tip = d.dayTip, !tip.isEmpty {
        VStack(alignment: .leading, spacing: 4) {
          if let label = resolvedTipLabel(d) {
            Text(label)
              .font(.system(size: 11))
              .tracking(1)
              .foregroundColor(palette.tertiary)
              .lineLimit(1)
          }
          Text(tip)
            .font(.system(size: 14))
            .foregroundColor(d.fit == nil ? palette.text : palette.secondary)
            .lineLimit(3)
            .truncationMode(.tail)
        }
      }
    }
    .padding(18)
  }

  private func circular(_ d: SharedDay) -> some View {
    VStack(spacing: 2) {
      YuunPhaseLogo(phase: phaseOf(d), scheme: palette.scheme)
        .frame(width: 20, height: 20)
      Text(isEn ? (d.ganZhiPinyin ?? d.ganZhi) : d.ganZhi)
        .font(.system(size: 12, weight: .semibold))
        .minimumScaleFactor(0.7)
        .lineLimit(1)
        .widgetAccentable()
    }
  }

  private func rectangular(_ d: SharedDay) -> some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(ganZhiHeadword(d)).font(.headline).widgetAccentable()
      Text("\(goodLabel) \(d.yiShort ?? d.yi)")
        .font(.caption2)
        .foregroundColor(.secondary)
        .lineLimit(1)
        .minimumScaleFactor(0.85)
      Text("\(avoidLabel) \(d.jiShort ?? d.ji)")
        .font(.caption2)
        .foregroundColor(.secondary)
        .lineLimit(1)
        .minimumScaleFactor(0.85)
    }
  }
}

// MARK: - Widget

private enum WidgetGallery {
  static func displayName(_ locale: String) -> String {
    switch normalizeLocale(locale) {
    case "en": return "Yuun Almanac"
    case "ja": return "Yuun 黄暦"
    case "zh-Hant": return "Yuun 黃曆"
    default: return "Yuun 黄历"
    }
  }

  static func description(_ locale: String) -> String {
    switch normalizeLocale(locale) {
    case "en": return "Daily almanac · pillars · moon · For you"
    case "ja": return "毎日の宜忌 · 干支 · 月相 · あなたへ"
    case "zh-Hant": return "每日宜忌 · 干支 · 月相 · 對你而言"
    default: return "每日宜忌 · 干支 · 月相 · 对你而言"
    }
  }
}

struct AuspiceWidget: Widget {
  let kind = "AuspiceWidget"
  var body: some WidgetConfiguration {
    let loc = loadLocale()
    return StaticConfiguration(kind: kind, provider: Provider()) { entry in
      AuspiceWidgetEntryView(entry: entry)
    }
    .configurationDisplayName(WidgetGallery.displayName(loc))
    .description(WidgetGallery.description(loc))
    .supportedFamilies([
      .systemSmall, .systemMedium, .systemLarge,
      .accessoryCircular, .accessoryRectangular,
    ])
  }
}

@main
struct AuspiceWidgetBundle: WidgetBundle {
  var body: some Widget { AuspiceWidget() }
}
