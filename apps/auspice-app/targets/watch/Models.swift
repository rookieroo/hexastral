// Shared payload types — mirror YuunWidgetDay + SharedChrome from iPhone widget.

import Foundation

struct SharedDay: Codable, Identifiable {
  var id: String { date }
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
    elementColor = try c.decodeIfPresent(String.self, forKey: .elementColor) ?? "#8E9AA1"
    lunar = try c.decodeIfPresent(String.self, forKey: .lunar) ?? ""
    solarTerm = try c.decodeIfPresent(String.self, forKey: .solarTerm) ?? ""
    yi = try c.decodeIfPresent(String.self, forKey: .yi) ?? "—"
    ji = try c.decodeIfPresent(String.self, forKey: .ji) ?? "—"
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

struct SharedChrome: Codable {
  let good: String?
  let avoid: String?
  let forYou: String?
  let tip: String?
  let lunarFallback: String?
  let emptyHint: String?
  let moonPhaseNames: [String]?
}

struct WidgetEnvelopeData: Codable {
  let days: [SharedDay]
  let chrome: SharedChrome?
}

struct WidgetEnvelope: Codable {
  let updatedAt: String?
  let appSlug: String?
  let locale: String?
  let freshUntil: String?
  let data: WidgetEnvelopeData
}

struct WatchPreferences: Codable {
  var locale: String
  var birthDate: String?
  var yijiMode: String?
}

enum WatchStoreKeys {
  static let appGroup = "group.com.hexastral.yuun"
  static let payload = "hexastral_widget_payload_v1"
  static let legacyDays = "almanac_days"
  static let locale = "yuun_widget_locale"
  static let tipLabel = "yuun_widget_tip_label"
  static let devMoonPhase = "yuun_dev_moon_phase"
  static let preferences = "yuun_watch_preferences_v1"
  static let credential = "yuun_watch_credential"
  static let widgetKind = "YuunWatch"

  static let syncKeys = [
    payload,
    legacyDays,
    locale,
    tipLabel,
    devMoonPhase,
    preferences,
    credential,
  ]
}
