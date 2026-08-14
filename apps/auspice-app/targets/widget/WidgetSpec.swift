// GENERATED FILE — from apps/auspice-app/lib/widget-spec.json via
// `bun run widget-spec:gen`. Do not edit by hand; edit the JSON and regenerate.

import CoreGraphics

enum WidgetSpec {
    // Corner radius (pt) — containerBackground applies the system mask; this
    // value matches the preview only.
    static let cornerRadius: CGFloat = 22

    // Small (systemSmall)
    static let smallPadding: CGFloat = 12
    static let smallMoon: CGFloat = 40
    static let smallWeekdayFont: CGFloat = 10
    static let smallGanZhiFont: CGFloat = 22
    static let smallGanZhiMinScale: CGFloat = 0.75
    static let smallLunarFont: CGFloat = 10
    static let smallForYou = false
    static let smallForYouFont: CGFloat = 12
    static let smallYijiFont: CGFloat = 11
    static let smallGoodLines = 2
    static let smallAvoidLines = 1

    // Medium (systemMedium)
    static let mediumPadding: CGFloat = 16
    static let mediumMoon: CGFloat = 46
    static let mediumGanZhiFont: CGFloat = 27
    static let mediumGanZhiMinScale: CGFloat = 0.8
    static let mediumPinyinFont: CGFloat = 11
    static let mediumCalendarFont: CGFloat = 10
    static let mediumTermFont: CGFloat = 10
    static let mediumTermMaxLines = 2
    static let mediumTermMaxWidth: CGFloat = 58
    static let mediumHairlineMargin: CGFloat = 9
    static let mediumForYou = false
    static let mediumForYouFont: CGFloat = 12
    static let mediumYijiFont: CGFloat = 12
    static let mediumGoodLines = 2
    static let mediumAvoidLines = 2
    static let mediumColumnGap: CGFloat = 14

    // Large (systemLarge)
    static let largePadding: CGFloat = 18
    static let largeMoon: CGFloat = 58
    static let largeMoonCaptionFont: CGFloat = 9
    static let largeGanZhiFont: CGFloat = 34
    static let largeGanZhiMinScale: CGFloat = 0.85
    static let largePinyinFont: CGFloat = 12
    static let largeCalendarFont: CGFloat = 10
    static let largeMetaFont: CGFloat = 11
    static let largeHairlineMargin: CGFloat = 8
    static let largeYijiFont: CGFloat = 14
    static let largeGoodLines = 2
    static let largeAvoidLines = 2
    static let largeForYou = true
    static let largeForYouFont: CGFloat = 12
    static let largeForYouSummaryFont: CGFloat = 12
    static let largeForYouSummaryLines = 3
    static let largeTipLabelFont: CGFloat = 9
    static let largeTipFont: CGFloat = 12
    static let largeTipLines = 3
}
