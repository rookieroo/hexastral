import ExpoModulesCore
import WidgetKit

/**
 * Reloads WidgetKit timelines + flushes App Group UserDefaults so the
 * home-screen extension picks up RN writes immediately (not next calendar day).
 */
public class WidgetKitIosModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetKitIos")

    Function("reloadTimelines") {
      WidgetCenter.shared.reloadAllTimelines()
    }

    Function("flushAppGroup") { (suiteName: String) in
      UserDefaults(suiteName: suiteName)?.synchronize()
    }
  }
}
