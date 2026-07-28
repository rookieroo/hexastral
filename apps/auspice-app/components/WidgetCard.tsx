/**
 * WidgetCard — RN preview of home-screen widget layouts.
 * Zinc type on 宣纸 (light) / 星空 (dark) surfaces — mirrors native WidgetKit.
 */

import { useTheme } from '@zhop/core-ui'
import { useMemo } from 'react'
import { Text, View } from 'react-native'
import type { AuspiceDay, AuspicePersonalization } from '@/lib/api'
import { useStrings } from '@/lib/i18n-context'
import type { MoonSkinId } from '@/lib/widget-config'
import { buildDailyCardModel, type DailyCardModel, formatWatchDate, topVerbs } from './DailyCard'
import { StaticMoon } from './StaticMoon'
import { WidgetSurface, type WidgetSurfaceMode } from './WidgetSurface'

export type WidgetSize = 'small' | 'medium' | 'large'

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
  moonSkinId?: MoonSkinId
  phaseOverride?: number
  chrome: Chrome
  mode: WidgetSurfaceMode
}

export function WidgetCard({
  date,
  day,
  personalization,
  size,
  moonSkinId,
  phaseOverride,
  width,
  height,
}: {
  date: string
  day: AuspiceDay
  personalization?: AuspicePersonalization | null
  size: WidgetSize
  moonSkinId?: MoonSkinId
  phaseOverride?: number
  /** Required for textured surface sizing. */
  width: number
  height: number
}) {
  const { t, locale } = useStrings()
  const { mode } = useTheme()
  const surfaceMode: WidgetSurfaceMode = mode === 'light' ? 'light' : 'dark'
  const chrome = chromeFor(surfaceMode)
  const model = useMemo(
    () => buildDailyCardModel(date, day, personalization, t, locale),
    [date, day, personalization, t, locale]
  )
  const body =
    size === 'medium' ? (
      <MediumWidget
        model={model}
        moonSkinId={moonSkinId}
        phaseOverride={phaseOverride}
        chrome={chrome}
        mode={surfaceMode}
      />
    ) : size === 'large' ? (
      <LargeWidget
        model={model}
        moonSkinId={moonSkinId}
        phaseOverride={phaseOverride}
        chrome={chrome}
        mode={surfaceMode}
      />
    ) : (
      <SmallWidget
        model={model}
        moonSkinId={moonSkinId}
        phaseOverride={phaseOverride}
        chrome={chrome}
        mode={surfaceMode}
      />
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

function SmallWidget({ model, moonSkinId, phaseOverride, chrome }: SubProps) {
  const { t, locale } = useStrings()
  return (
    <View style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <StaticMoon phase={phaseOf(model, phaseOverride)} size={34} skinId={moonSkinId} />
        <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
          <Text style={{ color: chrome.text, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
            {model.lunarMonthDay || t.lunarLabel}
          </Text>
          {model.ganzhiYear ? (
            <Text style={{ color: chrome.secondary, fontSize: 12 }} numberOfLines={1}>
              {model.ganzhiYear}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={{ color: chrome.text, fontSize: 28, fontWeight: '300', letterSpacing: 2 }}>
        {model.ganZhi}
      </Text>
      <View style={{ gap: 3 }}>
        <Text
          style={{ color: chrome.text, fontSize: 13 }}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {`${t.suitable} ${topVerbs(model.goodForRaw, locale, 4)}`}
        </Text>
        <Text
          style={{ color: chrome.secondary, fontSize: 13 }}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {`${t.avoid} ${topVerbs(model.avoidRaw, locale, 4)}`}
        </Text>
      </View>
    </View>
  )
}

function MediumWidget({ model, moonSkinId, phaseOverride, chrome }: SubProps) {
  const { t, locale } = useStrings()
  return (
    <View style={{ flex: 1, padding: 16, flexDirection: 'row', gap: 14 }}>
      <View style={{ width: 112, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <StaticMoon phase={phaseOf(model, phaseOverride)} size={52} skinId={moonSkinId} />
        <Text style={{ color: chrome.text, fontSize: 20, fontWeight: '300' }}>{model.ganZhi}</Text>
        <Text style={{ color: chrome.secondary, fontSize: 12, textAlign: 'center' }} numberOfLines={2}>
          {`${model.lunarMonthDay}${model.ganzhiYear ? ` · ${model.ganzhiYear}` : ''}`}
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
        {model.solarTermName ? (
          <Text style={{ color: chrome.tertiary, fontSize: 12 }} numberOfLines={1}>
            {model.solarTermName}
          </Text>
        ) : null}
        <Text style={{ color: chrome.text, fontSize: 15 }} numberOfLines={3}>
          {`${t.suitable} ${topVerbs(model.goodForRaw, locale, 4)}`}
        </Text>
        <Text style={{ color: chrome.secondary, fontSize: 15 }} numberOfLines={3}>
          {`${t.avoid} ${topVerbs(model.avoidRaw, locale, 4)}`}
        </Text>
        {model.fitLabel ? (
          <Text style={{ color: chrome.text, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
            {`${t.personal.forYou} · ${model.fitLabel}`}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function LargeWidget({ model, moonSkinId, phaseOverride, chrome }: SubProps) {
  const { t, locale } = useStrings()
  return (
    <View style={{ flex: 1, padding: 18, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: chrome.text, fontSize: 15, fontWeight: '500' }}>
            {`${model.lunarMonthDay}${model.ganzhiYear ? ` · ${model.ganzhiYear}` : ''}`}
          </Text>
          {model.solarTermName ? (
            <Text style={{ color: chrome.secondary, fontSize: 13 }}>{model.solarTermName}</Text>
          ) : null}
          <Text style={{ color: chrome.tertiary, fontSize: 12 }}>
            {formatWatchDate(model.date, locale)}
          </Text>
        </View>
        <StaticMoon phase={phaseOf(model, phaseOverride)} size={58} skinId={moonSkinId} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <Text style={{ color: chrome.text, fontSize: 34, fontWeight: '300' }}>{model.ganZhi}</Text>
        <Text style={{ color: chrome.secondary, fontSize: 14, paddingBottom: 5 }}>
          {`${model.officer}日`}
        </Text>
      </View>
      <Text style={{ color: chrome.secondary, fontSize: 13 }} numberOfLines={1}>
        {`${model.mansion} · 冲${model.clashShengxiao}`}
      </Text>

      <View style={{ height: 0.5, backgroundColor: chrome.separator }} />

      <Text style={{ color: chrome.text, fontSize: 16, lineHeight: 24 }} numberOfLines={3}>
        {`${t.suitable} ${topVerbs(model.goodForRaw, locale, 4)}`}
      </Text>
      <Text style={{ color: chrome.secondary, fontSize: 16, lineHeight: 24 }} numberOfLines={3}>
        {`${t.avoid} ${topVerbs(model.avoidRaw, locale, 4)}`}
      </Text>

      {model.fitLabel ? (
        <Text style={{ color: chrome.text, fontSize: 14, fontWeight: '500' }} numberOfLines={1}>
          {`${t.personal.forYou} · ${model.fitLabel}`}
        </Text>
      ) : null}
    </View>
  )
}
