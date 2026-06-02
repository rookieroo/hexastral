// Auspice — Home-screen WidgetKit target (SwiftUI).
//
// Reads the day's 黄历 from the shared App Group container that the RN app writes
// via `lib/widget-bridge.ts` (no network in the extension, no Swift port of the
// engine). One timeline entry per cached day; refreshes at the next local midnight.
//
// Scaffolded 2026-06 — see docs/cycle-widget-watch-scope.md + the build runbook.
// Wired into Xcode by `@bacons/apple-targets` on `expo prebuild`.

import SwiftUI
import WidgetKit

// MARK: - Shared data (matches the JSON written by lib/widget-bridge.ts)

private let APP_GROUP = "group.com.hexastral.cycle"
private let DAYS_KEY = "almanac_days"

struct SharedDay: Decodable {
  let date: String        // YYYY-MM-DD (local)
  let ganZhi: String      // 干支日, e.g. "丁未"
  let elementColor: String // hex, e.g. "#A0845C"
  let lunar: String       // 农历, e.g. "四月十七"
  let solarTerm: String   // 节气 label
  let yi: String          // 宜 (top, joined)
  let ji: String          // 忌 (top, joined)
  let fit: String?        // 对你而言 verdict (Pro), e.g. "宜把握" — nil for free
  let moonPhase: Double   // 0..1
}

private struct SharedPayload: Decodable { let days: [SharedDay] }

private func loadDays() -> [SharedDay] {
  guard
    let defaults = UserDefaults(suiteName: APP_GROUP),
    let json = defaults.string(forKey: DAYS_KEY),
    let data = json.data(using: .utf8),
    let payload = try? JSONDecoder().decode(SharedPayload.self, from: data)
  else { return [] }
  return payload.days
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

// MARK: - Timeline

struct AlmanacEntry: TimelineEntry {
  let date: Date
  let day: SharedDay?
}

private let PLACEHOLDER = SharedDay(
  date: "—", ganZhi: "丁未", elementColor: "#A0845C", lunar: "四月十七",
  solarTerm: "芒种", yi: "祭祀 · 祈福", ji: "安葬 · 求医", fit: nil, moonPhase: 0.5
)

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> AlmanacEntry {
    AlmanacEntry(date: Date(), day: PLACEHOLDER)
  }

  func getSnapshot(in context: Context, completion: @escaping (AlmanacEntry) -> Void) {
    let days = loadDays()
    let today = ymd(Date())
    completion(AlmanacEntry(date: Date(), day: days.first { $0.date == today } ?? days.first ?? PLACEHOLDER))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<AlmanacEntry>) -> Void) {
    let cal = Calendar.current
    let days = loadDays()
    var entries: [AlmanacEntry] = []
    // One entry per cached day, anchored at that day's local midnight.
    for d in days {
      let f = DateFormatter()
      f.calendar = Calendar(identifier: .gregorian)
      f.dateFormat = "yyyy-MM-dd"
      if let start = f.date(from: d.date).map({ cal.startOfDay(for: $0) }) {
        entries.append(AlmanacEntry(date: start, day: d))
      }
    }
    if entries.isEmpty { entries = [AlmanacEntry(date: Date(), day: nil)] }
    // Refresh after the last cached day so WidgetKit re-asks once the app has
    // written a fresh window.
    let refresh = cal.date(byAdding: .day, value: 1, to: entries.last!.date) ?? Date().addingTimeInterval(86400)
    completion(Timeline(entries: entries.sorted { $0.date < $1.date }, policy: .after(refresh)))
  }
}

// MARK: - Views

private struct MoonDot: View {
  let phase: Double
  var body: some View {
    Circle()
      .fill(Color(white: 0.92))
      .overlay(
        Circle()
          .fill(Color.black.opacity(0.0))
      )
      .opacity(0.85 + 0.15 * (1 - abs(phase - 0.5) * 2)) // fuller near 0.5
  }
}

struct AuspiceWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  var entry: Provider.Entry

  var body: some View {
    let d = entry.day
    ZStack {
      Color(red: 0x0E / 255, green: 0x0D / 255, blue: 0x0C / 255) // #0E0D0C dark canvas
      if let d = d {
        switch family {
        case .systemSmall: small(d)
        default: medium(d)
        }
      } else {
        Text("打开 Auspice 同步今日黄历")
          .font(.system(size: 12))
          .foregroundColor(.white.opacity(0.6))
          .padding()
      }
    }
  }

  private func small(_ d: SharedDay) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        MoonDot(phase: d.moonPhase).frame(width: 22, height: 22)
        Spacer()
        Text(d.ganZhi).font(.system(size: 15, weight: .medium)).foregroundColor(color(d.elementColor))
      }
      Spacer()
      Text(d.lunar).font(.system(size: 12)).foregroundColor(.white.opacity(0.5))
      Text("宜 \(d.yi)").font(.system(size: 11)).foregroundColor(.white.opacity(0.85)).lineLimit(1)
      Text("忌 \(d.ji)").font(.system(size: 11)).foregroundColor(.white.opacity(0.55)).lineLimit(1)
    }
    .padding(12)
  }

  private func medium(_ d: SharedDay) -> some View {
    HStack(spacing: 14) {
      VStack(spacing: 4) {
        MoonDot(phase: d.moonPhase).frame(width: 40, height: 40)
        Text(d.ganZhi).font(.system(size: 16, weight: .light)).foregroundColor(color(d.elementColor))
      }
      VStack(alignment: .leading, spacing: 4) {
        Text("\(d.lunar) · \(d.solarTerm)").font(.system(size: 12)).foregroundColor(.white.opacity(0.5)).lineLimit(1)
        Text("宜 \(d.yi)").font(.system(size: 13)).foregroundColor(.white.opacity(0.9)).lineLimit(1)
        Text("忌 \(d.ji)").font(.system(size: 13)).foregroundColor(.white.opacity(0.6)).lineLimit(1)
        if let fit = d.fit {
          Text("对你而言 · \(fit)").font(.system(size: 12, weight: .semibold)).foregroundColor(color("#C4A882")).lineLimit(1)
        }
      }
      Spacer(minLength: 0)
    }
    .padding(16)
  }
}

// MARK: - Widget

struct AuspiceWidget: Widget {
  let kind = "AuspiceWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      AuspiceWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Auspice 黄历")
    .description("每日 宜忌 · 干支 · 月相")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct AuspiceWidgetBundle: WidgetBundle {
  var body: some Widget { AuspiceWidget() }
}
