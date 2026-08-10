package expo.modules.widgetkitandroid

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import androidx.glance.appwidget.updateAll

class WidgetKitAndroidModule : Module() {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

  override fun definition() = ModuleDefinition {
    Name("WidgetKitAndroid")

    Function("writePayload") { payloadJson: String, locale: String, tipLabel: String ->
      val ctx = appContext.reactContext ?: return@Function null
      WidgetPayloadStore.write(ctx, payloadJson, locale, tipLabel)
      null
    }

    Function("reloadWidgets") {
      val ctx = appContext.reactContext ?: return@Function null
      scope.launch {
        YuunGlanceAppWidget().updateAll(ctx)
      }
      null
    }
  }
}
