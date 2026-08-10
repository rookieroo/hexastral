package expo.modules.widgetkitandroid

import android.content.Context

/**
 * App-private SharedPreferences mirror of the iOS App Group envelope.
 * Keys match @zhop/widget-kit-ios so RN can dual-write the same JSON.
 */
object WidgetPayloadStore {
  const val PREFS_NAME = "yuun_widget_prefs"
  const val PAYLOAD_KEY = "hexastral_widget_payload_v1"
  const val LOCALE_KEY = "yuun_widget_locale"
  const val TIP_LABEL_KEY = "yuun_widget_tip_label"

  fun write(context: Context, payloadJson: String, locale: String, tipLabel: String) {
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(PAYLOAD_KEY, payloadJson)
      .putString(LOCALE_KEY, locale)
      .putString(TIP_LABEL_KEY, tipLabel)
      .apply()
  }

  fun readPayloadJson(context: Context): String? =
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(PAYLOAD_KEY, null)

  fun readLocale(context: Context): String =
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(LOCALE_KEY, "en") ?: "en"

  fun readTipLabel(context: Context): String =
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(TIP_LABEL_KEY, "") ?: ""
}
