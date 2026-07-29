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
private let DEV_PHASE_KEY = "yuun_dev_moon_phase"

// MARK: - Data

struct WatchDay: Codable {
  var date: String
  var ganZhi: String
  var yi: String
  var ji: String?
  var yiShort: String?
  var jiShort: String?
  var fit: String?
  var moonPhase: Double
  var lunar: String?
  var solarTerm: String?
  var officer: String?

  enum CodingKeys: String, CodingKey {
    case date, ganZhi, yi, ji, yiShort, jiShort, fit, moonPhase, lunar, solarTerm, officer
  }

  init(
    date: String, ganZhi: String, yi: String, moonPhase: Double,
    ji: String? = nil, yiShort: String? = nil, jiShort: String? = nil,
    fit: String? = nil, lunar: String? = nil, solarTerm: String? = nil,
    officer: String? = nil
  ) {
    self.date = date
    self.ganZhi = ganZhi
    self.yi = yi
    self.ji = ji
    self.yiShort = yiShort
    self.jiShort = jiShort
    self.fit = fit
    self.moonPhase = moonPhase
    self.lunar = lunar
    self.solarTerm = solarTerm
    self.officer = officer
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    date = try c.decode(String.self, forKey: .date)
    ganZhi = try c.decode(String.self, forKey: .ganZhi)
    yi = try c.decodeIfPresent(String.self, forKey: .yi) ?? "—"
    ji = try c.decodeIfPresent(String.self, forKey: .ji)
    yiShort = try c.decodeIfPresent(String.self, forKey: .yiShort)
    jiShort = try c.decodeIfPresent(String.self, forKey: .jiShort)
    fit = try c.decodeIfPresent(String.self, forKey: .fit)
    moonPhase = try c.decodeIfPresent(Double.self, forKey: .moonPhase) ?? 0.5
    lunar = try c.decodeIfPresent(String.self, forKey: .lunar)
    solarTerm = try c.decodeIfPresent(String.self, forKey: .solarTerm)
    officer = try c.decodeIfPresent(String.self, forKey: .officer)
  }
}

private struct Legacy: Codable { var days: [WatchDay] }
private struct EnvData: Codable { var days: [WatchDay] }
private struct Env: Codable { var data: EnvData }

private func ymd(_ date: Date) -> String {
  let f = DateFormatter()
  f.calendar = Calendar(identifier: .gregorian)
  f.dateFormat = "yyyy-MM-dd"
  return f.string(from: date)
}

private func loadToday() -> WatchDay? {
  guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return nil }
  let today = ymd(Date())

  func pick(_ days: [WatchDay]) -> WatchDay? {
    days.first { $0.date == today } ?? days.first
  }

  if let json = defaults.string(forKey: ENVELOPE_KEY),
     let data = json.data(using: .utf8),
     let env = try? JSONDecoder().decode(Env.self, from: data) {
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

struct WatchProvider: TimelineProvider {
  func placeholder(in context: Context) -> WatchEntry {
    WatchEntry(
      date: Date(),
      day: WatchDay(
        date: "—", ganZhi: "癸卯", yi: "开市·嫁娶", moonPhase: 0.5,
        yiShort: "开市·嫁娶", lunar: "六月十五", solarTerm: "", officer: "成"
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (WatchEntry) -> Void) {
    completion(WatchEntry(date: Date(), day: loadToday()))
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

  private func circular(_ d: WatchDay?) -> some View {
    ZStack {
      AccessoryWidgetBackground()
      VStack(spacing: 1) {
        if let d {
          WatchPhaseLogo(phase: phaseOf(d))
            .frame(width: 14, height: 14)
        }
        Text(d?.ganZhi ?? "—")
          .font(.system(size: 11, weight: .semibold))
          .widgetAccentable()
          .minimumScaleFactor(0.7)
          .lineLimit(1)
      }
      .padding(2)
    }
  }

  private func rectangular(_ d: WatchDay?) -> some View {
    HStack(alignment: .center, spacing: 6) {
      if let d {
        WatchPhaseLogo(phase: phaseOf(d))
          .frame(width: 22, height: 22)
      }
      VStack(alignment: .leading, spacing: 1) {
        HStack(spacing: 4) {
          Text(d?.ganZhi ?? "Yuun")
            .font(.headline)
            .widgetAccentable()
          if let term = d?.solarTerm, !term.isEmpty {
            Text(term)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }
        Text(yiLine(d))
          .font(.caption2)
          .foregroundStyle(.secondary)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      Spacer(minLength: 0)
    }
  }

  private func corner(_ d: WatchDay?) -> some View {
    Text(d?.ganZhi ?? "Yuun")
      .font(.caption)
      .widgetAccentable()
  }

  /// Single-line bottom slot — 宜 only (no 干支; circular already shows it).
  private func inline(_ d: WatchDay?) -> some View {
    return Text(yiLine(d))
      .lineLimit(1)
  }

  /// `宜` + short verbs (locale from RN payload — en may be "Wedding").
  private func yiLine(_ d: WatchDay?) -> String {
    guard let d else { return "打开 Yuun 同步" }
    return "宜 \(shortYi(d))"
  }

  /// Prefer yiShort → yi; at most 2 `·`-separated segments (en often 1).
  private func shortYi(_ d: WatchDay) -> String {
    let raw = [d.yiShort, d.yi]
      .compactMap { $0 }
      .first { !$0.isEmpty } ?? "—"
    let parts = raw
      .split(whereSeparator: { $0 == "·" || $0 == "•" })
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
    if parts.isEmpty { return "—" }
    return parts.prefix(2).joined(separator: "·")
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
    .description("圆形干支 · 矩形宜忌 · 底边宜")
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
