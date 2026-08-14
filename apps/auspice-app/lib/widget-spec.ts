/**
 * Typed loader for the single widget layout spec (widget-spec.json).
 *
 * The same JSON drives the RN preview AND (via generated WidgetSpec.kt /
 * WidgetSpec.swift) the native Glance + WidgetKit widgets — see the `_note` in
 * the JSON and `scripts/gen-widget-spec.mjs`. Edit the JSON, not the constants
 * scattered in renderers.
 */

import raw from './widget-spec.json'

export type WidgetFamilySpec = {
  padding: number
  moonSize: number
  ganZhiFont: number
  ganZhiMinScale: number
  forYou: { ios: boolean; android: boolean }
  forYouFont: number
  yijiFont: number
  goodLines: number
  avoidLines: number
}

export type SmallFamilySpec = WidgetFamilySpec & {
  weekdayFont: number
  lunarFont: number
  androidGoodLinesWithFit: number
  androidAvoidLinesWithFit: number
}

export type MediumFamilySpec = WidgetFamilySpec & {
  pinyinFont: number
  calendarFont: number
  termFont: number
  termMaxLines: number
  termMaxWidth: number
  hairlineMargin: number
  columnGap: number
}

export type LargeFamilySpec = WidgetFamilySpec & {
  moonCaptionFont: number
  pinyinFont: number
  calendarFont: number
  metaFont: number
  hairlineMargin: number
  forYouSummaryFont: number
  forYouSummaryLines: number
  tipLabelFont: number
  tipFont: number
  tipLines: number
}

export type WidgetSpecDoc = {
  version: number
  boxSizesPt: {
    small: { w: number; h: number }
    medium: { w: number; h: number }
    large: { w: number; h: number }
  }
  cornerRadiusPt: { ios: number; android: number }
  family: {
    small: SmallFamilySpec
    medium: MediumFamilySpec
    large: LargeFamilySpec
  }
}

export const WIDGET_SPEC = raw as WidgetSpecDoc
