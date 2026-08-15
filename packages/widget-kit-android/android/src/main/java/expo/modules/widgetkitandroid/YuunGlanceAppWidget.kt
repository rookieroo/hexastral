package expo.modules.widgetkitandroid

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import expo.modules.widgetkitandroid.WidgetPayloadParser.calendarRow
import expo.modules.widgetkitandroid.WidgetPayloadParser.isEnglish
import expo.modules.widgetkitandroid.WidgetPayloadParser.lunarOnly
import expo.modules.widgetkitandroid.WidgetPayloadParser.metaRow
import expo.modules.widgetkitandroid.WidgetPayloadParser.moonCaption
import expo.modules.widgetkitandroid.WidgetPayloadParser.weekdayChip

/**
 * Home Glance widget aligned with iOS systemSmall / Medium / Large.
 *
 * [SizeMode.Exact] so [LocalSize] tracks the real cell. Small/Medium show a
 * compact For you line when birth fit is present (HyperOS defaults to 2×2);
 * Large keeps summary + tip.
 */
class YuunGlanceAppWidget : GlanceAppWidget() {
  override val sizeMode = SizeMode.Exact

  override suspend fun provideGlance(
    context: Context,
    id: GlanceId,
  ) {
    val locale = WidgetPayloadStore.readLocale(context)
    val parsed =
      WidgetPayloadParser.parse(WidgetPayloadStore.readPayloadJson(context), locale)

    provideContent {
      YuunWidgetContent(parsed = parsed, size = LocalSize.current)
    }
  }
}

class YuunWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = YuunGlanceAppWidget()
}

/** Match iOS WidgetPalette (宣纸 / 星空). */
private object YuunColors {
  val bg = ColorProvider(day = Color(0xFFF5F0E8), night = Color(0xFF0B0B0C))
  val text = ColorProvider(day = Color(0xFF09090B), night = Color(0xFFFAFAFA))
  val secondary = ColorProvider(day = Color(0xFF71717A), night = Color(0xFFA1A1AA))
  val tertiary = ColorProvider(day = Color(0xFFA1A1AA), night = Color(0xFF71717A))
  val separator = ColorProvider(day = Color(0xFFE4E4E7), night = Color(0xFF27272A))
  /** 黄历模式 — 赭金（宜/吉）/ 墨棕（忌/凶），与 App 同口径。 */
  val gold = ColorProvider(day = Color(0xFF9A6B1F), night = Color(0xFFD9B36A))
  val brown = ColorProvider(day = Color(0xFF4A3324), night = Color(0xFFCDBBA7))
}

private enum class WidgetFamily {
  Small,
  Medium,
  Large,
}

/**
 * Approximate 2×2 / 4×2 / 4×4 cell breakpoints in dp.
 * HyperOS 2-wide cells often land ~140–155dp — treat those as Medium so
 * For you is not stuck behind the Small-only matrix.
 */
private fun familyFor(size: DpSize): WidgetFamily =
  when {
    size.height >= 180.dp && size.width >= 160.dp -> WidgetFamily.Large
    size.width >= 140.dp -> WidgetFamily.Medium
    else -> WidgetFamily.Small
  }

@Composable
private fun openAppModifier(): GlanceModifier {
  val context = LocalContext.current
  val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
  return if (launch != null) {
    GlanceModifier.clickable(actionStartActivity(launch))
  } else {
    GlanceModifier
  }
}

@Composable
private fun Hairline() {
  Spacer(
    GlanceModifier
      .fillMaxWidth()
      .height(1.dp)
      .background(YuunColors.separator),
  )
}

/** iOS-style terminator moon (bitmap) — replaces Unicode glyphs. */
@Composable
private fun MoonLogo(
  phase: Double,
  dp: Int,
) {
  val context = LocalContext.current
  val px = MoonPhaseBitmap.sizePx(context, dp)
  val bmp = MoonPhaseBitmap.render(context, phase, px)
  Image(
    provider = ImageProvider(bmp),
    contentDescription = null,
    modifier = GlanceModifier.size(dp.dp),
  )
}

/**
 * Glance RemoteViews caps each [Column]/[Row] at **10 direct children**.
 * Helpers that emit multiple nodes must wrap them so parents stay under the cap.
 */
@Composable
private fun ForYouLine(
  day: YuunWidgetDay,
  parsed: ParsedWidgetPayload,
  withSummary: Boolean,
) {
  val fit = day.fit
  val fitSummary = day.fitSummary
  if (fit.isNullOrBlank() && fitSummary.isNullOrBlank()) return

  val en = isEnglish(parsed.locale)
  val label = parsed.chrome.forYou.ifBlank { if (en) "For you" else "对你而言" }
  Column(modifier = GlanceModifier.fillMaxWidth()) {
    Text(
      text =
        when {
          en -> label
          !fit.isNullOrBlank() -> "$label · $fit"
          else -> label
        },
      style =
        TextStyle(
          color = YuunColors.text,
          fontSize = WidgetSpec.MEDIUM_FOR_YOU_FONT.sp,
          fontWeight = FontWeight.Bold,
        ),
      maxLines = 1,
    )
    if (withSummary && !fitSummary.isNullOrBlank()) {
      Spacer(GlanceModifier.height(4.dp))
      Text(
        text = fitSummary,
        style = TextStyle(color = YuunColors.secondary, fontSize = WidgetSpec.LARGE_FOR_YOU_SUMMARY_FONT.sp),
        maxLines = WidgetSpec.LARGE_FOR_YOU_SUMMARY_LINES,
      )
    }
  }
}

@Composable
private fun YuunWidgetContent(
  parsed: ParsedWidgetPayload,
  size: DpSize,
) {
  val family = familyFor(size)
  val padH: Dp
  val padV: Dp
  when (family) {
    WidgetFamily.Small -> {
      padH = WidgetSpec.SMALL_PADDING.dp
      padV = WidgetSpec.SMALL_PADDING.dp
    }
    WidgetFamily.Medium -> {
      padH = WidgetSpec.MEDIUM_PADDING.dp
      padV = WidgetSpec.MEDIUM_PADDING.dp
    }
    WidgetFamily.Large -> {
      // 黄历模式：四面留足 padding（与 Swift largeAlmanacPadding/VPadding 同值）。
      if (parsed.classical) {
        padH = WidgetSpec.LARGE_ALMANAC_PADDING.dp
        padV = WidgetSpec.LARGE_ALMANAC_V_PADDING.dp
      } else {
        padH = WidgetSpec.LARGE_PADDING.dp
        padV = WidgetSpec.LARGE_PADDING.dp
      }
    }
  }

  Column(
    modifier =
      GlanceModifier
        .fillMaxSize()
        .background(YuunColors.bg)
        .padding(padH, padV)
        .then(openAppModifier()),
    verticalAlignment = Alignment.Top,
  ) {
    val day = parsed.today
    if (day == null) {
      EmptyState(parsed.chrome.emptyHint)
      return@Column
    }
    when (family) {
      WidgetFamily.Small -> SmallLayout(day, parsed)
      WidgetFamily.Medium -> MediumLayout(day, parsed)
      WidgetFamily.Large ->
        if (parsed.classical) {
          AlmanacLargeLayout(day, parsed)
        } else {
          LargeLayout(day, parsed)
        }
    }
  }
}

@Composable
private fun EmptyState(hint: String) {
  Column(
    modifier = GlanceModifier.fillMaxSize(),
    verticalAlignment = Alignment.CenterVertically,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Text(
      text = "Yuun",
      style = TextStyle(color = YuunColors.text, fontSize = 16.sp, fontWeight = FontWeight.Medium),
    )
    Spacer(GlanceModifier.height(6.dp))
    Text(
      text = hint,
      style = TextStyle(color = YuunColors.secondary, fontSize = 12.sp),
    )
  }
}

@Composable
private fun SmallLayout(
  day: YuunWidgetDay,
  parsed: ParsedWidgetPayload,
) {
  // Nested Column so root stays ≤10 Glance children.
  Column(modifier = GlanceModifier.fillMaxSize()) {
    Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
      Text(
        text = weekdayChip(day.date, parsed.locale),
        style =
          TextStyle(
            color = YuunColors.secondary,
            fontSize = WidgetSpec.SMALL_WEEKDAY_FONT.sp,
            fontWeight = FontWeight.Medium,
          ),
        maxLines = 1,
      )
      Spacer(GlanceModifier.defaultWeight())
      MoonLogo(phase = day.moonPhase, dp = WidgetSpec.SMALL_MOON)
    }
    Spacer(GlanceModifier.height(5.dp))
    Row(verticalAlignment = Alignment.Bottom) {
      Text(
        text = day.ganZhi,
        style =
          TextStyle(
            color = YuunColors.text,
            fontSize = WidgetSpec.SMALL_GANZHI_FONT.sp,
            fontWeight = FontWeight.Normal,
          ),
        maxLines = 1,
      )
      Spacer(GlanceModifier.width(6.dp))
      Text(
        text = lunarOnly(day, parsed.chrome),
        style = TextStyle(color = YuunColors.secondary, fontSize = WidgetSpec.SMALL_LUNAR_FONT.sp),
        maxLines = 1,
      )
    }
    val hasFit = !day.fit.isNullOrBlank() || !day.fitSummary.isNullOrBlank()
    Spacer(GlanceModifier.height(if (hasFit) 6.dp else 8.dp))
    if (hasFit) {
      ForYouLine(day = day, parsed = parsed, withSummary = false)
      Spacer(GlanceModifier.height(4.dp))
      YiJiStacked(
        goodLabel = parsed.chrome.good,
        avoidLabel = parsed.chrome.avoid,
        goodText = day.yiShort.ifBlank { day.yi },
        avoidText = day.jiShort,
        goodLines = WidgetSpec.SMALL_GOOD_LINES_WITH_FIT,
        avoidLines = WidgetSpec.SMALL_AVOID_LINES_WITH_FIT,
        fontSize = WidgetSpec.SMALL_YIJI_FONT.sp,
      )
    } else {
      YiJiStacked(
        goodLabel = parsed.chrome.good,
        avoidLabel = parsed.chrome.avoid,
        goodText = day.yi.ifBlank { day.yiShort },
        avoidText = day.jiShort,
        goodLines = WidgetSpec.SMALL_GOOD_LINES,
        avoidLines = WidgetSpec.SMALL_AVOID_LINES,
        fontSize = WidgetSpec.SMALL_YIJI_FONT.sp,
      )
    }
  }
}

@Composable
private fun MediumLayout(
  day: YuunWidgetDay,
  parsed: ParsedWidgetPayload,
) {
  Column(modifier = GlanceModifier.fillMaxSize()) {
    Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
      MoonLogo(phase = day.moonPhase, dp = WidgetSpec.MEDIUM_MOON)
      Spacer(GlanceModifier.width(12.dp))
      Column(modifier = GlanceModifier.defaultWeight()) {
        Row(verticalAlignment = Alignment.Bottom) {
          Text(
            text = day.ganZhi,
            style =
              TextStyle(
                color = YuunColors.text,
                fontSize = WidgetSpec.MEDIUM_GANZHI_FONT.sp,
                fontWeight = FontWeight.Normal,
              ),
            maxLines = 1,
          )
          val pinyin = day.ganZhiPinyin?.takeIf { it.isNotBlank() && isEnglish(parsed.locale) }
          if (pinyin != null) {
            Spacer(GlanceModifier.width(6.dp))
            Text(
              text = pinyin,
              style = TextStyle(color = YuunColors.tertiary, fontSize = WidgetSpec.MEDIUM_PINYIN_FONT.sp),
              maxLines = 1,
            )
          }
        }
        Text(
          text = calendarRow(day, parsed.chrome, parsed.locale),
          style =
            TextStyle(
              color = YuunColors.secondary,
              fontSize = WidgetSpec.MEDIUM_CALENDAR_FONT.sp,
              fontWeight = FontWeight.Medium,
            ),
          maxLines = 1,
        )
      }
      if (day.solarTerm.isNotBlank()) {
        Spacer(GlanceModifier.width(6.dp))
        Text(
          text = day.solarTerm,
          style = TextStyle(color = YuunColors.tertiary, fontSize = WidgetSpec.MEDIUM_TERM_FONT.sp),
          maxLines = WidgetSpec.MEDIUM_TERM_MAX_LINES,
        )
      }
    }
    Spacer(GlanceModifier.height(WidgetSpec.MEDIUM_HAIRLINE_MARGIN.dp))
    Hairline()
    Spacer(GlanceModifier.height(WidgetSpec.MEDIUM_HAIRLINE_MARGIN.dp))
    if (!day.fit.isNullOrBlank() || !day.fitSummary.isNullOrBlank()) {
      ForYouLine(day = day, parsed = parsed, withSummary = false)
      Spacer(GlanceModifier.height(8.dp))
    }
    Row(modifier = GlanceModifier.fillMaxWidth()) {
      Column(modifier = GlanceModifier.defaultWeight()) {
        Text(
          text = "${parsed.chrome.good} ${day.yi}",
          style = TextStyle(color = YuunColors.text, fontSize = WidgetSpec.MEDIUM_YIJI_FONT.sp),
          maxLines = WidgetSpec.MEDIUM_GOOD_LINES,
        )
      }
      Spacer(GlanceModifier.width(WidgetSpec.MEDIUM_COLUMN_GAP.dp))
      Column(modifier = GlanceModifier.defaultWeight()) {
        Text(
          text = "${parsed.chrome.avoid} ${day.ji}",
          style = TextStyle(color = YuunColors.secondary, fontSize = WidgetSpec.MEDIUM_YIJI_FONT.sp),
          maxLines = WidgetSpec.MEDIUM_AVOID_LINES,
        )
      }
    }
  }
}

@Composable
private fun LargeLayout(
  day: YuunWidgetDay,
  parsed: ParsedWidgetPayload,
) {
  // Keep ≤10 direct children (Glance RemoteViews hard limit).
  Column(modifier = GlanceModifier.fillMaxSize()) {
    Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
      Column(modifier = GlanceModifier.defaultWeight()) {
        Text(
          text = day.ganZhi,
          style =
            TextStyle(
              color = YuunColors.text,
              fontSize = WidgetSpec.LARGE_GANZHI_FONT.sp,
              fontWeight = FontWeight.Normal,
            ),
          maxLines = 1,
        )
        Spacer(GlanceModifier.height(4.dp))
        Text(
          text = calendarRow(day, parsed.chrome, parsed.locale),
          style =
            TextStyle(
              color = YuunColors.secondary,
              fontSize = WidgetSpec.LARGE_CALENDAR_FONT.sp,
              fontWeight = FontWeight.Medium,
            ),
          maxLines = 1,
        )
        val meta = metaRow(day, parsed.locale)
        if (meta.isNotBlank()) {
          Spacer(GlanceModifier.height(2.dp))
          Text(
            text = meta,
            style = TextStyle(color = YuunColors.tertiary, fontSize = WidgetSpec.LARGE_META_FONT.sp),
            maxLines = 1,
          )
        }
      }
      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        MoonLogo(phase = day.moonPhase, dp = WidgetSpec.LARGE_MOON)
        Spacer(GlanceModifier.height(4.dp))
        Text(
          text = moonCaption(day.moonPhase, parsed.chrome.moonPhaseNames),
          style = TextStyle(color = YuunColors.tertiary, fontSize = WidgetSpec.LARGE_MOON_CAPTION_FONT.sp),
          maxLines = 1,
        )
      }
    }
    Spacer(GlanceModifier.height(WidgetSpec.LARGE_HAIRLINE_MARGIN.dp))
    Hairline()
    Spacer(GlanceModifier.height(WidgetSpec.LARGE_HAIRLINE_MARGIN.dp))
    YiJiStacked(
      goodLabel = parsed.chrome.good,
      avoidLabel = parsed.chrome.avoid,
      goodText = day.yiLong,
      avoidText = day.jiLong,
      goodLines = WidgetSpec.LARGE_GOOD_LINES,
      avoidLines = WidgetSpec.LARGE_AVOID_LINES,
      fontSize = WidgetSpec.LARGE_YIJI_FONT.sp,
    )
    Spacer(GlanceModifier.height(WidgetSpec.LARGE_HAIRLINE_MARGIN.dp))
    Hairline()
    Spacer(GlanceModifier.height(WidgetSpec.LARGE_HAIRLINE_MARGIN.dp))
    Column(modifier = GlanceModifier.fillMaxWidth()) {
      ForYouLine(day = day, parsed = parsed, withSummary = true)
      val tip = day.dayTip
      if (!tip.isNullOrBlank()) {
        Spacer(GlanceModifier.height(8.dp))
        val label = day.tipLabel ?: parsed.chrome.tip
        if (label.isNotBlank() && !isEnglish(parsed.locale)) {
          Text(
            text = label,
            style =
              TextStyle(
                color = YuunColors.tertiary,
                fontSize = WidgetSpec.LARGE_TIP_LABEL_FONT.sp,
                fontWeight = FontWeight.Bold,
              ),
            maxLines = 1,
          )
          Spacer(GlanceModifier.height(4.dp))
        }
        Text(
          text = tip,
          style =
            TextStyle(
              color = if (day.fit.isNullOrBlank()) YuunColors.text else YuunColors.secondary,
              fontSize = WidgetSpec.LARGE_TIP_FONT.sp,
            ),
          maxLines = WidgetSpec.LARGE_TIP_LINES,
        )
      }
    }
  }
}

@Composable
private fun YiJiStacked(
  goodLabel: String,
  avoidLabel: String,
  goodText: String,
  avoidText: String,
  goodLines: Int,
  avoidLines: Int,
  fontSize: TextUnit,
) {
  Column(modifier = GlanceModifier.fillMaxWidth()) {
    Text(
      text = "$goodLabel $goodText",
      style = TextStyle(color = YuunColors.text, fontSize = fontSize),
      maxLines = goodLines,
    )
    Spacer(GlanceModifier.height(2.dp))
    Text(
      text = "$avoidLabel $avoidText",
      style = TextStyle(color = YuunColors.secondary, fontSize = fontSize),
      maxLines = avoidLines,
    )
  }
}


/**
 * 黄历模式 large — 撕页黄历纸页：顶行公历+星期 → 左竖排行话 / 大日期+纳音 /
 * 右竖排农历岁次 → 冲煞彭祖 → 全宽宜忌（金/棕）→ 于你。Glance 无原生竖排，
 * 逐字 Column 模拟；边框用单线（Glance border 仅发丝级）。
 */
@Composable
private fun AlmanacLargeLayout(
  day: YuunWidgetDay,
  parsed: ParsedWidgetPayload,
) {
  Column(modifier = GlanceModifier.fillMaxSize()) {
    Row(modifier = GlanceModifier.fillMaxWidth()) {
      Text(
        text = if (isEnglish(parsed.locale)) calendarRow(day, parsed.chrome, parsed.locale) else gregorianOf(day),
        style =
          TextStyle(
            color = YuunColors.secondary,
            fontSize = WidgetSpec.LARGE_ALMANAC_META_FONT.sp,
            fontWeight = FontWeight.Medium,
          ),
        maxLines = 1,
      )
      Spacer(GlanceModifier.defaultWeight())
      if (!isEnglish(parsed.locale)) {
        Text(
          text = weekdayOf(day),
          style =
            TextStyle(
              color = YuunColors.secondary,
              fontSize = WidgetSpec.LARGE_ALMANAC_META_FONT.sp,
            ),
          maxLines = 1,
        )
      }
    }
    Spacer(GlanceModifier.height(6.dp))
    if (isEnglish(parsed.locale)) {
      // en：无竖排（拉丁字不竖排）— 大日期 + 干支·农历一行。
      Column(
        modifier = GlanceModifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
      ) {
        Text(
          text = dayNumOf(day),
          style =
            TextStyle(
              color = YuunColors.text,
              fontSize = WidgetSpec.LARGE_ALMANAC_DAY_FONT.sp,
              fontWeight = FontWeight.Bold,
            ),
          maxLines = 1,
        )
        Text(
          text = "${day.ganZhi} · ${day.lunar}",
          style =
            TextStyle(
              color = YuunColors.secondary,
              fontSize = WidgetSpec.LARGE_ALMANAC_META_FONT.sp,
            ),
          maxLines = 1,
        )
      }
    } else {
    Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
      VChars(text = "${day.ganZhi}日", size = WidgetSpec.LARGE_ALMANAC_STRIP_FONT)
      VChars(text = day.officer?.let { "${it}日" } ?: "", size = WidgetSpec.LARGE_ALMANAC_STRIP_FONT)
      VChars(text = day.dayGod?.let { "值神${it}" } ?: "", size = WidgetSpec.LARGE_ALMANAC_STRIP_FONT)
      VChars(text = day.mansion ?: "", size = WidgetSpec.LARGE_ALMANAC_STRIP_FONT)
      Spacer(GlanceModifier.defaultWeight())
      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
          text = dayNumOf(day),
          style =
            TextStyle(
              color = YuunColors.text,
              fontSize = WidgetSpec.LARGE_ALMANAC_DAY_FONT.sp,
              fontWeight = FontWeight.Bold,
            ),
          maxLines = 1,
        )
        if (!day.nayin.isNullOrBlank()) {
          Text(
            text = day.nayin,
            style =
              TextStyle(
                color = YuunColors.gold,
                fontSize = WidgetSpec.LARGE_ALMANAC_META_FONT.sp,
              ),
            maxLines = 1,
          )
        }
      }
      Spacer(GlanceModifier.defaultWeight())
      VChars(text = day.lunar, size = WidgetSpec.LARGE_ALMANAC_STRIP_FONT)
      VChars(text = day.ganzhiYear ?: "", size = WidgetSpec.LARGE_ALMANAC_STRIP_FONT)
    }
    }
    val clash = day.clashShengxiao?.let { "冲${it}煞${day.evilDirection.orEmpty()}" } ?: ""
    val pengzu =
      day.pengZuStem?.let { stem ->
        day.pengZuBranch?.let { "彭祖 $stem $it" } ?: "彭祖 $stem"
      } ?: ""
    if (clash.isNotBlank() || pengzu.isNotBlank()) {
      Spacer(GlanceModifier.height(6.dp))
      Text(
        text = listOf(clash, pengzu).filter { it.isNotBlank() }.joinToString(" · "),
        style =
          TextStyle(
            color = YuunColors.secondary,
            fontSize = WidgetSpec.LARGE_ALMANAC_META_FONT.sp,
          ),
        maxLines = 1,
      )
    }
    Spacer(GlanceModifier.height(8.dp))
    Hairline()
    Spacer(GlanceModifier.height(8.dp))
    // RemoteViews 每 Column ≤10 直接子节点 — 宜忌合列、于你合列。
    Column(modifier = GlanceModifier.fillMaxWidth()) {
      Text(
        text = "${parsed.chrome.good.ifBlank { "宜" }} ${day.yiLong ?: day.yi}",
        style =
          TextStyle(
            color = YuunColors.text,
            fontSize = WidgetSpec.LARGE_ALMANAC_YIJI_FONT.sp,
          ),
        maxLines = 3,
      )
      Spacer(GlanceModifier.height(2.dp))
      Text(
        text = "${parsed.chrome.avoid.ifBlank { "忌" }} ${day.jiLong ?: day.ji}",
        style =
          TextStyle(
            color = YuunColors.secondary,
            fontSize = WidgetSpec.LARGE_ALMANAC_YIJI_FONT.sp,
          ),
        maxLines = 3,
      )
    }
    if (!day.fit.isNullOrBlank()) {
      Column(modifier = GlanceModifier.fillMaxWidth()) {
        Spacer(GlanceModifier.height(8.dp))
        Hairline()
        Spacer(GlanceModifier.height(8.dp))
        ForYouLine(day = day, parsed = parsed, withSummary = true)
      }
    }
  }
}

/** 竖排文本 — Glance 无原生竖排，逐字成行。 */
@Composable
private fun VChars(
  text: String,
  size: Int,
) {
  if (text.isBlank()) return
  Column(horizontalAlignment = Alignment.CenterHorizontally) {
    text.forEach { ch ->
      Text(
        text = ch.toString(),
        style = TextStyle(color = YuunColors.text, fontSize = size.sp),
        maxLines = 1,
      )
    }
  }
}

/** 当日公历行（7月28日）。 */
private fun gregorianOf(day: YuunWidgetDay): String {
  val parts = day.date.split("-")
  if (parts.size < 3) return day.date
  val month = parts[1].toIntOrNull() ?: return day.date
  val dom = parts[2].toIntOrNull() ?: return day.date
  return "${month}月${dom}日"
}

private fun dayNumOf(day: YuunWidgetDay): String {
  val parts = day.date.split("-")
  if (parts.size < 3) return "—"
  return (parts[2].toIntOrNull()?.toString()) ?: "—"
}

/** 星期（周日为一周之始，与通书一致）。 */
private fun weekdayOf(day: YuunWidgetDay): String {
  val parts = day.date.split("-")
  if (parts.size < 3) return ""
  val y = parts[0].toIntOrNull() ?: return ""
  val m = parts[1].toIntOrNull() ?: return ""
  val d = parts[2].toIntOrNull() ?: return ""
  val cal = java.util.Calendar.getInstance()
  cal.clear()
  cal.set(y, m - 1, d)
  val wd = cal.get(java.util.Calendar.DAY_OF_WEEK) // 1=Sun
  val names = arrayOf("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六")
  return names[wd - 1]
}
