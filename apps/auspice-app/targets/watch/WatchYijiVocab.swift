// WatchYijiVocab — display gloss for public /day fallback.
// Bootstrap / App Group payloads already ship formatted strings; this only
// maps canonical CJK when the Watch refreshes via anonymous /day.

import Foundation

enum WatchYijiMode: String {
  case modern
  case traditional
}

enum WatchYijiVocab {
  /// Prefer prefs.yijiMode; else en→modern, other→traditional.
  static func resolveMode(prefsMode: String?, locale: WatchLocale) -> WatchYijiMode {
    if prefsMode == "modern" { return .modern }
    if prefsMode == "traditional" { return .traditional }
    return locale == .en ? .modern : .traditional
  }

  static func format(_ verb: String, locale: WatchLocale, mode: WatchYijiMode) -> String {
    if mode == .modern, let m = modern[locale]?[verb] { return m }
    if locale == .zhHans { return verb }
    return traditional[locale]?[verb] ?? verb
  }

  static func formatList(
    _ verbs: [String],
    locale: WatchLocale,
    mode: WatchYijiMode,
    max: Int
  ) -> String {
    var seen = Set<String>()
    var out: [String] = []
    for v in verbs {
      let label = format(v, locale: locale, mode: mode)
      if seen.insert(label).inserted {
        out.append(label)
      }
      if out.count >= max { break }
    }
    return out.isEmpty ? "—" : out.joined(separator: "·")
  }

  private static let modern: [WatchLocale: [String: String]] = [
    .zhHans: [
      "嫁娶": "结婚", "见贵": "会面", "开市": "开业", "立券": "签约",
      "移徙": "搬家", "入宅": "入住", "求医": "就医", "疗病": "治疗",
      "修造": "装修", "动土": "开工", "纳财": "收款", "入仓": "入库",
      "破屋": "拆除", "补垣": "补墙", "塞穴": "封堵", "栽种": "种植",
    ],
    .zhHant: [
      "嫁娶": "結婚", "见贵": "會面", "开市": "開業", "立券": "簽約",
      "移徙": "搬家", "入宅": "入住", "求医": "就醫", "疗病": "治療",
      "修造": "裝修", "动土": "開工", "纳财": "收款", "入仓": "入庫",
      "破屋": "拆除", "补垣": "補牆", "塞穴": "封堵", "栽种": "種植",
    ],
    .ja: [
      "嫁娶": "結婚", "见贵": "面会", "开市": "開店", "立券": "契約",
      "移徙": "引越", "入宅": "入居", "求医": "受診", "疗病": "治療",
      "修造": "修繕", "动土": "起工", "纳财": "入金", "入仓": "入庫",
      "破屋": "解体", "栽种": "植栽",
    ],
    .en: [
      "嫁娶": "Wedding", "见贵": "Meet", "开市": "Launch", "立券": "Sign",
      "移徙": "Move", "入宅": "Move in", "求医": "Clinic", "疗病": "Heal",
      "修造": "Renovate", "动土": "Start", "纳财": "Collect", "入仓": "Store",
      "破屋": "Raze", "补垣": "Mend", "塞穴": "Seal", "栽种": "Plant",
      "诉讼": "Lawsuit", "入学": "School", "求财": "Wealth", "破土": "Grave",
      "出行": "Travel", "交易": "Trade", "祈福": "Bless", "祭祀": "Rite",
      "沐浴": "Bath", "安床": "Bed", "安葬": "Burial", "捕捉": "Catch",
      "纳畜": "Livestock", "涂泥": "Plaster", "除服": "Mourn end",
      "登高": "Climb", "行船": "Sail", "拆卸": "Dismantle", "筑堤": "Dike",
    ],
  ]

  private static let traditional: [WatchLocale: [String: String]] = [
    .zhHant: [
      "开市": "開市", "求医": "求醫", "求财": "求財", "动土": "動土",
      "破土": "破土", "安葬": "安葬", "入学": "入學", "纳财": "納財",
      "见贵": "見貴", "疗病": "療病", "诉讼": "訴訟", "入仓": "入倉",
      "补垣": "補垣", "塞穴": "塞穴", "筑堤": "築堤", "栽种": "栽種",
      "移徙": "移徙", "立券": "立券",
    ],
    .ja: [
      "嫁娶": "婚姻", "出行": "外出", "入宅": "入居", "移徙": "移転",
      "开市": "開店", "交易": "取引", "立券": "契約", "求医": "受診",
      "求财": "求財", "祈福": "祈祷", "祭祀": "祭祀", "沐浴": "入浴",
      "修造": "修繕", "动土": "起工", "安葬": "葬儀", "入学": "入学",
      "纳财": "納財", "见贵": "見貴", "疗病": "治療", "诉讼": "訴訟",
    ],
    .en: [
      "嫁娶": "Wedding", "见贵": "Audience", "开市": "Open shop", "立券": "Contract",
      "移徙": "Relocation", "入宅": "Move in", "求医": "See doctor", "疗病": "Heal",
      "修造": "Build", "动土": "Break ground", "纳财": "Wealth in", "入仓": "Store",
      "破屋": "Tear down", "栽种": "Plant", "诉讼": "Lawsuit", "入学": "School",
      "求财": "Seek wealth", "破土": "Break earth", "出行": "Travel", "交易": "Trade",
      "祈福": "Pray", "祭祀": "Rite", "沐浴": "Bath", "安床": "Bed",
      "安葬": "Burial", "捕捉": "Catch", "纳畜": "Livestock", "涂泥": "Plaster",
      "除服": "End mourning", "登高": "Climb", "行船": "Sail", "拆卸": "Dismantle",
      "筑堤": "Dike", "补垣": "Mend wall", "塞穴": "Seal hole",
    ],
  ]
}
