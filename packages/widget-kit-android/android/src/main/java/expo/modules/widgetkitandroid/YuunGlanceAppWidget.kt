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
      style = TextStyle(color = YuunColors.text, fontSize = 12.sp, fontWeight = FontWeight.Bold),
      maxLines = 1,
    )
    if (withSummary && !fitSummary.isNullOrBlank()) {
      Spacer(GlanceModifier.height(4.dp))
      Text(
        text = fitSummary,
        style = TextStyle(color = YuunColors.secondary, fontSize = 12.sp),
        maxLines = 3,
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
      padH = 12.dp
      padV = 12.dp
    }
    WidgetFamily.Medium -> {
      padH = 16.dp
      padV = 14.dp
    }
    WidgetFamily.Large -> {
      padH = 18.dp
      padV = 18.dp
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
      WidgetFamily.Large -> LargeLayout(day, parsed)
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
        style = TextStyle(color = YuunColors.secondary, fontSize = 10.sp, fontWeight = FontWeight.Medium),
        maxLines = 1,
      )
      Spacer(GlanceModifier.defaultWeight())
      MoonLogo(phase = day.moonPhase, dp = 40)
    }
    Spacer(GlanceModifier.height(5.dp))
    Row(verticalAlignment = Alignment.Bottom) {
      Text(
        text = day.ganZhi,
        style = TextStyle(color = YuunColors.text, fontSize = 22.sp, fontWeight = FontWeight.Normal),
        maxLines = 1,
      )
      Spacer(GlanceModifier.width(6.dp))
      Text(
        text = lunarOnly(day, parsed.chrome),
        style = TextStyle(color = YuunColors.secondary, fontSize = 10.sp),
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
        goodLines = 1,
        avoidLines = 1,
        fontSize = 11.sp,
      )
    } else {
      YiJiStacked(
        goodLabel = parsed.chrome.good,
        avoidLabel = parsed.chrome.avoid,
        goodText = day.yi.ifBlank { day.yiShort },
        avoidText = day.jiShort,
        goodLines = 2,
        avoidLines = 1,
        fontSize = 11.sp,
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
      MoonLogo(phase = day.moonPhase, dp = 46)
      Spacer(GlanceModifier.width(12.dp))
      Column(modifier = GlanceModifier.defaultWeight()) {
        Row(verticalAlignment = Alignment.Bottom) {
          Text(
            text = day.ganZhi,
            style = TextStyle(color = YuunColors.text, fontSize = 24.sp, fontWeight = FontWeight.Normal),
            maxLines = 1,
          )
          val pinyin = day.ganZhiPinyin?.takeIf { it.isNotBlank() && isEnglish(parsed.locale) }
          if (pinyin != null) {
            Spacer(GlanceModifier.width(6.dp))
            Text(
              text = pinyin,
              style = TextStyle(color = YuunColors.tertiary, fontSize = 11.sp),
              maxLines = 1,
            )
          }
        }
        Text(
          text = calendarRow(day, parsed.chrome, parsed.locale),
          style = TextStyle(color = YuunColors.secondary, fontSize = 10.sp, fontWeight = FontWeight.Medium),
          maxLines = 1,
        )
      }
      if (day.solarTerm.isNotBlank()) {
        Spacer(GlanceModifier.width(6.dp))
        Text(
          text = day.solarTerm,
          style = TextStyle(color = YuunColors.tertiary, fontSize = 10.sp),
          maxLines = 2,
        )
      }
    }
    Spacer(GlanceModifier.height(9.dp))
    Hairline()
    Spacer(GlanceModifier.height(9.dp))
    if (!day.fit.isNullOrBlank() || !day.fitSummary.isNullOrBlank()) {
      ForYouLine(day = day, parsed = parsed, withSummary = false)
      Spacer(GlanceModifier.height(8.dp))
    }
    Row(modifier = GlanceModifier.fillMaxWidth()) {
      Column(modifier = GlanceModifier.defaultWeight()) {
        Text(
          text = "${parsed.chrome.good} ${day.yi}",
          style = TextStyle(color = YuunColors.text, fontSize = 12.sp),
          maxLines = 2,
        )
      }
      Spacer(GlanceModifier.width(14.dp))
      Column(modifier = GlanceModifier.defaultWeight()) {
        Text(
          text = "${parsed.chrome.avoid} ${day.ji}",
          style = TextStyle(color = YuunColors.secondary, fontSize = 12.sp),
          maxLines = 2,
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
          style = TextStyle(color = YuunColors.text, fontSize = 30.sp, fontWeight = FontWeight.Normal),
          maxLines = 1,
        )
        Spacer(GlanceModifier.height(4.dp))
        Text(
          text = calendarRow(day, parsed.chrome, parsed.locale),
          style = TextStyle(color = YuunColors.secondary, fontSize = 10.sp, fontWeight = FontWeight.Medium),
          maxLines = 1,
        )
        val meta = metaRow(day, parsed.locale)
        if (meta.isNotBlank()) {
          Spacer(GlanceModifier.height(2.dp))
          Text(
            text = meta,
            style = TextStyle(color = YuunColors.tertiary, fontSize = 11.sp),
            maxLines = 1,
          )
        }
      }
      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        MoonLogo(phase = day.moonPhase, dp = 58)
        Spacer(GlanceModifier.height(4.dp))
        Text(
          text = moonCaption(day.moonPhase, parsed.chrome.moonPhaseNames),
          style = TextStyle(color = YuunColors.tertiary, fontSize = 9.sp),
          maxLines = 1,
        )
      }
    }
    Spacer(GlanceModifier.height(8.dp))
    Hairline()
    Spacer(GlanceModifier.height(8.dp))
    YiJiStacked(
      goodLabel = parsed.chrome.good,
      avoidLabel = parsed.chrome.avoid,
      goodText = day.yiLong,
      avoidText = day.jiLong,
      goodLines = 2,
      avoidLines = 2,
      fontSize = 14.sp,
    )
    Spacer(GlanceModifier.height(8.dp))
    Hairline()
    Spacer(GlanceModifier.height(8.dp))
    Column(modifier = GlanceModifier.fillMaxWidth()) {
      ForYouLine(day = day, parsed = parsed, withSummary = true)
      val tip = day.dayTip
      if (!tip.isNullOrBlank()) {
        Spacer(GlanceModifier.height(8.dp))
        val label = day.tipLabel ?: parsed.chrome.tip
        if (label.isNotBlank() && !isEnglish(parsed.locale)) {
          Text(
            text = label,
            style = TextStyle(color = YuunColors.tertiary, fontSize = 9.sp, fontWeight = FontWeight.Bold),
            maxLines = 1,
          )
          Spacer(GlanceModifier.height(4.dp))
        }
        Text(
          text = tip,
          style =
            TextStyle(
              color = if (day.fit.isNullOrBlank()) YuunColors.text else YuunColors.secondary,
              fontSize = 12.sp,
            ),
          maxLines = 3,
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
