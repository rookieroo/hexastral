package expo.modules.widgetkitandroid

import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

data class YuunWidgetChrome(
  val good: String,
  val avoid: String,
  val forYou: String,
  val tip: String,
  val emptyHint: String,
  val lunarFallback: String,
  val moonPhaseNames: List<String>,
)

data class YuunWidgetDay(
  val date: String,
  val ganZhi: String,
  val lunar: String,
  val solarTerm: String,
  val yi: String,
  val ji: String,
  val yiShort: String,
  val jiShort: String,
  val yiLong: String,
  val jiLong: String,
  val fit: String?,
  val fitSummary: String?,
  val dayTip: String?,
  val tipLabel: String?,
  val ganZhiPinyin: String?,
  val moonPhase: Double,
  val officer: String?,
  val mansion: String?,
  val clashShengxiao: String?,
)

data class ParsedWidgetPayload(
  val locale: String,
  val chrome: YuunWidgetChrome,
  val today: YuunWidgetDay?,
)

object WidgetPayloadParser {
  private val isoDay: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE

  fun parse(json: String?, fallbackLocale: String): ParsedWidgetPayload {
    val emptyChrome = defaultChrome(fallbackLocale)
    if (json.isNullOrBlank()) {
      return ParsedWidgetPayload(fallbackLocale, emptyChrome, null)
    }
    return try {
      val root = JSONObject(json)
      val locale = root.optString("locale", fallbackLocale)
      val data = root.optJSONObject("data") ?: JSONObject()
      val chromeObj = data.optJSONObject("chrome")
      val chrome =
        if (chromeObj != null) {
          YuunWidgetChrome(
            good = chromeObj.optString("good", emptyChrome.good),
            avoid = chromeObj.optString("avoid", emptyChrome.avoid),
            forYou = chromeObj.optString("forYou", emptyChrome.forYou),
            tip = chromeObj.optString("tip", emptyChrome.tip),
            emptyHint = chromeObj.optString("emptyHint", emptyChrome.emptyHint),
            lunarFallback = chromeObj.optString("lunarFallback", emptyChrome.lunarFallback),
            moonPhaseNames = stringList(chromeObj.optJSONArray("moonPhaseNames"), emptyChrome.moonPhaseNames),
          )
        } else {
          emptyChrome
        }
      val days = data.optJSONArray("days") ?: JSONArray()
      val todayIso = LocalDate.now().format(isoDay)
      var today: YuunWidgetDay? = null
      for (i in 0 until days.length()) {
        val d = days.optJSONObject(i) ?: continue
        if (d.optString("date") == todayIso) {
          today = dayFromJson(d)
          break
        }
      }
      if (today == null && days.length() > 0) {
        today = dayFromJson(days.getJSONObject(0))
      }
      ParsedWidgetPayload(locale, chrome, today)
    } catch (_: Exception) {
      ParsedWidgetPayload(fallbackLocale, emptyChrome, null)
    }
  }

  private fun stringList(arr: JSONArray?, fallback: List<String>): List<String> {
    if (arr == null || arr.length() == 0) return fallback
    return buildList {
      for (i in 0 until arr.length()) {
        val s = arr.optString(i, "")
        if (s.isNotBlank()) add(s)
      }
    }.ifEmpty { fallback }
  }

  private fun dayFromJson(d: JSONObject): YuunWidgetDay {
    val yi = d.optString("yi", "")
    val ji = d.optString("ji", "")
    return YuunWidgetDay(
      date = d.optString("date", ""),
      ganZhi = d.optString("ganZhi", ""),
      lunar = d.optString("lunar", ""),
      solarTerm = d.optString("solarTerm", ""),
      yi = yi,
      ji = ji,
      yiShort = d.optString("yiShort", yi),
      jiShort = d.optString("jiShort", ji),
      yiLong = d.optString("yiLong", yi),
      jiLong = d.optString("jiLong", ji),
      fit = d.optStringOrNull("fit"),
      fitSummary = d.optStringOrNull("fitSummary"),
      dayTip = d.optStringOrNull("dayTip"),
      tipLabel = d.optStringOrNull("tipLabel"),
      ganZhiPinyin = d.optStringOrNull("ganZhiPinyin"),
      moonPhase = d.optDouble("moonPhase", 0.0),
      officer = d.optStringOrNull("officer"),
      mansion = d.optStringOrNull("mansion"),
      clashShengxiao = d.optStringOrNull("clashShengxiao"),
    )
  }

  private fun JSONObject.optStringOrNull(key: String): String? {
    if (!has(key) || isNull(key)) return null
    val v = optString(key, "")
    return v.ifBlank { null }
  }

  fun defaultChrome(locale: String): YuunWidgetChrome {
    val moons =
      when {
        locale.startsWith("zh-Hant") || locale == "zh-TW" ->
          listOf("新月", "蛾眉月", "上弦", "盈凸月", "滿月", "虧凸月", "下弦", "殘月")
        locale.startsWith("zh") ->
          listOf("新月", "蛾眉月", "上弦", "盈凸月", "满月", "亏凸月", "下弦", "残月")
        locale.startsWith("ja") ->
          listOf("新月", "三日月", "上弦", "十三夜", "満月", "十八夜", "下弦", "二十六夜")
        else ->
          listOf("New", "Waxing crescent", "First quarter", "Waxing gibbous", "Full", "Waning gibbous", "Last quarter", "Waning crescent")
      }
    return when {
      locale.startsWith("zh-Hant") || locale == "zh-TW" ->
        YuunWidgetChrome("宜", "忌", "對你而言", "日籤", "打開 Yuun 以同步黃曆", "—", moons)
      locale.startsWith("zh") ->
        YuunWidgetChrome("宜", "忌", "对你而言", "日签", "打开 Yuun 以同步黄历", "—", moons)
      locale.startsWith("ja") ->
        YuunWidgetChrome("吉", "凶", "あなたへ", "一言", "Yuun を開いて同期", "—", moons)
      else ->
        YuunWidgetChrome("Good", "Avoid", "For you", "", "Open Yuun to sync the almanac", "—", moons)
    }
  }

  fun isEnglish(locale: String): Boolean =
    !locale.startsWith("zh") && !locale.startsWith("ja")

  /** Small topline — `THU 30` / `周四 · 30`. */
  fun weekdayChip(isoDate: String, locale: String): String {
    return try {
      val d = LocalDate.parse(isoDate, isoDay)
      val day = d.dayOfMonth
      if (isEnglish(locale)) {
        val wd = d.dayOfWeek.getDisplayName(java.time.format.TextStyle.SHORT, Locale.ENGLISH).uppercase(Locale.ENGLISH)
        "$wd $day"
      } else {
        val loc =
          when {
            locale.startsWith("zh-Hant") -> Locale.TRADITIONAL_CHINESE
            locale.startsWith("ja") -> Locale.JAPANESE
            else -> Locale.SIMPLIFIED_CHINESE
          }
        val wd = d.dayOfWeek.getDisplayName(java.time.format.TextStyle.SHORT, loc)
        "$wd · $day"
      }
    } catch (_: Exception) {
      isoDate
    }
  }

  fun lunarOnly(day: YuunWidgetDay, chrome: YuunWidgetChrome): String {
    val lunar = day.lunar.trim()
    return if (lunar.isEmpty() || lunar == "—") chrome.lunarFallback else lunar
  }

  /** Medium/large — `JUL 30` / `7月30日`. */
  fun solarMonthDay(isoDate: String, locale: String): String {
    return try {
      val d = LocalDate.parse(isoDate, isoDay)
      if (isEnglish(locale)) {
        val months =
          arrayOf("JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC")
        "${months[d.monthValue - 1]} ${d.dayOfMonth}"
      } else {
        "${d.monthValue}月${d.dayOfMonth}日"
      }
    } catch (_: Exception) {
      isoDate
    }
  }

  /** Medium/large calendar — solar · lunar (no 节气). */
  fun calendarRow(day: YuunWidgetDay, chrome: YuunWidgetChrome, locale: String): String {
    val solar = solarMonthDay(day.date, locale)
    val lunar = lunarOnly(day, chrome)
    return if (lunar == "—" || lunar.isBlank()) solar else "$solar · $lunar"
  }

  private val MOON_GLYPHS = arrayOf("🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘")

  fun moonPhaseIndex(phase: Double): Int {
    var p = phase % 1.0
    if (p < 0) p += 1.0
    return when {
      p < 0.02 || p >= 0.98 -> 0
      p < 0.23 -> 1
      p < 0.27 -> 2
      p < 0.48 -> 3
      p < 0.52 -> 4
      p < 0.73 -> 5
      p < 0.77 -> 6
      else -> 7
    }
  }

  fun moonGlyph(phase: Double): String = MOON_GLYPHS[moonPhaseIndex(phase)]

  fun moonCaption(phase: Double, names: List<String>): String {
    var p = phase % 1.0
    if (p < 0) p += 1.0
    val lit = ((1 - kotlin.math.cos(2 * Math.PI * p)) / 2 * 100).toInt()
    val idx = moonPhaseIndex(phase)
    return if (names.size == 8) "${names[idx]} · $lit%" else "$lit%"
  }

  fun metaRow(day: YuunWidgetDay, locale: String): String {
    if (isEnglish(locale)) {
      return day.solarTerm.trim()
    }
    val parts = mutableListOf<String>()
    if (day.solarTerm.isNotBlank()) parts.add(day.solarTerm)
    day.officer?.takeIf { it.isNotBlank() }?.let { parts.add("${it}日") }
    day.mansion?.takeIf { it.isNotBlank() }?.let { m ->
      val clash = day.clashShengxiao?.takeIf { it.isNotBlank() }?.let { " · 冲$it" } ?: ""
      parts.add("$m$clash")
    }
    return parts.joinToString(" · ")
  }
}
