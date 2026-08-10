package expo.modules.widgetkitandroid

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
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
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import expo.modules.widgetkitandroid.WidgetPayloadParser.calendarRow
import expo.modules.widgetkitandroid.WidgetPayloadParser.weekdayChip

/**
 * Responsive Glance widget — breakpoints map to iOS systemSmall / Medium / Large.
 */
class YuunGlanceAppWidget : GlanceAppWidget() {
  override val sizeMode =
    SizeMode.Responsive(
      setOf(SIZE_SMALL, SIZE_MEDIUM, SIZE_LARGE),
    )

  override suspend fun provideGlance(
    context: Context,
    id: GlanceId,
  ) {
    val locale = WidgetPayloadStore.readLocale(context)
    val parsed =
      WidgetPayloadParser.parse(WidgetPayloadStore.readPayloadJson(context), locale)

    provideContent {
      val size = LocalSize.current
      YuunWidgetContent(parsed = parsed, size = size)
    }
  }

  companion object {
    val SIZE_SMALL = DpSize(110.dp, 110.dp)
    val SIZE_MEDIUM = DpSize(250.dp, 110.dp)
    val SIZE_LARGE = DpSize(250.dp, 280.dp)
  }
}

class YuunWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = YuunGlanceAppWidget()
}

/** Day/night pairs — Glance ColorProvider requires both. */
private object YuunColors {
  val bg = ColorProvider(day = Color(0xFFF4F1EA), night = Color(0xFF0B0F1A))
  val text = ColorProvider(day = Color(0xFF09090B), night = Color(0xFFFAFAFA))
  val secondary = ColorProvider(day = Color(0xFF71717A), night = Color(0xFFA1A1AA))
  val tertiary = ColorProvider(day = Color(0xFFA1A1AA), night = Color(0xFF71717A))
  val separator = ColorProvider(day = Color(0xFFE4E4E7), night = Color(0xFF27272A))
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
private fun YuunWidgetContent(
  parsed: ParsedWidgetPayload,
  size: DpSize,
) {
  Column(
    modifier =
      GlanceModifier
        .fillMaxSize()
        .background(YuunColors.bg)
        .padding(12.dp)
        .then(openAppModifier()),
    verticalAlignment = Alignment.Top,
  ) {
    val day = parsed.today
    if (day == null) {
      EmptyState(parsed.chrome.emptyHint)
      return@Column
    }
    when {
      size.height >= 200.dp && size.width >= 180.dp -> LargeLayout(day, parsed)
      size.width >= 180.dp -> MediumLayout(day, parsed)
      else -> SmallLayout(day, parsed)
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
      style =
        TextStyle(
          color = YuunColors.text,
          fontSize = 16.sp,
          fontWeight = FontWeight.Bold,
        ),
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
  Text(
    text = weekdayChip(day.date, parsed.locale),
    style = TextStyle(color = YuunColors.secondary, fontSize = 11.sp),
  )
  Spacer(GlanceModifier.height(4.dp))
  Text(
    text = day.ganZhiPinyin?.takeIf { it.isNotBlank() } ?: day.ganZhi,
    style =
      TextStyle(
        color = YuunColors.text,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
      ),
  )
  Spacer(GlanceModifier.height(6.dp))
  val fit = day.fit
  if (!fit.isNullOrBlank()) {
    Text(
      text = "${parsed.chrome.forYou} · $fit",
      style = TextStyle(color = YuunColors.secondary, fontSize = 11.sp),
      maxLines = 2,
    )
  } else {
    Text(
      text = "${parsed.chrome.good} ${day.yiShort}",
      style = TextStyle(color = YuunColors.text, fontSize = 11.sp),
      maxLines = 1,
    )
    Text(
      text = "${parsed.chrome.avoid} ${day.jiShort}",
      style = TextStyle(color = YuunColors.secondary, fontSize = 11.sp),
      maxLines = 1,
    )
  }
}

@Composable
private fun MediumLayout(
  day: YuunWidgetDay,
  parsed: ParsedWidgetPayload,
) {
  Text(
    text = calendarRow(day, parsed.locale),
    style = TextStyle(color = YuunColors.secondary, fontSize = 11.sp),
    maxLines = 1,
  )
  Spacer(GlanceModifier.height(4.dp))
  Text(
    text = day.ganZhi,
    style =
      TextStyle(
        color = YuunColors.text,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
      ),
  )
  Spacer(GlanceModifier.height(8.dp))
  Row(modifier = GlanceModifier.fillMaxWidth()) {
    Column(modifier = GlanceModifier.defaultWeight()) {
      Text(
        text = parsed.chrome.good,
        style = TextStyle(color = YuunColors.tertiary, fontSize = 10.sp),
      )
      Text(
        text = day.yi,
        style = TextStyle(color = YuunColors.text, fontSize = 12.sp),
        maxLines = 2,
      )
    }
    Spacer(GlanceModifier.width(8.dp))
    Column(modifier = GlanceModifier.defaultWeight()) {
      Text(
        text = parsed.chrome.avoid,
        style = TextStyle(color = YuunColors.tertiary, fontSize = 10.sp),
      )
      Text(
        text = day.ji,
        style = TextStyle(color = YuunColors.text, fontSize = 12.sp),
        maxLines = 2,
      )
    }
  }
  val fit = day.fit
  if (!fit.isNullOrBlank()) {
    Spacer(GlanceModifier.height(6.dp))
    Text(
      text = "${parsed.chrome.forYou} · ${day.fitSummary ?: fit}",
      style = TextStyle(color = YuunColors.secondary, fontSize = 11.sp),
      maxLines = 2,
    )
  }
}

@Composable
private fun LargeLayout(
  day: YuunWidgetDay,
  parsed: ParsedWidgetPayload,
) {
  MediumLayout(day, parsed)
  val tip = day.dayTip
  if (!tip.isNullOrBlank()) {
    Spacer(GlanceModifier.height(8.dp))
    Spacer(
      GlanceModifier
        .fillMaxWidth()
        .height(1.dp)
        .background(YuunColors.separator),
    )
    Spacer(GlanceModifier.height(8.dp))
    val label = day.tipLabel ?: parsed.chrome.tip
    if (label.isNotBlank()) {
      Text(
        text = label,
        style = TextStyle(color = YuunColors.tertiary, fontSize = 10.sp),
      )
    }
    Text(
      text = tip,
      style = TextStyle(color = YuunColors.text, fontSize = 12.sp),
      maxLines = 3,
    )
  }
  Spacer(GlanceModifier.height(8.dp))
  Text(
    text = "${parsed.chrome.good} ${day.yiLong}",
    style = TextStyle(color = YuunColors.text, fontSize = 12.sp),
    maxLines = 2,
  )
  Text(
    text = "${parsed.chrome.avoid} ${day.jiLong}",
    style = TextStyle(color = YuunColors.secondary, fontSize = 12.sp),
    maxLines = 2,
  )
}
