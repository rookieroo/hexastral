package expo.modules.widgetkitandroid

import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * Raster moon matching iOS `YuunPhaseLogo` (lit disc + tilted terminator gradient).
 * Glance has no Canvas composable, so we bake a Bitmap for [androidx.glance.Image].
 */
object MoonPhaseBitmap {
  fun render(
    context: Context,
    phase: Double,
    sizePx: Int,
  ): Bitmap {
    val dark =
      (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
        Configuration.UI_MODE_NIGHT_YES
    val lit = if (dark) Color.parseColor("#FAFAFA") else Color.parseColor("#EDE6D8")
    val voidC = if (dark) Color.parseColor("#121218") else Color.parseColor("#3C2415")
    val stroke =
      if (dark) {
        Color.argb((0.25f * 255).toInt(), 160, 160, 160)
      } else {
        Color.argb((0.18f * 255).toInt(), 0x3C, 0x24, 0x15)
      }

    val bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val side = sizePx.toFloat()
    val cx = side / 2f
    val cy = side / 2f
    val r = side * 0.42f

    var p = phase % 1.0
    if (p < 0) p += 1.0
    val isWaning = p > 0.5
    val cosPhase = cos(2 * Math.PI * p)
    val termPos = ((1 + cosPhase) / 2).toFloat()

    val tilt = Math.toRadians(22.0)
    val sign = if (isWaning) -1f else 1f
    val gx1x = cx - sign * r * cos(tilt).toFloat()
    val gx1y = cy - r * sin(tilt).toFloat()
    val gx2x = cx + sign * r * cos(tilt).toFloat()
    val gx2y = cy + r * sin(tilt).toFloat()

    val pw = 0.42f
    val s0 = (termPos - pw * 0.55f).coerceAtLeast(0f)
    val s1 = (termPos - pw * 0.12f).coerceAtLeast(0f)
    val s2 = (termPos + pw * 0.12f).coerceAtMost(1f)
    val s3 = (termPos + pw * 0.5f).coerceAtMost(1f)

    val disc = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = lit }
    canvas.drawCircle(cx, cy, r, disc)

    val shadowPaint =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader =
          LinearGradient(
            gx1x,
            gx1y,
            gx2x,
            gx2y,
            intArrayOf(
              voidC,
              voidC,
              Color.argb((0.55f * 255).toInt(), Color.red(voidC), Color.green(voidC), Color.blue(voidC)),
              Color.argb((0.12f * 255).toInt(), Color.red(voidC), Color.green(voidC), Color.blue(voidC)),
              Color.TRANSPARENT,
              Color.TRANSPARENT,
            ),
            floatArrayOf(0f, s0, s1, s2, s3, 1f),
            Shader.TileMode.CLAMP,
          )
      }
    canvas.drawCircle(cx, cy, r, shadowPaint)

    val limb =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader =
          RadialGradient(
            cx,
            cy,
            r,
            intArrayOf(Color.TRANSPARENT, Color.TRANSPARENT, Color.argb(26, 0, 0, 0)),
            floatArrayOf(0f, 0.72f, 1f),
            Shader.TileMode.CLAMP,
          )
      }
    canvas.drawCircle(cx, cy, r, limb)

    val strokePaint =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = stroke
        strokeWidth = (side * 0.012f).coerceAtLeast(1f)
      }
    canvas.drawCircle(cx, cy, r, strokePaint)

    return bmp
  }

  fun sizePx(
    context: Context,
    dp: Int,
  ): Int {
    val density = context.resources.displayMetrics.density
    return (dp * density).toInt().coerceAtLeast(24)
  }
}
