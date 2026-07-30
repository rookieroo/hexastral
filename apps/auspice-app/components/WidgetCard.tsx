/**
 * WidgetCard — RN preview of home-screen widget layouts.
 * Zinc type on 宣纸 (light) / 星空 (dark) surfaces — mirrors native WidgetKit.
 */

import { useTheme } from '@zhop/core-ui'
import { useMemo } from 'react'
import { Text, View } from 'react-native'
import type { AuspiceDay, AuspicePersonalization } from '@/lib/api'
import { getStrings, type Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import {
  buildDailyCardModel,
  compactChrome,
  compactVerbs,
  type DailyCardModel,
  formatWatchDate,
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
  const body =
    size === 'medium' ? (
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

/** Wiktionary-style en headword: toned Hanyu Pinyin first, Han form retained. */
function ganzhiHeadword(model: DailyCardModel, locale: Locale): string {
  if (locale !== 'en' || !model.ganZhiPinyin) return model.ganZhi
  return `${model.ganZhiPinyin} (${model.ganZhi})`
}

function SmallWidget({ model, phaseOverride, chrome, locale }: SubProps) {
  const L = compactChrome(locale)
  const yiN = verbBudget(locale, 'small')
  const year = locale === 'en' ? null : model.ganzhiYear
  return (
    <View style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <PhaseLogo phase={phaseOf(model, phaseOverride)} size={34} />
        <View style={{ flex: 1, alignItems: 'flex-end', gap: 2, minWidth: 0 }}>
          <Text
            style={{ color: chrome.text, fontSize: 13, fontWeight: '500' }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {model.lunarMonthDay || '—'}
          </Text>
          {year ? (
            <Text style={{ color: chrome.secondary, fontSize: 11 }} numberOfLines={1}>
              {year}
            </Text>
          ) : model.solarTermName ? (
            <Text style={{ color: chrome.secondary, fontSize: 11 }} numberOfLines={1}>
              {model.solarTermName}
            </Text>
          ) : null}
        </View>
      </View>
      <Text
        style={{
          color: chrome.text,
          fontSize: locale === 'en' ? 22 : 28,
          fontWeight: '300',
          letterSpacing: locale === 'en' ? 0 : 2,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {ganzhiHeadword(model, locale)}
      </Text>
      <View style={{ gap: 3 }}>
        <Text
          style={{ color: chrome.text, fontSize: 13 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {`${L.yi} ${compactVerbs(model.goodForRaw, yiN, locale)}`}
        </Text>
        <Text
          style={{ color: chrome.secondary, fontSize: 13 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {`${L.ji} ${compactVerbs(model.avoidRaw, yiN, locale)}`}
        </Text>
      </View>
    </View>
  )
}

function MediumWidget({ model, phaseOverride, chrome, locale }: SubProps) {
  const L = compactChrome(locale)
  const yiN = verbBudget(locale, 'medium')
  const meta =
    locale === 'en'
      ? model.lunarMonthDay
      : `${model.lunarMonthDay}${model.ganzhiYear ? ` · ${model.ganzhiYear}` : ''}`
  // 对你而言 verdict + sentence read on one full-width footer — the 宜忌 column
  // is too narrow to wrap a sentence.
  const sentence = model.fitSummary || model.dayTip
  return (
    <View style={{ flex: 1, padding: 16, gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 98, alignItems: 'center', gap: 4 }}>
          <PhaseLogo phase={phaseOf(model, phaseOverride)} size={42} />
          <Text
            style={{ color: chrome.text, fontSize: locale === 'en' ? 16 : 20, fontWeight: '300' }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {ganzhiHeadword(model, locale)}
          </Text>
          <Text
            style={{ color: chrome.secondary, fontSize: 11, textAlign: 'center' }}
            numberOfLines={1}
          >
            {meta}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4, minWidth: 0, paddingRight: 2 }}>
          {model.solarTermName ? (
            <Text style={{ color: chrome.tertiary, fontSize: 11 }} numberOfLines={1}>
              {model.solarTermName}
            </Text>
          ) : null}
          <Text style={{ color: chrome.text, fontSize: 14 }} numberOfLines={2}>
            {`${L.yi} ${compactVerbs(model.goodForRaw, yiN, locale)}`}
          </Text>
          <Text style={{ color: chrome.secondary, fontSize: 14 }} numberOfLines={2}>
            {`${L.ji} ${compactVerbs(model.avoidRaw, yiN, locale)}`}
          </Text>
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 2 }}>
        {model.fitLabel && locale !== 'en' ? (
          <Text
            style={{ color: chrome.text, fontSize: 12, fontWeight: '600', lineHeight: 17 }}
            numberOfLines={1}
          >
            {`${L.forYou} · ${model.fitLabel}`}
          </Text>
        ) : null}
        {sentence ? (
          <Text style={{ color: chrome.secondary, fontSize: 12, lineHeight: 17 }} numberOfLines={2}>
            {locale === 'en' && model.fitSummary ? `${L.forYou} · ${sentence}` : sentence}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function LargeWidget({ model, phaseOverride, chrome, locale, strings }: SubProps) {
  const L = compactChrome(locale)
  const yiN = verbBudget(locale, 'large')
  const en = locale === 'en'
  const meta = en
    ? model.lunarMonthDay
    : `${model.lunarMonthDay}${model.ganzhiYear ? ` · ${model.ganzhiYear}` : ''}`
  const phase = phaseOf(model, phaseOverride)
  return (
    <View style={{ flex: 1, padding: 18, gap: 8 }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <View style={{ gap: 3, flex: 1, minWidth: 0, paddingRight: 8 }}>
          <Text style={{ color: chrome.text, fontSize: 15, fontWeight: '500' }} numberOfLines={1}>
            {meta}
          </Text>
          {model.solarTermName ? (
            <Text style={{ color: chrome.secondary, fontSize: 13 }} numberOfLines={1}>
              {model.solarTermName}
            </Text>
          ) : null}
          <Text style={{ color: chrome.tertiary, fontSize: 12 }} numberOfLines={1}>
            {formatWatchDate(model.date, locale)}
          </Text>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <PhaseLogo phase={phase} size={52} />
          <Text style={{ color: chrome.tertiary, fontSize: 10 }} numberOfLines={1}>
            {moonPhaseCaption(phase, strings)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View>
          <Text style={{ color: chrome.text, fontSize: en ? 25 : 32, fontWeight: '300' }}>
            {en && model.ganZhiPinyin ? model.ganZhiPinyin : model.ganZhi}
          </Text>
          {en && model.ganZhiPinyin ? (
            <Text
              style={{ color: chrome.secondary, fontSize: 11, letterSpacing: 0.5 }}
              numberOfLines={1}
            >
              {`(${model.ganZhi})`}
            </Text>
          ) : null}
        </View>
        {!en && model.officer ? (
          <Text style={{ color: chrome.secondary, fontSize: 13, paddingBottom: 4 }}>
            {`${model.officer}日`}
          </Text>
        ) : null}
      </View>
      {!en && model.mansion ? (
        <Text style={{ color: chrome.secondary, fontSize: 12 }} numberOfLines={1}>
          {`${model.mansion} · 冲${model.clashShengxiao}`}
        </Text>
      ) : null}

      {/* Breathing room lives here, so 宜忌 + 对你而言 stay anchored to the bottom
          edge instead of leaving a hole under the last line (en has no 值神/宿). */}
      <View style={{ flex: 1, minHeight: 4 }} />

      <View style={{ height: 0.5, backgroundColor: chrome.separator }} />

      <Text style={{ color: chrome.text, fontSize: 15, lineHeight: 22 }} numberOfLines={2}>
        {`${L.yi} ${compactVerbs(model.goodForRaw, yiN, locale)}`}
      </Text>
      <Text style={{ color: chrome.secondary, fontSize: 15, lineHeight: 22 }} numberOfLines={2}>
        {`${L.ji} ${compactVerbs(model.avoidRaw, yiN, locale)}`}
      </Text>

      <View style={{ height: 0.5, backgroundColor: chrome.separator, marginTop: 2 }} />

      {model.fitLabel || model.fitSummary ? (
        <View style={{ gap: 4 }}>
          <Text style={{ color: chrome.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            {en ? L.forYou : `${L.forYou} · ${model.fitLabel}`}
          </Text>
          {model.fitSummary ? (
            <Text
              style={{ color: chrome.secondary, fontSize: 13, lineHeight: 19 }}
              numberOfLines={3}
            >
              {model.fitSummary}
            </Text>
          ) : null}
        </View>
      ) : null}

      {model.dayTip ? (
        <View style={{ gap: 4 }}>
          {!en ? (
            <Text
              style={{ color: chrome.tertiary, fontSize: 11, letterSpacing: 1 }}
              numberOfLines={1}
            >
              {L.tip}
            </Text>
          ) : null}
          <Text style={{ color: chrome.secondary, fontSize: 13, lineHeight: 19 }} numberOfLines={3}>
            {model.dayTip}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
