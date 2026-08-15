/**
 * WidgetCard — RN preview of home-screen widget layouts.
 * Zinc type on 宣纸 (light) / 星空 (dark) surfaces — mirrors native WidgetKit.
 * Layout SSOT: lib/widget-spec.json (shared with Swift WidgetSpec.swift and
 * Kotlin WidgetSpec.kt via `bun run widget-spec:gen`; previews and native
 * widgets read the same numbers — never a second set).
 */

import { useTheme } from '@zhop/core-ui'
import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { almanacCopy } from '@/lib/almanac-copy'
import type { AuspiceDay, AuspicePersonalization } from '@/lib/api'
import { localizeSolarTermCompact } from '@/lib/culture/names'
import { nayinOf } from '@/lib/huangli-day'
import { getStrings, type Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { useVoiceMode } from '@/lib/voice-mode-context'
import { WIDGET_SPEC } from '@/lib/widget-spec'
import { resolveRegisterSync } from '@/lib/yiji-display-mode'
import { useYijiDisplayMode } from '@/lib/yiji-mode-context'
import { almanacPalette } from './AlmanacPage'
import {
  buildDailyCardModel,
  compactChrome,
  compactVerbs,
  type DailyCardModel,
  formatWidgetCalendarRow,
  formatWidgetWeekdayChip,
  moonPhaseCaption,
  verbBudget,
} from './DailyCard'
import { PhaseLogo } from './PhaseLogo'
import { WidgetSurface, type WidgetSurfaceMode } from './WidgetSurface'

export type WidgetSize = 'small' | 'medium' | 'large'

type Strings = ReturnType<typeof getStrings>

type Chrome = {
  text: string
  secondary: string
  tertiary: string
  separator: string
}

function chromeFor(mode: WidgetSurfaceMode): Chrome {
  if (mode === 'light') {
    return {
      text: '#09090B',
      secondary: '#71717A',
      tertiary: '#A1A1AA',
      separator: '#E4E4E7',
    }
  }
  return {
    text: '#FAFAFA',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    separator: '#27272A',
  }
}

type SubProps = {
  model: DailyCardModel
  phaseOverride?: number
  chrome: Chrome
  locale: Locale
  /** Widget-locale strings (may differ from the app locale in settings previews). */
  strings: Strings
}

export function WidgetCard({
  date,
  day,
  personalization,
  size,
  phaseOverride,
  width,
  height,
  localeOverride,
  variant = 'ios',
}: {
  date: string
  day: AuspiceDay
  personalization?: AuspicePersonalization | null
  size: WidgetSize
  phaseOverride?: number
  width: number
  height: number
  /** Force widget locale (system locale for settings previews). */
  localeOverride?: Locale
  /**
   * 'ios' mirrors WidgetKit; 'android' mirrors the Glance layouts
   * (packages/widget-kit-android YuunGlanceAppWidget.kt) — medium differs:
   * on HyperOS/Redmi the medium cell is narrow (2×2) so 宜/忌 wrap to two
   * lines per column instead of the wide iPhone single-row columns.
   */
  variant?: 'ios' | 'android'
  /** @deprecated PhaseLogo ignores water-ink skins. */
  moonSkinId?: string
}) {
  const { t, locale: appLocale } = useStrings()
  const locale = localeOverride ?? appLocale
  const strings = localeOverride ? getStrings(localeOverride) : t
  const { mode } = useTheme()
  const surfaceMode: WidgetSurfaceMode = mode === 'light' ? 'light' : 'dark'
  const chrome = chromeFor(surfaceMode)
  const model = useMemo(
    () => buildDailyCardModel(date, day, personalization, strings, locale),
    [date, day, personalization, strings, locale]
  )
  const sub = { model, phaseOverride, chrome, locale, strings }
  const { classical } = useVoiceMode()
  const body =
    classical && size === 'large' ? (
      <AlmanacLargePreview day={day} model={model} locale={locale} />
    ) : variant === 'android' ? (
      size === 'medium' ? (
        <AndroidMediumWidget {...sub} />
      ) : size === 'large' ? (
        <LargeWidget {...sub} />
      ) : (
        <AndroidSmallWidget {...sub} />
      )
    ) : size === 'medium' ? (
      <MediumWidget {...sub} />
    ) : size === 'large' ? (
      <LargeWidget {...sub} />
    ) : (
      <SmallWidget {...sub} />
    )

  return (
    <WidgetSurface mode={surfaceMode} width={width} height={height}>
      {body}
    </WidgetSurface>
  )
}

function phaseOf(model: DailyCardModel, override?: number) {
  return override ?? model.moonPhase
}

function termLabel(model: DailyCardModel, locale: Locale): string {
  return localizeSolarTermCompact(model.solarTermName, locale)
}

function YiJiLabeled({
  label,
  verbs,
  labelColor,
  textColor,
  fontSize,
  lines,
}: {
  label: string
  verbs: string
  labelColor: string
  textColor: string
  fontSize: number
  lines: number
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
      <Text
        style={{
          color: labelColor,
          fontSize: Math.max(10, fontSize - 1),
          fontWeight: '700',
          letterSpacing: 0.6,
          paddingTop: 1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{ flex: 1, color: textColor, fontSize, lineHeight: fontSize + 6 }}
        numberOfLines={lines}
      >
        {verbs}
      </Text>
    </View>
  )
}

function SmallWidget({ model, phaseOverride, chrome, locale }: SubProps) {
  const S = WIDGET_SPEC.family.small
  const L = compactChrome(locale)
  const { mode } = useYijiDisplayMode()
  return (
    <View style={{ flex: 1, padding: S.padding, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            color: chrome.secondary,
            fontSize: S.weekdayFont,
            fontWeight: '600',
            letterSpacing: 0.4,
          }}
          numberOfLines={1}
        >
          {formatWidgetWeekdayChip(model.date, locale)}
        </Text>
        <PhaseLogo phase={phaseOf(model, phaseOverride)} size={S.moonSize} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
        <Text
          style={{
            color: chrome.text,
            fontSize: S.ganZhiFont,
            fontWeight: '300',
            letterSpacing: 2,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={S.ganZhiMinScale}
        >
          {model.ganZhi}
        </Text>
        <Text
          style={{ color: chrome.secondary, fontSize: S.lunarFont, flexShrink: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {model.lunarMonthDay || '—'}
        </Text>
      </View>

      <View style={{ gap: 3 }}>
        <YiJiLabeled
          label={L.yi}
          verbs={compactVerbs(model.goodForRaw, verbBudget(locale, 'medium'), locale, mode)}
          labelColor={chrome.text}
          textColor={chrome.text}
          fontSize={S.yijiFont}
          lines={S.goodLines}
        />
        <YiJiLabeled
          label={L.ji}
          verbs={compactVerbs(model.avoidRaw, verbBudget(locale, 'small'), locale, mode)}
          labelColor={chrome.text}
          textColor={chrome.secondary}
          fontSize={S.yijiFont}
          lines={S.avoidLines}
        />
      </View>
    </View>
  )
}

/**
 * Android small replica — mirrors Glance `SmallLayout`: when birth fit is
 * present it adds the For you line and tightens 宜/忌 to one line each
 * (Android-only behavior from the spec).
 */
function AndroidSmallWidget({ model, phaseOverride, chrome, locale }: SubProps) {
  const S = WIDGET_SPEC.family.small
  const L = compactChrome(locale)
  const { mode } = useYijiDisplayMode()
  const hasFit = Boolean(model.fitLabel || model.fitSummary)
  return (
    <View style={{ flex: 1, padding: S.padding, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            color: chrome.secondary,
            fontSize: S.weekdayFont,
            fontWeight: '600',
            letterSpacing: 0.4,
          }}
          numberOfLines={1}
        >
          {formatWidgetWeekdayChip(model.date, locale)}
        </Text>
        <PhaseLogo phase={phaseOf(model, phaseOverride)} size={S.moonSize} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
        <Text
          style={{
            color: chrome.text,
            fontSize: S.ganZhiFont,
            fontWeight: '300',
            letterSpacing: 2,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={S.ganZhiMinScale}
        >
          {model.ganZhi}
        </Text>
        <Text
          style={{ color: chrome.secondary, fontSize: S.lunarFont, flexShrink: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {model.lunarMonthDay || '—'}
        </Text>
      </View>

      {hasFit ? (
        <>
          <Text
            style={{ color: chrome.text, fontSize: S.forYouFont, fontWeight: '700' }}
            numberOfLines={1}
          >
            {locale === 'en' ? L.forYou : `${L.forYou} · ${model.fitLabel}`}
          </Text>
          <View style={{ gap: 3 }}>
            <YiJiLabeled
              label={L.yi}
              verbs={compactVerbs(model.goodForRaw, verbBudget(locale, 'small'), locale, mode)}
              labelColor={chrome.text}
              textColor={chrome.text}
              fontSize={S.yijiFont}
              lines={S.androidGoodLinesWithFit}
            />
            <YiJiLabeled
              label={L.ji}
              verbs={compactVerbs(model.avoidRaw, verbBudget(locale, 'small'), locale, mode)}
              labelColor={chrome.text}
              textColor={chrome.secondary}
              fontSize={S.yijiFont}
              lines={S.androidAvoidLinesWithFit}
            />
          </View>
        </>
      ) : (
        <View style={{ gap: 3 }}>
          <YiJiLabeled
            label={L.yi}
            verbs={compactVerbs(model.goodForRaw, verbBudget(locale, 'medium'), locale, mode)}
            labelColor={chrome.text}
            textColor={chrome.text}
            fontSize={S.yijiFont}
            lines={S.goodLines}
          />
          <YiJiLabeled
            label={L.ji}
            verbs={compactVerbs(model.avoidRaw, verbBudget(locale, 'small'), locale, mode)}
            labelColor={chrome.text}
            textColor={chrome.secondary}
            fontSize={S.yijiFont}
            lines={S.avoidLines}
          />
        </View>
      )}
    </View>
  )
}

function MediumWidget({ model, phaseOverride, chrome, locale }: SubProps) {
  const M = WIDGET_SPEC.family.medium
  const L = compactChrome(locale)
  const { mode } = useYijiDisplayMode()
  const yiN = verbBudget(locale, 'medium')
  const term = termLabel(model, locale)
  const calendar = formatWidgetCalendarRow(model.date, model.lunarMonthDay, locale)
  return (
    <View style={{ flex: 1, padding: M.padding }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PhaseLogo phase={phaseOf(model, phaseOverride)} size={M.moonSize} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
            <Text
              style={{
                color: chrome.text,
                fontSize: M.ganZhiFont,
                fontWeight: '300',
                letterSpacing: 2,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={M.ganZhiMinScale}
            >
              {model.ganZhi}
            </Text>
            {locale === 'en' && model.ganZhiPinyin ? (
              <Text style={{ color: chrome.tertiary, fontSize: M.pinyinFont }} numberOfLines={1}>
                {model.ganZhiPinyin}
              </Text>
            ) : null}
          </View>
          <Text
            style={{ color: chrome.secondary, fontSize: M.calendarFont, fontWeight: '500' }}
            numberOfLines={1}
          >
            {calendar}
          </Text>
        </View>
        {term ? (
          <Text
            style={{
              color: chrome.tertiary,
              fontSize: M.termFont,
              maxWidth: M.termMaxWidth,
              textAlign: 'right',
            }}
            numberOfLines={M.termMaxLines}
          >
            {term}
          </Text>
        ) : null}
      </View>

      <View
        style={{ height: 0.5, backgroundColor: chrome.separator, marginVertical: M.hairlineMargin }}
      />

      <View style={{ flexDirection: 'row', gap: M.columnGap }}>
        <View style={{ flex: 1 }}>
          <YiJiLabeled
            label={L.yi}
            verbs={compactVerbs(model.goodForRaw, yiN, locale, mode)}
            labelColor={chrome.text}
            textColor={chrome.text}
            fontSize={M.yijiFont}
            lines={M.goodLines}
          />
        </View>
        <View style={{ flex: 1 }}>
          <YiJiLabeled
            label={L.ji}
            verbs={compactVerbs(model.avoidRaw, yiN, locale, mode)}
            labelColor={chrome.text}
            textColor={chrome.secondary}
            fontSize={M.yijiFont}
            lines={M.avoidLines}
          />
        </View>
      </View>
    </View>
  )
}

/**
 * Android medium replica — mirrors Glance `MediumLayout` in the standard 4×2
 * cell: moon + 干支 header, hairline, optional For you line, then 宜/忌 as two
 * side-by-side columns (maxLines=2, so verbs wrap on narrow cells). Differs
 * from the iPhone medium only by the For you line above the 宜/忌 row.
 */
function AndroidMediumWidget({ model, phaseOverride, chrome, locale }: SubProps) {
  const M = WIDGET_SPEC.family.medium
  const L = compactChrome(locale)
  const { mode } = useYijiDisplayMode()
  const term = termLabel(model, locale)
  const calendar = formatWidgetCalendarRow(model.date, model.lunarMonthDay, locale)
  const hasFit = Boolean(model.fitLabel || model.fitSummary)
  return (
    <View style={{ flex: 1, padding: M.padding }}>
      {/* Header — mirrors Glance MediumLayout: moon + 干支 + calendar row + term. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PhaseLogo phase={phaseOf(model, phaseOverride)} size={M.moonSize} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
            <Text
              style={{
                color: chrome.text,
                fontSize: M.ganZhiFont,
                fontWeight: '400',
                letterSpacing: 2,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={M.ganZhiMinScale}
            >
              {model.ganZhi}
            </Text>
            {locale === 'en' && model.ganZhiPinyin ? (
              <Text style={{ color: chrome.tertiary, fontSize: M.pinyinFont }} numberOfLines={1}>
                {model.ganZhiPinyin}
              </Text>
            ) : null}
          </View>
          <Text
            style={{ color: chrome.secondary, fontSize: M.calendarFont, fontWeight: '500' }}
            numberOfLines={1}
          >
            {calendar}
          </Text>
        </View>
        {term ? (
          <Text
            style={{
              color: chrome.tertiary,
              fontSize: M.termFont,
              maxWidth: M.termMaxWidth,
              textAlign: 'right',
            }}
            numberOfLines={M.termMaxLines}
          >
            {term}
          </Text>
        ) : null}
      </View>

      <View
        style={{ height: 0.5, backgroundColor: chrome.separator, marginVertical: M.hairlineMargin }}
      />

      {/* For you line when birth fit is present (Glance MediumLayout). */}
      {hasFit ? (
        <>
          <Text
            style={{ color: chrome.text, fontSize: M.forYouFont, fontWeight: '700' }}
            numberOfLines={1}
          >
            {locale === 'en' ? L.forYou : `${L.forYou} · ${model.fitLabel}`}
          </Text>
          <View style={{ height: 8 }} />
        </>
      ) : null}

      {/* 宜/忌 side-by-side columns — each wraps up to 2 lines (matches Glance
          maxLines=2; on narrow cells like HyperOS the verbs wrap to a new line). */}
      <View style={{ flexDirection: 'row', gap: M.columnGap }}>
        <View style={{ flex: 1 }}>
          <YiJiLabeled
            label={L.yi}
            verbs={compactVerbs(model.goodForRaw, verbBudget(locale, 'medium'), locale, mode)}
            labelColor={chrome.text}
            textColor={chrome.text}
            fontSize={M.yijiFont}
            lines={M.goodLines}
          />
        </View>
        <View style={{ flex: 1 }}>
          <YiJiLabeled
            label={L.ji}
            verbs={compactVerbs(model.avoidRaw, verbBudget(locale, 'medium'), locale, mode)}
            labelColor={chrome.text}
            textColor={chrome.secondary}
            fontSize={M.yijiFont}
            lines={M.avoidLines}
          />
        </View>
      </View>
    </View>
  )
}

function LargeWidget({ model, phaseOverride, chrome, locale, strings }: SubProps) {
  const Lg = WIDGET_SPEC.family.large
  const L = compactChrome(locale)
  const { mode } = useYijiDisplayMode()
  const yiN = verbBudget(locale, 'large')
  const en = locale === 'en'
  const term = termLabel(model, locale)
  const calendar = formatWidgetCalendarRow(model.date, model.lunarMonthDay, locale)
  const phase = phaseOf(model, phaseOverride)
  const detailParts = [
    term || null,
    !en && model.officer ? `${model.officer}日` : null,
    !en && model.mansion ? model.mansion : null,
  ].filter(Boolean)
  return (
    <View style={{ flex: 1, padding: Lg.padding, gap: 8 }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <View style={{ gap: 4, flex: 1, minWidth: 0, paddingRight: 8, paddingTop: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
            <Text
              style={{
                color: chrome.text,
                fontSize: Lg.ganZhiFont,
                fontWeight: '300',
                letterSpacing: 2,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={Lg.ganZhiMinScale}
            >
              {model.ganZhi}
            </Text>
            {en && model.ganZhiPinyin ? (
              <Text style={{ color: chrome.secondary, fontSize: Lg.pinyinFont }} numberOfLines={1}>
                {model.ganZhiPinyin}
              </Text>
            ) : null}
          </View>
          <Text
            style={{ color: chrome.secondary, fontSize: Lg.calendarFont, fontWeight: '500' }}
            numberOfLines={1}
          >
            {calendar}
          </Text>
          {detailParts.length > 0 ? (
            <Text style={{ color: chrome.tertiary, fontSize: Lg.metaFont }} numberOfLines={1}>
              {detailParts.join(' · ')}
              {!en && model.clashShengxiao ? ` · 冲${model.clashShengxiao}` : ''}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <PhaseLogo phase={phase} size={Lg.moonSize} />
          <Text style={{ color: chrome.tertiary, fontSize: Lg.moonCaptionFont }} numberOfLines={1}>
            {moonPhaseCaption(phase, strings)}
          </Text>
        </View>
      </View>

      <View style={{ height: 0.5, backgroundColor: chrome.separator, marginTop: 6 }} />

      <View style={{ gap: 9 }}>
        <YiJiLabeled
          label={L.yi}
          verbs={compactVerbs(model.goodForRaw, yiN, locale, mode)}
          labelColor={chrome.text}
          textColor={chrome.text}
          fontSize={Lg.yijiFont}
          lines={Lg.goodLines}
        />
        <YiJiLabeled
          label={L.ji}
          verbs={compactVerbs(model.avoidRaw, yiN, locale, mode)}
          labelColor={chrome.text}
          textColor={chrome.secondary}
          fontSize={Lg.yijiFont}
          lines={Lg.avoidLines}
        />
      </View>

      <View style={{ height: 0.5, backgroundColor: chrome.separator }} />

      {model.fitLabel || model.fitSummary ? (
        <View style={{ gap: 4 }}>
          <Text
            style={{ color: chrome.text, fontSize: Lg.forYouFont, fontWeight: '700' }}
            numberOfLines={1}
          >
            {en ? L.forYou : `${L.forYou} · ${model.fitLabel}`}
          </Text>
          {model.fitSummary ? (
            <Text
              style={{ color: chrome.secondary, fontSize: Lg.forYouSummaryFont, lineHeight: 17 }}
              numberOfLines={Lg.forYouSummaryLines}
            >
              {model.fitSummary}
            </Text>
          ) : null}
        </View>
      ) : null}

      {model.dayTip ? (
        <View style={{ gap: 4, marginTop: model.fitLabel || model.fitSummary ? 6 : 0 }}>
          {!en ? (
            <Text
              style={{
                color: chrome.tertiary,
                fontSize: Lg.tipLabelFont,
                letterSpacing: 1,
                fontWeight: '700',
              }}
              numberOfLines={1}
            >
              {L.tip}
            </Text>
          ) : null}
          <Text
            style={{
              color: model.fitLabel ? chrome.secondary : chrome.text,
              fontSize: Lg.tipFont,
              lineHeight: 17,
            }}
            numberOfLines={Lg.tipLines}
          >
            {model.dayTip}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

/** 黄历模式大组件预览 — 数值直接取 widget-spec.json 的
 *  `family.large.almanac.*`（与原生 Swift/Glance 同一 SSOT），排版同构：
 *  顶行公历+星期 → 竖排行话/大日期+纳音/农历岁次（en 横排）→ 冲煞彭祖 →
 *  赭金/墨棕全宽宜忌 → 于你 → 落款。padding：水平 14、垂直 8（同原生）。 */
function AlmanacLargePreview({
  day,
  model,
  locale,
}: {
  day: AuspiceDay
  model: DailyCardModel
  locale: Locale
}) {
  const { mode } = useTheme()
  const P = almanacPalette(mode === 'dark')
  const C = almanacCopy(locale)
  const L = compactChrome(locale)
  const A = WIDGET_SPEC.family.large.almanac
  const register = resolveRegisterSync(locale, true)
  const d = new Date(`${model.date}T00:00:00`)
  const yiN = 6
  const fit = model.fitLabel
  const fitSummary = model.fitSummary
  const clashText =
    day.clash && day.evilDirection ? C.clashText(day.clash.clashAnimal, day.evilDirection) : ''
  const pengzuText = day.pengZu ? C.pengzuText(day.pengZu.stem, day.pengZu.branch) : ''
  const colophon =
    locale === 'en'
      ? 'Almanac · cultural reference'
      : locale === 'ja'
        ? '黄暦 · 文化参考'
        : '黄历 · 文化参考'
  return (
    <View style={{ flex: 1, paddingHorizontal: A.padding, paddingVertical: A.vPadding }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text style={{ color: P.ink, fontSize: A.metaFont }} numberOfLines={1}>
          {C.gregorianShort(d)}
        </Text>
        <Text style={{ color: P.dim, fontSize: A.metaFont, letterSpacing: 1 }} numberOfLines={1}>
          {C.weekdayChip(d)}
        </Text>
      </View>

      {C.vertical ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <MiniV text={`${day.ganZhi}${C.ganZhiSuffix}`} size={A.stripFont} P={P} />
            <MiniV text={`${day.dayOfficer}${C.officerDaySuffix}`} size={A.stripFont} P={P} />
            <MiniV
              text={day.dayGod?.name ? `${C.dayGodPrefix}${day.dayGod.name}` : ''}
              size={A.stripFont}
              P={P}
            />
            <MiniV
              text={
                day.mansion
                  ? `${C.stripMansion}${day.mansion.name}${day.mansion.luminary}${day.mansion.animal}宿`
                  : ''
              }
              size={A.stripFont}
              P={P}
            />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                color: P.ink,
                fontSize: A.dayFont,
                lineHeight: A.dayFont + 10,
                fontWeight: '700',
              }}
            >
              {d.getDate()}
            </Text>
            <Text style={{ color: P.gold, fontSize: A.metaFont }} numberOfLines={1}>
              {C.nayinLine(nayinOf(day.ganZhi))}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <MiniV
              text={day.lunarDate ? C.lunarLine(day.lunarDate) : ''}
              size={A.stripFont}
              P={P}
            />
            <MiniV text={model.ganzhiYear ?? ''} size={A.stripFont} P={P} />
          </View>
        </View>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Text
            style={{
              color: P.ink,
              fontSize: A.dayFont,
              lineHeight: A.dayFont + 10,
              fontWeight: '700',
            }}
          >
            {d.getDate()}
          </Text>
          <Text style={{ color: P.dim, fontSize: A.metaFont, marginTop: 2 }} numberOfLines={1}>
            {day.ganZhi} · {day.lunarDate ? C.lunarLine(day.lunarDate) : ''}
          </Text>
          <Text style={{ color: P.gold, fontSize: A.metaFont, marginTop: 1 }} numberOfLines={1}>
            {C.nayinLine(nayinOf(day.ganZhi))}
          </Text>
        </View>
      )}

      <Text
        style={{ color: P.dim, fontSize: A.metaFont, textAlign: 'center', marginTop: 6 }}
        numberOfLines={1}
      >
        {[clashText, pengzuText].filter(Boolean).join(' · ')}
      </Text>

      <View style={{ height: 0.5, backgroundColor: P.ink, marginVertical: 8 }} />

      <Text
        style={{ color: P.ink, fontSize: A.yijiFont, lineHeight: A.yijiFont + 6 }}
        numberOfLines={2}
      >
        {L.yi} {compactVerbs(model.goodForRaw, yiN, locale, register)}
      </Text>
      <Text
        style={{ color: P.dim, fontSize: A.yijiFont, lineHeight: A.yijiFont + 6, marginTop: 2 }}
        numberOfLines={2}
      >
        {L.ji} {compactVerbs(model.avoidRaw, yiN, locale, register)}
      </Text>

      {fit || fitSummary ? (
        <View>
          <View style={{ height: 0.5, backgroundColor: P.ink, marginVertical: 8 }} />
          <Text style={{ color: P.dim, fontSize: A.metaFont, lineHeight: 16 }} numberOfLines={2}>
            {fit ? `${L.forYou} · ${fit}` : ''}
            {fitSummary ? `${fit ? ' ' : ''}${fitSummary}` : ''}
          </Text>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />
      <Text style={{ color: P.dim, fontSize: 9, letterSpacing: 1, textAlign: 'center' }}>
        {colophon}
      </Text>
    </View>
  )
}

function MiniV({
  text,
  size,
  P,
}: {
  text: string
  size: number
  P: ReturnType<typeof almanacPalette>
}) {
  return (
    <View>
      {text.split('').map((c, i) => (
        <Text key={`${c}-${i}`} style={{ color: P.ink, fontSize: size, lineHeight: size + 4 }}>
          {c}
        </Text>
      ))}
    </View>
  )
}
