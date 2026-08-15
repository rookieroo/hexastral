#!/usr/bin/env node
/**
 * Widget spec generator — turns apps/auspice-app/lib/widget-spec.json (the
 * single source of truth) into:
 *   - packages/widget-kit-android/android/src/main/java/expo/modules/widgetkitandroid/WidgetSpec.kt
 *   - apps/auspice-app/targets/widget/WidgetSpec.swift
 *
 * The RN preview imports the JSON directly. The generated files are COMMITTED;
 * `--check` regenerates to memory and diffs — wire it into preflight so any
 * spec edit that forgets to regenerate fails loudly.
 *
 * Usage:
 *   node scripts/gen-widget-spec.mjs            # write generated files
 *   node scripts/gen-widget-spec.mjs --check    # exit 1 when out of date
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SPEC_PATH = join(ROOT, 'apps/auspice-app/lib/widget-spec.json')
const KOTLIN_PATH = join(
  ROOT,
  'packages/widget-kit-android/android/src/main/java/expo/modules/widgetkitandroid/WidgetSpec.kt',
)
const SWIFT_PATH = join(ROOT, 'apps/auspice-app/targets/widget/WidgetSpec.swift')

const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'))
const { family, cornerRadiusPt } = spec
const S = family.small
const M = family.medium
const L = family.large

const HEADER = `// GENERATED FILE — from apps/auspice-app/lib/widget-spec.json via
// \`bun run widget-spec:gen\`. Do not edit by hand; edit the JSON and regenerate.`

function kotlinBody() {
  const ints = (name, value) => `    const val ${name} = ${value}`
  const doubles = (name, value) => `    const val ${name} = ${value}`
  return `${HEADER}

package expo.modules.widgetkitandroid

object WidgetSpec {
    // Corner radius (dp) — declared as systemAppWidgetBackgroundRadius.
${doubles('CORNER_RADIUS', cornerRadiusPt.android)}

    // Small (2×2)
${ints('SMALL_PADDING', S.padding)}
${ints('SMALL_MOON', S.moonSize)}
${ints('SMALL_WEEKDAY_FONT', S.weekdayFont)}
${ints('SMALL_GANZHI_FONT', S.ganZhiFont)}
${doubles('SMALL_GANZHI_MIN_SCALE', S.ganZhiMinScale)}
${ints('SMALL_LUNAR_FONT', S.lunarFont)}
${ints('SMALL_FOR_YOU', S.forYou.android)}
${ints('SMALL_FOR_YOU_FONT', S.forYouFont)}
${ints('SMALL_YIJI_FONT', S.yijiFont)}
${ints('SMALL_GOOD_LINES', S.goodLines)}
${ints('SMALL_AVOID_LINES', S.avoidLines)}
${ints('SMALL_GOOD_LINES_WITH_FIT', S.androidGoodLinesWithFit)}
${ints('SMALL_AVOID_LINES_WITH_FIT', S.androidAvoidLinesWithFit)}

    // Medium (4×2)
${ints('MEDIUM_PADDING', M.padding)}
${ints('MEDIUM_MOON', M.moonSize)}
${ints('MEDIUM_GANZHI_FONT', M.ganZhiFont)}
${doubles('MEDIUM_GANZHI_MIN_SCALE', M.ganZhiMinScale)}
${ints('MEDIUM_PINYIN_FONT', M.pinyinFont)}
${ints('MEDIUM_CALENDAR_FONT', M.calendarFont)}
${ints('MEDIUM_TERM_FONT', M.termFont)}
${ints('MEDIUM_TERM_MAX_LINES', M.termMaxLines)}
${ints('MEDIUM_TERM_MAX_WIDTH', M.termMaxWidth)}
${ints('MEDIUM_HAIRLINE_MARGIN', M.hairlineMargin)}
${ints('MEDIUM_FOR_YOU', M.forYou.android)}
${ints('MEDIUM_FOR_YOU_FONT', M.forYouFont)}
${ints('MEDIUM_YIJI_FONT', M.yijiFont)}
${ints('MEDIUM_GOOD_LINES', M.goodLines)}
${ints('MEDIUM_AVOID_LINES', M.avoidLines)}
${ints('MEDIUM_COLUMN_GAP', M.columnGap)}

    // Large (4×4)
${ints('LARGE_PADDING', L.padding)}
${ints('LARGE_MOON', L.moonSize)}
${ints('LARGE_MOON_CAPTION_FONT', L.moonCaptionFont)}
${ints('LARGE_GANZHI_FONT', L.ganZhiFont)}
${doubles('LARGE_GANZHI_MIN_SCALE', L.ganZhiMinScale)}
${ints('LARGE_PINYIN_FONT', L.pinyinFont)}
${ints('LARGE_CALENDAR_FONT', L.calendarFont)}
${ints('LARGE_META_FONT', L.metaFont)}
${ints('LARGE_HAIRLINE_MARGIN', L.hairlineMargin)}
${ints('LARGE_YIJI_FONT', L.yijiFont)}
${ints('LARGE_GOOD_LINES', L.goodLines)}
${ints('LARGE_AVOID_LINES', L.avoidLines)}
${ints('LARGE_FOR_YOU', L.forYou.android)}
${ints('LARGE_FOR_YOU_FONT', L.forYouFont)}
${ints('LARGE_FOR_YOU_SUMMARY_FONT', L.forYouSummaryFont)}
${ints('LARGE_FOR_YOU_SUMMARY_LINES', L.forYouSummaryLines)}
${ints('LARGE_TIP_LABEL_FONT', L.tipLabelFont)}
${ints('LARGE_TIP_FONT', L.tipFont)}
${ints('LARGE_TIP_LINES', L.tipLines)}

    // Large — 黄历模式 (撕页黄历)
${ints('LARGE_ALMANAC_PADDING', L.almanac.padding)}
${ints('LARGE_ALMANAC_V_PADDING', L.almanac.vPadding)}
${ints('LARGE_ALMANAC_DAY_FONT', L.almanac.dayFont)}
${ints('LARGE_ALMANAC_STRIP_FONT', L.almanac.stripFont)}
${ints('LARGE_ALMANAC_META_FONT', L.almanac.metaFont)}
${ints('LARGE_ALMANAC_YIJI_FONT', L.almanac.yijiFont)}
}
`
}

function swiftBody() {
  const cg = (name, value) => `    static let ${name}: CGFloat = ${value}`
  const bool = (name, value) => `    static let ${name} = ${value}`
  return `${HEADER}

import CoreGraphics

enum WidgetSpec {
    // Corner radius (pt) — containerBackground applies the system mask; this
    // value matches the preview only.
${cg('cornerRadius', cornerRadiusPt.ios)}

    // Small (systemSmall)
${cg('smallPadding', S.padding)}
${cg('smallMoon', S.moonSize)}
${cg('smallWeekdayFont', S.weekdayFont)}
${cg('smallGanZhiFont', S.ganZhiFont)}
${cg('smallGanZhiMinScale', S.ganZhiMinScale)}
${cg('smallLunarFont', S.lunarFont)}
${bool('smallForYou', S.forYou.ios)}
${cg('smallForYouFont', S.forYouFont)}
${cg('smallYijiFont', S.yijiFont)}
${int('smallGoodLines', S.goodLines)}
${int('smallAvoidLines', S.avoidLines)}

    // Medium (systemMedium)
${cg('mediumPadding', M.padding)}
${cg('mediumMoon', M.moonSize)}
${cg('mediumGanZhiFont', M.ganZhiFont)}
${cg('mediumGanZhiMinScale', M.ganZhiMinScale)}
${cg('mediumPinyinFont', M.pinyinFont)}
${cg('mediumCalendarFont', M.calendarFont)}
${cg('mediumTermFont', M.termFont)}
${int('mediumTermMaxLines', M.termMaxLines)}
${cg('mediumTermMaxWidth', M.termMaxWidth)}
${cg('mediumHairlineMargin', M.hairlineMargin)}
${bool('mediumForYou', M.forYou.ios)}
${cg('mediumForYouFont', M.forYouFont)}
${cg('mediumYijiFont', M.yijiFont)}
${int('mediumGoodLines', M.goodLines)}
${int('mediumAvoidLines', M.avoidLines)}
${cg('mediumColumnGap', M.columnGap)}

    // Large (systemLarge)
${cg('largePadding', L.padding)}
${cg('largeMoon', L.moonSize)}
${cg('largeMoonCaptionFont', L.moonCaptionFont)}
${cg('largeGanZhiFont', L.ganZhiFont)}
${cg('largeGanZhiMinScale', L.ganZhiMinScale)}
${cg('largePinyinFont', L.pinyinFont)}
${cg('largeCalendarFont', L.calendarFont)}
${cg('largeMetaFont', L.metaFont)}
${cg('largeHairlineMargin', L.hairlineMargin)}
${cg('largeYijiFont', L.yijiFont)}
${int('largeGoodLines', L.goodLines)}
${int('largeAvoidLines', L.avoidLines)}
${bool('largeForYou', L.forYou.ios)}
${cg('largeForYouFont', L.forYouFont)}
${cg('largeForYouSummaryFont', L.forYouSummaryFont)}
${int('largeForYouSummaryLines', L.forYouSummaryLines)}
${cg('largeTipLabelFont', L.tipLabelFont)}
${cg('largeTipFont', L.tipFont)}
${int('largeTipLines', L.tipLines)}

    // Large — 黄历模式 (撕页黄历)
${cg('largeAlmanacPadding', L.almanac.padding)}
${cg('largeAlmanacVPadding', L.almanac.vPadding)}
${cg('largeAlmanacDayFont', L.almanac.dayFont)}
${cg('largeAlmanacStripFont', L.almanac.stripFont)}
${cg('largeAlmanacMetaFont', L.almanac.metaFont)}
${cg('largeAlmanacYijiFont', L.almanac.yijiFont)}
}
`

  function int(name, value) {
    return `    static let ${name} = ${value}`
  }
}

const kotlin = kotlinBody()
const swift = swiftBody()

const check = process.argv.includes('--check')
if (check) {
  let failed = false
  for (const [label, path, content] of [
    ['WidgetSpec.kt', KOTLIN_PATH, kotlin],
    ['WidgetSpec.swift', SWIFT_PATH, swift],
  ]) {
    try {
      const current = readFileSync(path, 'utf8')
      if (current !== content) {
        console.error(`OUT OF DATE ${label} — run \`bun run widget-spec:gen\` (${path})`)
        failed = true
      }
    } catch {
      console.error(`MISSING ${label} — run \`bun run widget-spec:gen\` (${path})`)
      failed = true
    }
  }
  if (failed) {
    console.error('widget spec drift: generated files differ from widget-spec.json')
    process.exit(1)
  }
  console.log('widget spec generated files up to date')
  process.exit(0)
}

writeFileSync(KOTLIN_PATH, kotlin)
writeFileSync(SWIFT_PATH, swift)
console.log(`wrote ${KOTLIN_PATH}`)
console.log(`wrote ${SWIFT_PATH}`)
