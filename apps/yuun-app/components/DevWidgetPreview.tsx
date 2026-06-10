/**
 * DEV-only — previews the watch/widget surfaces at real device dimensions, with
 * mock controls (template + moon-phase + mock 黄历 day) so any state can be tested
 * without waiting for a real day, plus the moon-skin config. `__DEV__` in Me.
 * Tap a watch face to reveal 宜忌 / 对你而言.
 */

import { useTheme } from '@zhop/core-ui'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { type AuspiceDayPayload, fetchAuspiceDay } from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import {
  DEFAULT_MOON_SKIN_ID,
  getMoonSkin,
  MOON_SKIN_OPTIONS,
  type MoonSkinId,
  setMoonSkin,
  type WatchTemplate,
} from '@/lib/widget-config'
import { DailyCard } from './DailyCard'
import { StaticMoon } from './StaticMoon'
import { WidgetCard } from './WidgetCard'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** A rich 黄历 day for testing the Pro faces / scenarios offline. 农历十五 → 满月; fit 吉. */
const MOCK_PAYLOAD: AuspiceDayPayload = {
  date: '2026-08-12',
  day: {
    ganZhi: '丙午',
    element: '火',
    dayOfficer: '建',
    mansion: {
      name: '角',
      luminary: '木',
      animal: '蛟',
      quadrant: '青龙',
      auspicious: true,
      index: 0,
    },
    goodFor: ['嫁娶', '动土', '安床', '出行'],
    avoid: ['开市', '安葬', '破土'],
    clash: { branch: '子', clashAnimal: '鼠' },
    evilDirection: '正北',
    auspiciousColor: '红',
    auspiciousDirection: '正南',
    dos: [],
    donts: [],
    overallRating: 4,
    yearGanZhi: { stem: '丙', branch: '午', animal: '马' },
    lunarDate: {
      year: 2026,
      month: 6,
      day: 15,
      isLeap: false,
      monthName: '六月',
      dayName: '十五',
      isFirst: false,
      isFifteenth: true,
    },
    festivalToday: null,
    solarTermToday: null,
    solarTerm: {
      prev: { name: '立秋', date: '2026-08-07', instant: '2026-08-07T09:00:00Z' },
      next: { name: '处暑', date: '2026-08-23', instant: '2026-08-23T00:00:00Z' },
    },
    hours: [],
  },
  personalization: {
    dayMaster: '甲',
    dayMasterElement: '木',
    relation: 'day_generates_self',
    fit: '吉',
    favorsToday: true,
    harmsToday: false,
    personalClash: false,
    reasons: ['favorable_element_present'],
    benming: false,
  },
  explanation: null,
}

/** Apple Watch Series 10 display sizes, in points (@2x). */
const WATCHES: ReadonlyArray<{ label: string; w: number; h: number; r: number }> = [
  { label: '42mm', w: 187, h: 223, r: 46 },
  { label: '46mm', w: 208, h: 248, r: 52 },
]

const TEMPLATES: ReadonlyArray<{ id: WatchTemplate; label: string }> = [
  { id: 'modern', label: 'Modern' },
  { id: 'lunar', label: '月相' },
  { id: 'almanac', label: '黄历 Pro' },
  { id: 'ancient', label: '古风 Pro' },
]

const PHASE_PRESETS: ReadonlyArray<{ label: string; v?: number }> = [
  { label: '今日' },
  { label: '新月', v: 0.001 },
  { label: '上弦', v: 0.25 },
  { label: '满月', v: 0.5 },
  { label: '下弦', v: 0.75 },
]

function DevLabel({ children }: { children: string }) {
  const { colors } = useTheme()
  return <Text style={{ color: colors.dim, fontSize: 10, letterSpacing: 2 }}>{children}</Text>
}

function WatchFrame({
  w,
  h,
  r,
  children,
}: {
  w: number
  h: number
  r: number
  children: React.ReactNode
}) {
  return (
    <View
      style={{ width: w, height: h, borderRadius: r, overflow: 'hidden', backgroundColor: '#000' }}
    >
      {children}
    </View>
  )
}

export function DevWidgetPreview() {
  const { colors, spacing } = useTheme()
  const [real, setReal] = useState<AuspiceDayPayload | null>(null)
  const [skinId, setSkinId] = useState<MoonSkinId>(DEFAULT_MOON_SKIN_ID)
  const [mockOn, setMockOn] = useState(false)
  const [phase, setPhase] = useState<number | undefined>(undefined)
  const [template, setTemplate] = useState<WatchTemplate>('almanac')

  useEffect(() => {
    const d = new Date()
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    getAuspiceBirthDate()
      .then((birthDate) => fetchAuspiceDay(iso, birthDate))
      .then(setReal)
      .catch(() => {})
    getMoonSkin()
      .then(setSkinId)
      .catch(() => {})
  }, [])

  const payload = mockOn ? MOCK_PAYLOAD : real
  if (!payload) return null
  const { date, day, personalization } = payload

  const chip = (active: boolean) => ({
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: active ? colors.accent : colors.separator,
    backgroundColor: active ? colors.accentGhost : 'transparent',
  })
  const chipText = (active: boolean) => ({
    color: active ? colors.accent : colors.text,
    fontSize: 12,
  })

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <DevLabel>Data</DevLabel>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[
            { label: 'Today', on: !mockOn },
            { label: 'Mock 黄历', on: mockOn },
          ].map((o) => (
            <Pressable
              key={o.label}
              onPress={() => setMockOn(o.label.startsWith('Mock'))}
              style={chip(o.on)}
            >
              <Text style={chipText(o.on)}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <DevLabel>Template</DevLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {TEMPLATES.map((tpl) => {
            const active = tpl.id === template
            return (
              <Pressable key={tpl.id} onPress={() => setTemplate(tpl.id)} style={chip(active)}>
                <Text style={chipText(active)}>{tpl.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <DevLabel>Moon phase (mock)</DevLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {PHASE_PRESETS.map((p) => {
            const active = phase === p.v
            return (
              <Pressable key={p.label} onPress={() => setPhase(p.v)} style={chip(active)}>
                <Text style={chipText(active)}>{p.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <DevLabel>Moon skin</DevLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {MOON_SKIN_OPTIONS.map((opt) => {
            const sel = opt.id === skinId
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  setSkinId(opt.id)
                  void setMoonSkin(opt.id)
                }}
                style={{
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.sm,
                  borderRadius: 12,
                  borderWidth: sel ? 1 : 0.5,
                  borderColor: sel ? colors.accent : colors.separator,
                  backgroundColor: '#000',
                }}
              >
                <StaticMoon phase={0.3} size={34} skinId={opt.id} />
                <Text style={{ color: sel ? colors.accent : colors.dim, fontSize: 11 }}>
                  {opt.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Selected template at both watch sizes + complication. */}
      <View style={{ gap: spacing.sm }}>
        <DevLabel>Watch face (tap to reveal)</DevLabel>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.lg,
            alignItems: 'flex-start',
          }}
        >
          {WATCHES.map((wch) => (
            <WatchFrame key={wch.label} w={wch.w} h={wch.h} r={wch.r}>
              <DailyCard
                tier='compact'
                template={template}
                moonSkinId={skinId}
                phaseOverride={phase}
                date={date}
                day={day}
                personalization={personalization}
              />
            </WatchFrame>
          ))}
          <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden' }}>
            <DailyCard
              tier='glance'
              moonSkinId={skinId}
              phaseOverride={phase}
              date={date}
              day={day}
              personalization={personalization}
            />
          </View>
        </View>
      </View>

      {/* Home-screen widgets — the day's 黄历 (no live clock). */}
      <View style={{ gap: spacing.sm }}>
        <DevLabel>Home widgets · small / medium / large</DevLabel>
        <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
          <View style={{ width: 150, height: 150, borderRadius: 22, overflow: 'hidden' }}>
            <WidgetCard
              size='small'
              moonSkinId={skinId}
              date={date}
              day={day}
              personalization={personalization}
            />
          </View>
          <View style={{ width: 320, height: 150, borderRadius: 22, overflow: 'hidden' }}>
            <WidgetCard
              size='medium'
              moonSkinId={skinId}
              date={date}
              day={day}
              personalization={personalization}
            />
          </View>
          <View style={{ width: 320, height: 335, borderRadius: 28, overflow: 'hidden' }}>
            <WidgetCard
              size='large'
              moonSkinId={skinId}
              date={date}
              day={day}
              personalization={personalization}
            />
          </View>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <DevLabel>Home card</DevLabel>
        <DailyCard tier='full' date={date} day={day} personalization={personalization} />
      </View>
    </View>
  )
}
