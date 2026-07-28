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
  let moonPhase: Double
  let officer: String?
  let mansion: String?
  let clashShengxiao: String?
  let ganzhiYear: String?
  let yiShort: String?
  let jiShort: String?

  enum CodingKeys: String, CodingKey {
    case date, ganZhi, elementColor, lunar, solarTerm, yi, ji, fit, fitSummary, dayTip, moonPhase
    case officer, mansion, clashShengxiao, ganzhiYear, yiShort, jiShort
  }

  init(
    date: String, ganZhi: String, elementColor: String, lunar: String, solarTerm: String,
    yi: String, ji: String, fit: String?, moonPhase: Double,
    officer: String? = nil, mansion: String? = nil, clashShengxiao: String? = nil,
    ganzhiYear: String? = nil, yiShort: String? = nil, jiShort: String? = nil,
    fitSummary: String? = nil, dayTip: String? = nil
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
    self.moonPhase = moonPhase
    self.officer = officer
    self.mansion = mansion
    self.clashShengxiao = clashShengxiao
    self.ganzhiYear = ganzhiYear
    self.yiShort = yiShort
    self.jiShort = jiShort
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
    moonPhase = try c.decodeIfPresent(Double.self, forKey: .moonPhase) ?? 0.5
    officer = try c.decodeIfPresent(String.self, forKey: .officer)
    mansion = try c.decodeIfPresent(String.self, forKey: .mansion)
    clashShengxiao = try c.decodeIfPresent(String.self, forKey: .clashShengxiao)
    ganzhiYear = try c.decodeIfPresent(String.self, forKey: .ganzhiYear)
    yiShort = try c.decodeIfPresent(String.self, forKey: .yiShort)
    jiShort = try c.decodeIfPresent(String.self, forKey: .jiShort)
  }
}

private struct LegacyPayload: Decodable { let days: [SharedDay] }

private struct EnvelopeData: Decodable { let days: [SharedDay] }

private struct Envelope: Decodable {
  let updatedAt: String?
  let data: EnvelopeData
}

private func loadDays() -> [SharedDay] {
  guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return [] }

  if let json = defaults.string(forKey: ENVELOPE_KEY),
     let data = json.data(using: .utf8),
     let env = try? JSONDecoder().decode(Envelope.self, from: data) {
    return env.data.days
  }

  if let json = defaults.string(forKey: LEGACY_DAYS_KEY),
     let data = json.data(using: .utf8),
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
  solarTerm: "芒种", yi: "祭祀 · 祈福", ji: "安葬 · 求医", fit: nil, moonPhase: 0.5,
  officer: "成", mansion: "娄金狗", clashShengxiao: "鼠", ganzhiYear: "丙午年",
  yiShort: "祭祀", jiShort: "安葬"
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
    let refresh = cal.date(byAdding: .day, value: 1, to: entries.last!.date) ?? Date().addingTimeInterval(86400)
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

  var body: some View {
    Group {
      if let d = entry.day {
        switch family {
        case .systemSmall: small(d)
        case .systemMedium: medium(d)
        case .systemLarge: large(d)
        case .accessoryCircular: circular(d)
        case .accessoryRectangular: rectangular(d)
        default: medium(d)
        }
      } else {
        Text("打开 Yuun 同步今日黄历")
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
    let year = (d.ganzhiYear ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    if lunar.isEmpty || lunar == "—" {
      return year.isEmpty ? d.date : year
    }
    if year.isEmpty { return lunar }
    return "\(lunar) · \(year)"
  }

  private func small(_ d: SharedDay) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top, spacing: 10) {
        YuunPhaseLogo(phase: phaseOf(d), scheme: palette.scheme)
          .frame(width: 34, height: 34)
        VStack(alignment: .trailing, spacing: 2) {
          Text(d.lunar == "—" || d.lunar.isEmpty ? "农历" : d.lunar)
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(palette.text)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
          if let year = d.ganzhiYear, !year.isEmpty {
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

      Text(d.ganZhi)
        .font(.system(size: 28, weight: .light))
        .tracking(2)
        .foregroundColor(palette.text)

      Spacer(minLength: 4)

      VStack(alignment: .leading, spacing: 3) {
        Text("宜 \(d.yi)")
          .font(.system(size: 13))
          .foregroundColor(palette.text)
          .lineLimit(2)
          .minimumScaleFactor(0.8)
        Text("忌 \(d.ji)")
          .font(.system(size: 13))
          .foregroundColor(palette.secondary)
          .lineLimit(2)
          .minimumScaleFactor(0.8)
      }
    }
    .padding(14)
  }

  private func medium(_ d: SharedDay) -> some View {
    HStack(alignment: .top, spacing: 14) {
      VStack(spacing: 8) {
        YuunPhaseLogo(phase: phaseOf(d), scheme: palette.scheme)
          .frame(width: 52, height: 52)
        Text(d.ganZhi)
          .font(.system(size: 20, weight: .light))
          .foregroundColor(palette.text)
        Text(lunarMeta(d))
          .font(.system(size: 12))
          .foregroundColor(palette.secondary)
          .lineLimit(2)
          .multilineTextAlignment(.center)
          .minimumScaleFactor(0.8)
      }
      .frame(width: 112)

      VStack(alignment: .leading, spacing: 6) {
        if !d.solarTerm.isEmpty {
          Text(d.solarTerm)
            .font(.system(size: 12))
            .foregroundColor(palette.tertiary)
            .lineLimit(1)
        }
        Text("宜 \(d.yi)")
          .font(.system(size: 15))
          .foregroundColor(palette.text)
          .lineLimit(3)
          .minimumScaleFactor(0.85)
        Text("忌 \(d.ji)")
          .font(.system(size: 15))
          .foregroundColor(palette.secondary)
          .lineLimit(3)
          .minimumScaleFactor(0.85)
        if let fit = d.fit {
          Text("对你而言 · \(fit)")
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(palette.text)
            .lineLimit(1)
        }
        Spacer(minLength: 0)
      }
      Spacer(minLength: 0)
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
        YuunPhaseLogo(phase: phaseOf(d), scheme: palette.scheme)
          .frame(width: 58, height: 58)
      }

      HStack(alignment: .bottom, spacing: 8) {
        Text(d.ganZhi)
          .font(.system(size: 34, weight: .light))
          .foregroundColor(palette.text)
        if let officer = d.officer {
          Text("\(officer)日")
            .font(.system(size: 14))
            .foregroundColor(palette.secondary)
            .padding(.bottom, 5)
        }
      }

      if let mansion = d.mansion {
        Text("\(mansion)\(d.clashShengxiao.map { " · 冲\($0)" } ?? "")")
          .font(.system(size: 13))
          .foregroundColor(palette.secondary)
          .lineLimit(1)
      }

      Rectangle().fill(palette.separator).frame(height: 0.5)

      Text("宜 \(d.yi)")
        .font(.system(size: 16))
        .foregroundColor(palette.text)
        .lineLimit(2)
      Text("忌 \(d.ji)")
        .font(.system(size: 16))
        .foregroundColor(palette.secondary)
        .lineLimit(2)

      Rectangle().fill(palette.separator).frame(height: 0.5)

      if let fit = d.fit, let summary = d.fitSummary, !summary.isEmpty {
        VStack(alignment: .leading, spacing: 4) {
          Text("对你而言 · \(fit)")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(palette.text)
            .lineLimit(1)
          Text(summary)
            .font(.system(size: 14))
            .foregroundColor(palette.secondary)
            .lineLimit(3)
        }
      } else if let tip = d.dayTip, !tip.isEmpty {
        VStack(alignment: .leading, spacing: 4) {
          Text("日签")
            .font(.system(size: 11))
            .tracking(1)
            .foregroundColor(palette.tertiary)
            .lineLimit(1)
          Text(tip)
            .font(.system(size: 14))
            .foregroundColor(palette.text)
            .lineLimit(3)
        }
      } else if let fit = d.fit {
        Text("对你而言 · \(fit)")
          .font(.system(size: 14, weight: .medium))
          .foregroundColor(palette.text)
      }
      Spacer(minLength: 0)
    }
    .padding(18)
  }

  private func circular(_ d: SharedDay) -> some View {
    VStack(spacing: 2) {
      YuunPhaseLogo(phase: phaseOf(d), scheme: palette.scheme)
        .frame(width: 20, height: 20)
      Text(d.ganZhi).font(.system(size: 12, weight: .semibold)).widgetAccentable()
    }
  }

  private func rectangular(_ d: SharedDay) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(d.ganZhi).font(.headline).widgetAccentable()
      Text("宜 \(d.yiShort ?? d.yi)")
        .font(.caption)
        .foregroundColor(.secondary)
        .lineLimit(1)
    }
  }
}

// MARK: - Widget

struct AuspiceWidget: Widget {
  let kind = "AuspiceWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      AuspiceWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Yuun 黄历")
    .description("每日宜忌 · 干支 · 月相 · 对你而言")
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
