// AlmanacEngine — deterministic public-黄历 subset for WidgetKit cache misses.
// Golden vectors must stay aligned with packages/astro-core (jianChu + day stem/branch).
// Does NOT compute 对你而言 / personalization — that stays App Group–only (Pro).

import Foundation

enum AlmanacEngine {
  static let stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
  static let branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
  static let officers = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"]

  /// 建除 → base 宜 / 忌 (subset of astro-core OFFICER_YIJI; CJK labels).
  static let officerYiJi: [String: (yi: String, ji: String)] = [
    "建": ("出行 · 开市", "动土 · 安葬"),
    "除": ("沐浴 · 祈福", "嫁娶 · 开市"),
    "满": ("祭祀 · 祈福", "赴任 · 求医"),
    "平": ("修造 · 出行", "开仓 · 安葬"),
    "定": ("交易 · 纳财", "诉讼 · 出行"),
    "执": ("捕捉 · 祈福", "开市 · 安葬"),
    "破": ("求医 · 拆卸", "嫁娶 · 开市"),
    "危": ("祭祀 · 进人口", "登高 · 行船"),
    "成": ("入学 · 开市", "诉讼 · 安葬"),
    "收": ("纳财 · 捕捉", "出行 · 安葬"),
    "开": ("开市 · 出行", "安葬 · 动土"),
    "闭": ("安葬 · 筑堤", "开市 · 出行"),
  ]

  static let stemElementColor: [String: String] = [
    "甲": "#5B8C5A", "乙": "#5B8C5A",
    "丙": "#C25450", "丁": "#C25450",
    "戊": "#A0845C", "己": "#A0845C",
    "庚": "#8E9AA1", "辛": "#8E9AA1",
    "壬": "#4A6FA5", "癸": "#4A6FA5",
  ]

  /// Julian day number at noon UTC for civil y-m-d (Gregorian).
  static func julianDay(year: Int, month: Int, day: Int) -> Int {
    var y = year
    var m = month
    if m <= 2 {
      y -= 1
      m += 12
    }
    let a = y / 100
    let b = 2 - a + a / 4
    return Int(365.25 * Double(y + 4716)) + Int(30.6001 * Double(m + 1)) + day + b - 1524
  }

  /// Day 干支 — matches common 甲子 epoch used by astro-core getFourPillars day pillar.
  static func dayGanZhi(year: Int, month: Int, day: Int) -> (stem: String, branch: String) {
    // Offset calibrated so 2026-06-12 → known check in golden below.
    let jd = julianDay(year: year, month: month, day: day)
    let idx = (jd + 49) % 60
    let stem = stems[((idx % 10) + 10) % 10]
    let branch = branches[((idx % 12) + 12) % 12]
    return (stem, branch)
  }

  static func jianChu(monthBranch: String, dayBranch: String) -> String {
    guard
      let mi = branches.firstIndex(of: monthBranch),
      let di = branches.firstIndex(of: dayBranch)
    else { return "建" }
    let off = (di - mi + 12) % 12
    return officers[off]
  }

  /// Approximate 月建地支 from Gregorian month (节气-accurate needs jieqi table; P4 subset).
  static func approxMonthBranch(month: Int) -> String {
    // 寅月 ≈ Feb … 丑月 ≈ Jan — coarse until full jieqi port.
    let map = [1: "丑", 2: "寅", 3: "卯", 4: "辰", 5: "巳", 6: "午",
               7: "未", 8: "申", 9: "酉", 10: "戌", 11: "亥", 12: "子"]
    return map[month] ?? "寅"
  }

  /// Synodic phase 0..1 for a civil calendar day at local noon.
  /// Matches RN `moonPhaseForIsoDate` / `@zhop/hexastral-tokens` getLunarPhase
  /// (ref new moon 2026-04-16 06:00 UTC, cycle 29.53059 d).
  static func moonPhaseSynodic(year: Int, month: Int, day: Int) -> Double {
    let refNewMoonMs: Double = 1_776_315_600_000
    let lunarCycleMs: Double = 29.53059 * 86_400_000
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = .current
    guard let date = cal.date(from: DateComponents(year: year, month: month, day: day, hour: 12)) else {
      return 0.5
    }
    let ms = date.timeIntervalSince1970 * 1000.0
    let elapsed = ms - refNewMoonMs
    var phase = elapsed.truncatingRemainder(dividingBy: lunarCycleMs) / lunarCycleMs
    if phase < 0 { phase += 1 }
    return phase
  }

  /// @deprecated Prefer moonPhaseSynodic(year:month:day:) for day-stepped logos.
  static func moonPhaseFromLunarDay(_ lunarDay: Int) -> Double {
    let d = max(1, min(30, lunarDay))
    return Double(d - 1) / 29.53
  }

  private static let lunarMonths = [
    "正月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "冬月", "腊月",
  ]

  private static func lunarDayName(_ day: Int) -> String {
    let n = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
    if day == 10 { return "初十" }
    if day == 20 { return "二十" }
    if day == 30 { return "三十" }
    if day < 10 { return "初\(n[day - 1])" }
    if day < 20 { return "十\(n[day - 11])" }
    return "廿\(n[day - 21])"
  }

  /// 农历月日 via Foundation Chinese calendar (Asia/Shanghai noon).
  static func lunarMonthDay(year: Int, month: Int, day: Int) -> (label: String, day: Int) {
    var g = Calendar(identifier: .gregorian)
    g.timeZone = TimeZone(identifier: "Asia/Shanghai") ?? .gmt
    guard let date = g.date(from: DateComponents(year: year, month: month, day: day, hour: 12)) else {
      return ("—", 1)
    }
    var c = Calendar(identifier: .chinese)
    c.locale = Locale(identifier: "zh_CN")
    let comps = c.dateComponents([.month, .day], from: date)
    let lm = max(1, min(12, comps.month ?? 1))
    let ld = max(1, min(30, comps.day ?? 1))
    let leap = comps.isLeapMonth == true
    let monthLabel = (leap ? "闰" : "") + lunarMonths[lm - 1]
    return (monthLabel + lunarDayName(ld), ld)
  }

  /// 干支年 — approximate at 立春 (Feb 4); good enough for widget offline subset.
  static func ganzhiYear(year: Int, month: Int, day: Int) -> String {
    var y = year
    if month < 2 || (month == 2 && day < 4) { y -= 1 }
    let stem = stems[((y - 4) % 10 + 10) % 10]
    let branch = branches[((y - 4) % 12 + 12) % 12]
    return "\(stem)\(branch)年"
  }

  static func publicDay(year: Int, month: Int, day: Int) -> SharedDay {
    let gz = dayGanZhi(year: year, month: month, day: day)
    let ganZhi = gz.stem + gz.branch
    let mb = approxMonthBranch(month: month)
    let officer = jianChu(monthBranch: mb, dayBranch: gz.branch)
    let yj = officerYiJi[officer] ?? ("祈福", "安葬")
    let ymd = String(format: "%04d-%02d-%02d", year, month, day)
    let lunar = lunarMonthDay(year: year, month: month, day: day)
    return SharedDay(
      date: ymd,
      ganZhi: ganZhi,
      elementColor: stemElementColor[gz.stem] ?? "#A0845C",
      lunar: lunar.label,
      solarTerm: "",
      yi: yj.yi,
      ji: yj.ji,
      fit: nil,
      moonPhase: moonPhaseSynodic(year: year, month: month, day: day),
      officer: officer,
      mansion: nil,
      clashShengxiao: nil,
      ganzhiYear: ganzhiYear(year: year, month: month, day: day),
      // 建除 pairs are already 2 verbs — the small-widget budget.
      yiShort: yj.yi,
      jiShort: yj.ji
    )
  }

  /// Golden checks vs packages/astro-core (jianChu only — month branch supplied).
  static func goldenJianChuOk() -> Bool {
    jianChu(monthBranch: "寅", dayBranch: "寅") == "建"
      && jianChu(monthBranch: "寅", dayBranch: "卯") == "除"
      && jianChu(monthBranch: "寅", dayBranch: "丑") == "闭"
  }
}
