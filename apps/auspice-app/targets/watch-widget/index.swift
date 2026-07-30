// Yuun — watchOS WidgetKit complications (circular / rectangular / corner / inline).
//
// Same App Group as iPhone widget (`group.com.hexastral.yuun`):
//   envelope hexastral_widget_payload_v1 · legacy almanac_days
//   optional DEV override yuun_dev_moon_phase
//
// Chrome: compact CJK only (宜忌 / 干支). solarTerm only when non-empty
// (RN writes it solely on 节气当日 via solarTermToday).

import SwiftUI
import WidgetKit

private let APP_GROUP = "group.com.hexastral.yuun"
private let ENVELOPE_KEY = "hexastral_widget_payload_v1"
private let LEGACY_DAYS_KEY = "almanac_days"
private let LOCALE_KEY = "yuun_widget_locale"
private let TIP_LABEL_KEY = "yuun_widget_tip_label"
private let DEV_PHASE_KEY = "yuun_dev_moon_phase"

/// Rectangular 宜/忌 verb cap. Three fits the widest slot without an ellipsis;
/// letting the full `yiLong` list truncate just paints a `…` nobody can read.
private let RECT_VERBS = 3

// MARK: - Data

struct WatchChrome: Codable {
  var good: String?
  var avoid: String?
  var tip: String?
  var emptyHint: String?
}

struct WatchDay: Codable {
  var date: String
  var ganZhi: String
  var yi: String
  var ji: String?
  var yiShort: String?
  var jiShort: String?
  var yiLong: String?
  var jiLong: String?
  var fit: String?
  var moonPhase: Double
  var lunar: String?
  var solarTerm: String?
  var officer: String?
  var dayTip: String?
  var tipLabel: String?

  enum CodingKeys: String, CodingKey {
    case date, ganZhi, yi, ji, yiShort, jiShort, fit, moonPhase, lunar, solarTerm, officer
    case yiLong, jiLong
    case dayTip, tipLabel
  }

  init(
    date: String, ganZhi: String, yi: String, moonPhase: Double,
    ji: String? = nil, yiShort: String? = nil, jiShort: String? = nil,
    yiLong: String? = nil, jiLong: String? = nil,
    fit: String? = nil, lunar: String? = nil, solarTerm: String? = nil,
    officer: String? = nil, dayTip: String? = nil, tipLabel: String? = nil
  ) {
    self.date = date
    self.ganZhi = ganZhi
    self.yi = yi
    self.ji = ji
    self.yiShort = yiShort
    self.jiShort = jiShort
    self.yiLong = yiLong
    self.jiLong = jiLong
    self.fit = fit
    self.moonPhase = moonPhase
    self.lunar = lunar
    self.solarTerm = solarTerm
    self.officer = officer
    self.dayTip = dayTip
    self.tipLabel = tipLabel
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    date = try c.decode(String.self, forKey: .date)
    ganZhi = try c.decode(String.self, forKey: .ganZhi)
    yi = try c.decodeIfPresent(String.self, forKey: .yi) ?? "—"
    ji = try c.decodeIfPresent(String.self, forKey: .ji)
    yiShort = try c.decodeIfPresent(String.self, forKey: .yiShort)
    jiShort = try c.decodeIfPresent(String.self, forKey: .jiShort)
    yiLong = try c.decodeIfPresent(String.self, forKey: .yiLong)
    jiLong = try c.decodeIfPresent(String.self, forKey: .jiLong)
    fit = try c.decodeIfPresent(String.self, forKey: .fit)
    moonPhase = try c.decodeIfPresent(Double.self, forKey: .moonPhase) ?? 0.5
    lunar = try c.decodeIfPresent(String.self, forKey: .lunar)
    solarTerm = try c.decodeIfPresent(String.self, forKey: .solarTerm)
    officer = try c.decodeIfPresent(String.self, forKey: .officer)
    dayTip = try c.decodeIfPresent(String.self, forKey: .dayTip)
    tipLabel = try c.decodeIfPresent(String.self, forKey: .tipLabel)
  }
}

private struct Legacy: Codable { var days: [WatchDay] }
private struct EnvData: Codable { var days: [WatchDay]; var chrome: WatchChrome? }
private struct Env: Codable { var data: EnvData; var locale: String? }

private var cachedChrome: WatchChrome?
private var cachedTipLabel: String?
private var cachedLocale: String?

private func ymd(_ date: Date) -> String {
  let f = DateFormatter()
  f.calendar = Calendar(identifier: .gregorian)
  f.dateFormat = "yyyy-MM-dd"
  return f.string(from: date)
}

/// Pure tag matcher — unknown tags land on `en`.
private func matchLocale(_ tag: String) -> String {
  let t = tag.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
  if t.hasPrefix("en") { return "en" }
  if t.hasPrefix("ja") { return "ja" }
  if t.contains("hant") || t.contains("tw") || t.contains("hk") { return "zh-Hant" }
  if t.hasPrefix("zh") { return "zh-Hans" }
  return "en"
}

/// Payload locale, falling back to the Watch's own language when absent — a
/// complication placed before the first sync must not force English chrome.
private func normalizeLocale(_ raw: String?) -> String {
  let t = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
  if t.isEmpty { return matchLocale(Locale.preferredLanguages.first ?? "en") }
  return matchLocale(t)
}

/// Gallery text is built when `body` is evaluated, before any timeline load, so it
/// cannot rely on `cachedLocale` — read the App Group directly.
private func loadLocale() -> String {
  guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return normalizeLocale(nil) }
  if let loc = defaults.string(forKey: LOCALE_KEY), !loc.isEmpty { return normalizeLocale(loc) }
  if let json = defaults.string(forKey: ENVELOPE_KEY),
     let data = json.data(using: .utf8),
     let env = try? JSONDecoder().decode(Env.self, from: data),
     let loc = env.locale,
     !loc.isEmpty {
    return normalizeLocale(loc)
  }
  return normalizeLocale(nil)
}

private func goodLabel() -> String {
  if let g = cachedChrome?.good, !g.isEmpty { return g }
  switch normalizeLocale(cachedLocale) {
  case "ja": return "向く"
  case "en": return "Good"
  default: return "宜"
  }
}

private func avoidLabel() -> String {
  if let a = cachedChrome?.avoid, !a.isEmpty { return a }
  switch normalizeLocale(cachedLocale) {
  case "ja": return "避ける"
  case "en": return "Avoid"
  default: return "忌"
  }
}

private func emptyHint() -> String {
  if let h = cachedChrome?.emptyHint, !h.isEmpty { return h }
  switch normalizeLocale(cachedLocale) {
  case "zh-Hant": return "打開 Yuun 同步"
  case "ja": return "Yuun を開いて同期"
  case "en": return "Open Yuun to sync"
  default: return "打开 Yuun 同步"
  }
}

/// Prefer solarTerm on 节气当日; otherwise ganZhi.
private func dateInfo(_ d: WatchDay?) -> String {
  guard let d else { return "Yuun" }
  if let term = d.solarTerm, !term.isEmpty { return term }
  return d.ganZhi
}

/// 农历 (+ 节气 on 节气当日) — secondary caption beside 干支 where width allows.
/// Already localized upstream: RN / bootstrap emit `6/15` for en, `六月十五` for zh/ja.
private func lunarMeta(_ d: WatchDay?) -> String {
  guard let d else { return "" }
  return [d.lunar, d.solarTerm]
    .compactMap { $0 }
    .filter { !$0.isEmpty }
    .joined(separator: " · ")
}

/// First non-empty of `candidates` (widest field first), split into verbs.
/// `max: nil` keeps them all.
///
/// Split on the bullet only, then trim: `topVerbs` joins with `" · "` on en/ja and
/// `"·"` on zh, and several en glosses are multi-word (`Move in`, `Bless idol`,
/// `Mourn end`). Treating a bare space as a separator shears those into fragments.
private func verbParts(_ candidates: [String?], max: Int? = nil) -> [String] {
  let source = candidates
    .compactMap { $0 }
    .first { !$0.isEmpty } ?? ""
  let parts = source
    .split(whereSeparator: { $0 == "·" || $0 == "•" })
    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
    .filter { !$0.isEmpty }
  if parts.isEmpty { return ["—"] }
  guard let max else { return parts }
  return Array(parts.prefix(max))
}

private func loadToday() -> WatchDay? {
  guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return nil }
  let today = ymd(Date())

  func pick(_ days: [WatchDay]) -> WatchDay? {
    days.first { $0.date == today }
  }

  if let tip = defaults.string(forKey: TIP_LABEL_KEY), !tip.isEmpty {
    cachedTipLabel = tip
  }
  if let loc = defaults.string(forKey: LOCALE_KEY), !loc.isEmpty {
    cachedLocale = loc
  }

  if let json = defaults.string(forKey: ENVELOPE_KEY),
     let data = json.data(using: .utf8),
     let env = try? JSONDecoder().decode(Env.self, from: data) {
    cachedChrome = env.data.chrome
    if let loc = env.locale, !loc.isEmpty { cachedLocale = loc }
    if cachedTipLabel == nil, let tip = env.data.chrome?.tip, !tip.isEmpty {
      cachedTipLabel = tip
    }
    return pick(env.data.days)
  }
  if let json = defaults.string(forKey: LEGACY_DAYS_KEY),
     let data = json.data(using: .utf8),
     let leg = try? JSONDecoder().decode(Legacy.self, from: data) {
    return pick(leg.days)
  }
  return nil
}

private func phaseOf(_ day: WatchDay) -> Double {
  guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return day.moonPhase }
  if let s = defaults.string(forKey: DEV_PHASE_KEY)?.trimmingCharacters(in: .whitespacesAndNewlines),
     !s.isEmpty,
     let v = Double(s),
     v >= 0, v <= 1 {
    return v
  }
  if let n = defaults.object(forKey: DEV_PHASE_KEY) as? NSNumber {
    let v = n.doubleValue
    if v >= 0 && v <= 1 { return v }
  }
  return day.moonPhase
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

// MARK: - Phase logo (compact — same math as iPhone YuunPhaseLogo)

private struct WatchPhaseLogo: View {
  let phase: Double

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
      let cosPhase = cos(2 * Double.pi * p)
      let termPos = (1 + cosPhase) / 2
      let tilt = 22.0 * Double.pi / 180
      let sign: CGFloat = isWaning ? -1 : 1
      let gx1 = CGPoint(x: cx - sign * R * cos(tilt), y: cy - R * sin(tilt))
      let gx2 = CGPoint(x: cx + sign * R * cos(tilt), y: cy + R * sin(tilt))
      let pw = 0.42
      let s0 = max(0, termPos - pw * 0.55)
      let s1 = max(0, termPos - pw * 0.12)
      let s2 = min(1, termPos + pw * 0.12)
      let s3 = min(1, termPos + pw * 0.5)

      let lit = color("#FAFAFA")
      let voidC = color("#121218")

      context.fill(Path(ellipseIn: moon), with: .color(lit))
      let shadow = Gradient(stops: [
        .init(color: voidC.opacity(1), location: 0),
        .init(color: voidC.opacity(1), location: s0),
        .init(color: voidC.opacity(0.55), location: s1),
        .init(color: voidC.opacity(0.12), location: s2),
        .init(color: voidC.opacity(0), location: s3),
        .init(color: voidC.opacity(0), location: 1),
      ])
      context.fill(Path(ellipseIn: moon), with: .linearGradient(shadow, startPoint: gx1, endPoint: gx2))
    }
    .aspectRatio(1, contentMode: .fit)
  }
}

// MARK: - Timeline

struct WatchEntry: TimelineEntry {
  let date: Date
  let day: WatchDay?
}

/// Gallery preview sample. Verbs follow the payload locale so an en picker never
/// previews CJK almanac terms — `Yuun` itself is the brand and stays untranslated.
private func placeholderDay(_ locale: String) -> WatchDay {
  if locale == "en" {
    return WatchDay(
      date: "—", ganZhi: "乙巳", yi: "Wedding·Travel", moonPhase: 0.5,
      ji: "Funeral·Groundwork", yiShort: "Wedding", jiShort: "Funeral",
      yiLong: "Wedding·Travel·Opening·Blessing", jiLong: "Funeral·Groundwork",
      lunar: "6/15", solarTerm: ""
    )
  }
  return WatchDay(
    date: "—", ganZhi: "乙巳", yi: "开市·嫁娶·出行", moonPhase: 0.5,
    ji: "安葬·动土", yiShort: "开市·嫁娶", jiShort: "安葬",
    yiLong: "开市·嫁娶·出行·祈福·纳财", jiLong: "安葬·动土·破土",
    lunar: "六月十五", solarTerm: "", officer: "成"
  )
}

private enum WatchGallery {
  static func description(_ locale: String) -> String {
    switch locale {
    case "en": return "Moon · pillars · lunar date · Good/Avoid"
    case "ja": return "月相 · 干支 · 旧暦 · 向く/避ける"
    case "zh-Hant": return "月相 · 干支 · 農曆 · 宜忌"
    default: return "月相 · 干支 · 农历 · 宜忌"
    }
  }
}

struct WatchProvider: TimelineProvider {
  func placeholder(in context: Context) -> WatchEntry {
    WatchEntry(date: Date(), day: placeholderDay(loadLocale()))
  }

  /// Picker preview — fall back to the sample so an unsynced Watch still previews a
  /// filled slot. `getTimeline` must **not** do this: on the face, no data is real
  /// state and has to surface `emptyHint`.
  func getSnapshot(in context: Context, completion: @escaping (WatchEntry) -> Void) {
    completion(WatchEntry(date: Date(), day: loadToday() ?? placeholderDay(loadLocale())))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<WatchEntry>) -> Void) {
    let entry = WatchEntry(date: Date(), day: loadToday())
    // Refresh near local midnight so 节气当日 flips correctly.
    let cal = Calendar.current
    let tomorrow = cal.startOfDay(for: cal.date(byAdding: .day, value: 1, to: Date()) ?? Date())
    let inSixHours = Date().addingTimeInterval(6 * 3600)
    let next = min(tomorrow, inSixHours)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

// MARK: - Views

struct WatchComplicationView: View {
  @Environment(\.widgetFamily) var family
  var entry: WatchEntry

  var body: some View {
    let d = entry.day
    switch family {
    case .accessoryCircular:
      circular(d)
    case .accessoryRectangular:
      rectangular(d)
    case .accessoryCorner:
      corner(d)
    case .accessoryInline:
      inline(d)
    default:
      Text(d?.ganZhi ?? "Yuun").font(.headline)
    }
  }

  /// Moon + date info: solarTerm on 节气当日, otherwise ganZhi.
  private func circular(_ d: WatchDay?) -> some View {
    ZStack {
      AccessoryWidgetBackground()
      VStack(spacing: 1) {
        if let d {
          WatchPhaseLogo(phase: phaseOf(d))
            .frame(width: 14, height: 14)
        }
        Text(dateInfo(d))
          .font(.system(size: 11, weight: .semibold))
          .widgetAccentable()
          .minimumScaleFactor(0.7)
          .lineLimit(1)
      }
      .padding(2)
    }
  }

  /// 月相 + 干支 + 农历 (+ 节气) on one line, then 宜 / 忌 one line each. Capped at
  /// `RECT_VERBS`, so a mild scale-down absorbs long locales (en verbs run ~3x CJK)
  /// instead of truncating — the verb count bounds how much the size can drift.
  private func rectangular(_ d: WatchDay?) -> some View {
    let meta = lunarMeta(d)
    return VStack(alignment: .leading, spacing: 1) {
      HStack(spacing: 4) {
        if let d {
          WatchPhaseLogo(phase: phaseOf(d))
            .frame(width: 14, height: 14)
        }
        Text(d?.ganZhi ?? "Yuun")
          .font(.headline)
          .widgetAccentable()
          .lineLimit(1)
        if !meta.isEmpty {
          Text(meta)
            .font(.caption2)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }
      Text(yiLine(d))
        .font(.caption2)
        .foregroundStyle(.secondary)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
      Text(jiLine(d))
        .font(.caption2)
        .foregroundStyle(.secondary)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
    }
  }

  /// Center moon; curved label = solarTerm on 节气当日 else ganZhi.
  private func corner(_ d: WatchDay?) -> some View {
    Group {
      if let d {
        WatchPhaseLogo(phase: phaseOf(d))
          .frame(width: 18, height: 18)
          .widgetLabel {
            Text(dateInfo(d))
          }
      } else {
        Text("Yuun")
          .font(.caption)
          .widgetAccentable()
      }
    }
  }

  /// Single-line: 宜 one verb · 忌 one verb (keep both sides of the almanac).
  private func inline(_ d: WatchDay?) -> some View {
    Text(inlineYiJi(d))
      .lineLimit(1)
  }

  /// Widest field first — `yiShort` is capped at 2 verbs by the RN bridge / bootstrap.
  private func yiLine(_ d: WatchDay?) -> String {
    guard let d else { return emptyHint() }
    let verbs = verbParts([d.yiLong, d.yi, d.yiShort], max: RECT_VERBS).joined(separator: "·")
    return "\(goodLabel()) \(verbs)"
  }

  private func jiLine(_ d: WatchDay?) -> String {
    guard let d else { return emptyHint() }
    let verbs = verbParts([d.jiLong, d.ji, d.jiShort], max: RECT_VERBS).joined(separator: "·")
    return "\(avoidLabel()) \(verbs)"
  }

  private func inlineYiJi(_ d: WatchDay?) -> String {
    guard let d else { return emptyHint() }
    let yi = verbParts([d.yiShort, d.yi], max: 1).first ?? "—"
    let ji = verbParts([d.jiShort, d.ji], max: 1).first ?? "—"
    return "\(goodLabel()) \(yi) · \(avoidLabel()) \(ji)"
  }
}

// MARK: - Widget

struct YuunWatchWidget: Widget {
  let kind = "YuunWatch"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WatchProvider()) { entry in
      WatchComplicationView(entry: entry)
        .containerBackground(for: .widget) {
          AccessoryWidgetBackground()
        }
    }
    .configurationDisplayName("Yuun")
    .description(WatchGallery.description(loadLocale()))
    .supportedFamilies([
      .accessoryCircular,
      .accessoryRectangular,
      .accessoryCorner,
      .accessoryInline,
    ])
  }
}

@main
struct YuunWatchBundle: WidgetBundle {
  var body: some Widget {
    YuunWatchWidget()
  }
}
