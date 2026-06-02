/**
 * WidgetCard — iOS home-screen widget layouts (small / medium / large), fed by
 * the same `buildDailyCardModel`. Unlike the watch face these show the DAY's 黄历
 * (NO live clock — home widgets refresh periodically, they are not clocks):
 * 公历/农历 date + 干支日 (五行 element colour) + 月相 + 宜忌, with more 黄历 detail at
 * larger sizes (值神/二十八宿/冲 + 对你而言). The RN reference spec for the native
 * WidgetKit target (each size gets its own layout — square / landscape / tall).
 */

import { useMemo } from 'react'
import { Text, View } from 'react-native'
import type { CycleDay, CyclePersonalization } from '@/lib/api'
import { useStrings } from '@/lib/i18n-context'
import type { MoonSkinId } from '@/lib/widget-config'
import { buildDailyCardModel, type DailyCardModel, formatWatchDate, topVerbs } from './DailyCard'
import { StaticMoon } from './StaticMoon'

export type WidgetSize = 'small' | 'medium' | 'large'

const BG = '#0E0D0C'
const CREAM = 'rgba(231,224,208,0.92)'
const DIM = 'rgba(231,224,208,0.5)'
const FAINT = 'rgba(231,224,208,0.35)'
const COPPER = 'rgba(196,168,130,0.85)'

function fitColor(fit: DailyCardModel['fit']): string {
  return fit === '吉' ? '#34C759' : fit === '凶' ? '#FF453A' : DIM
}

type SubProps = { model: DailyCardModel; moonSkinId?: MoonSkinId }

export function WidgetCard({
  date,
  day,
  personalization,
  size,
  moonSkinId,
}: {
  date: string
  day: CycleDay
  personalization?: CyclePersonalization | null
  size: WidgetSize
  moonSkinId?: MoonSkinId
}) {
  const { t, locale } = useStrings()
  const model = useMemo(
    () => buildDailyCardModel(date, day, personalization, t, locale),
    [date, day, personalization, t, locale]
  )
  if (size === 'medium') return <MediumWidget model={model} moonSkinId={moonSkinId} />
  if (size === 'large') return <LargeWidget model={model} moonSkinId={moonSkinId} />
  return <SmallWidget model={model} moonSkinId={moonSkinId} />
}

// ── small (≈158×158, square) — 月相 + 干支 + 农历 + 一宜一忌 ───────────────────

function SmallWidget({ model, moonSkinId }: SubProps) {
  const { t, locale } = useStrings()
  return (
    <View style={{ flex: 1, backgroundColor: BG, padding: 14, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <StaticMoon phase={model.moonPhase} size={32} skinId={moonSkinId} />
        <Text style={{ color: DIM, fontSize: 11, letterSpacing: 1 }} numberOfLines={1}>
          {model.lunarMonthDay}
        </Text>
      </View>
      <View>
        <Text
          style={{
            color: model.dayElementColor,
            fontSize: 30,
            fontWeight: '300',
            letterSpacing: 3,
          }}
        >
          {model.ganZhi}
        </Text>
        <Text style={{ color: FAINT, fontSize: 11 }} numberOfLines={1}>
          {formatWatchDate(model.date, locale)}
        </Text>
      </View>
      <View>
        <Text style={{ color: CREAM, fontSize: 11 }} numberOfLines={1}>
          {`${t.suitable} ${topVerbs(model.goodForRaw, locale, 1)}`}
        </Text>
        <Text style={{ color: DIM, fontSize: 11 }} numberOfLines={1}>
          {`${t.avoid} ${topVerbs(model.avoidRaw, locale, 1)}`}
        </Text>
      </View>
    </View>
  )
}

// ── medium (≈338×158, landscape) — moon block | 宜忌 + meta ───────────────────

function MediumWidget({ model, moonSkinId }: SubProps) {
  const { t, locale } = useStrings()
  return (
    <View style={{ flex: 1, backgroundColor: BG, padding: 16, flexDirection: 'row', gap: 16 }}>
      <View style={{ width: 116, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <StaticMoon phase={model.moonPhase} size={48} skinId={moonSkinId} />
        <Text
          style={{
            color: model.dayElementColor,
            fontSize: 22,
            fontWeight: '400',
            letterSpacing: 2,
          }}
        >
          {model.ganZhi}
        </Text>
        <Text style={{ color: DIM, fontSize: 11 }} numberOfLines={1}>
          {model.lunarMonthDay}
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 5 }}>
        <Text style={{ color: COPPER, fontSize: 11, letterSpacing: 1 }} numberOfLines={1}>
          {`${formatWatchDate(model.date, locale)} · ${model.solarTermName}`}
        </Text>
        <Text style={{ color: CREAM, fontSize: 13 }} numberOfLines={1}>
          {`${t.suitable} ${topVerbs(model.goodForRaw, locale, 3)}`}
        </Text>
        <Text style={{ color: DIM, fontSize: 13 }} numberOfLines={1}>
          {`${t.avoid} ${topVerbs(model.avoidRaw, locale, 3)}`}
        </Text>
        {model.fitLabel ? (
          <Text
            style={{ color: fitColor(model.fit), fontSize: 12, fontWeight: '600' }}
            numberOfLines={1}
          >
            {`${t.personal.forYou} ${model.fitLabel}`}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

// ── large (≈338×354, tall) — full 黄历 page ──────────────────────────────────

function LargeWidget({ model, moonSkinId }: SubProps) {
  const { t, locale } = useStrings()
  return (
    <View style={{ flex: 1, backgroundColor: BG, padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: CREAM, fontSize: 15 }}>{formatWatchDate(model.date, locale)}</Text>
          <Text style={{ color: COPPER, fontSize: 12, letterSpacing: 1 }}>
            {`${model.lunarMonthDay}${model.ganzhiYear ? ` · ${model.ganzhiYear}` : ''}`}
          </Text>
        </View>
        <StaticMoon phase={model.moonPhase} size={56} skinId={moonSkinId} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <Text
          style={{
            color: model.dayElementColor,
            fontSize: 38,
            fontWeight: '300',
            letterSpacing: 3,
          }}
        >
          {model.ganZhi}
        </Text>
        <Text style={{ color: CREAM, fontSize: 14, paddingBottom: 6 }}>{`${model.officer}日`}</Text>
        <Text style={{ color: DIM, fontSize: 13, paddingBottom: 6 }}>{model.solarTermName}</Text>
      </View>
      <Text style={{ color: COPPER, fontSize: 12, letterSpacing: 0.5 }} numberOfLines={1}>
        {`${model.mansion} · 冲${model.clashShengxiao}`}
      </Text>

      <View style={{ height: 0.5, backgroundColor: 'rgba(196,168,130,0.2)' }} />

      <Text style={{ color: CREAM, fontSize: 14, lineHeight: 22 }} numberOfLines={2}>
        <Text style={{ color: '#7FB069', fontWeight: '700' }}>{`${t.suitable} `}</Text>
        {topVerbs(model.goodForRaw, locale, 4)}
      </Text>
      <Text style={{ color: DIM, fontSize: 14, lineHeight: 22 }} numberOfLines={2}>
        <Text style={{ color: '#D98880', fontWeight: '700' }}>{`${t.avoid} `}</Text>
        {topVerbs(model.avoidRaw, locale, 4)}
      </Text>

      {model.fitLabel ? (
        <Text
          style={{ color: fitColor(model.fit), fontSize: 13, fontWeight: '600' }}
          numberOfLines={1}
        >
          {`${t.personal.forYou} ${model.fitLabel}`}
        </Text>
      ) : null}
    </View>
  )
}
