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
    )
  }

  private fun JSONObject.optStringOrNull(key: String): String? {
    if (!has(key) || isNull(key)) return null
    val v = optString(key, "")
    return v.ifBlank { null }
  }

  fun defaultChrome(locale: String): YuunWidgetChrome {
    return when {
      locale.startsWith("zh-Hant") || locale == "zh-TW" ->
        YuunWidgetChrome("宜", "忌", "對你而言", "日籤", "打開 Yuun 以同步黃曆")
      locale.startsWith("zh") ->
        YuunWidgetChrome("宜", "忌", "对你而言", "日签", "打开 Yuun 以同步黄历")
      locale.startsWith("ja") ->
        YuunWidgetChrome("吉", "凶", "あなたへ", "一言", "Yuun を開いて同期")
      else ->
        YuunWidgetChrome("Good", "Avoid", "For you", "", "Open Yuun to sync the almanac")
    }
  }

  fun weekdayChip(isoDate: String, locale: String): String {
    return try {
      val d = LocalDate.parse(isoDate, isoDay)
      val loc =
        when {
          locale.startsWith("zh-Hant") -> Locale.TRADITIONAL_CHINESE
          locale.startsWith("zh") -> Locale.SIMPLIFIED_CHINESE
          locale.startsWith("ja") -> Locale.JAPANESE
          else -> Locale.ENGLISH
        }
      val day = d.dayOfMonth
      val wd =
        d.dayOfWeek.getDisplayName(java.time.format.TextStyle.SHORT, loc).uppercase(loc)
      if (locale.startsWith("en")) "$wd $day" else "$wd · $day"
    } catch (_: Exception) {
      isoDate
    }
  }

  fun calendarRow(day: YuunWidgetDay, locale: String): String {
    val solar =
      try {
        val d = LocalDate.parse(day.date, isoDay)
        "${d.monthValue}/${d.dayOfMonth}"
      } catch (_: Exception) {
        day.date
      }
    val lunar = day.lunar.ifBlank { "" }
    val term = day.solarTerm.ifBlank { "" }
    return listOf(solar, lunar, term).filter { it.isNotBlank() }.joinToString(" · ")
  }
}
