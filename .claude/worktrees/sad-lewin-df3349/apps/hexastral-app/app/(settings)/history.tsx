/**
 * 📖 History screen — Oracle + Fate segments
 *
 * Ink Brutalism / 水墨: underline segment control, date slabs (grouped bordered rows),
 * typographic date headers, meta + title stack on each entry.
 *
 * Readings: manifest chapters bucketed by generation batch (or per-minute fallback) into one row each.
 */

import { useQueryClient } from '@tanstack/react-query'
import type { DivinationRecord } from '@zhop/hexastral-client'
import { FORTUNE_LABELS } from '@zhop/hexastral-tokens/constants/fortune'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  List,
  Trash2,
} from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, SectionList, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TrigramIcon } from '@/components/divination/TrigramIcon'
import { HistoryRowLayout, historyRowGroupPosition } from '@/components/history/HistoryRowLayout'
import { YiChingRecordSkeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/lib/auth'
import {
  deleteDailySignalRecord,
  deleteDivinationRecord,
  deletePairHistoryRecord,
  HistoryDeleteBondLinkedError,
} from '@/lib/domain/historyDelete'
import { formatDate, formatTimeHm } from '@/lib/format'
import {
  type FateHistorySub,
  type HistoryEntryScope,
  type HistorySegment,
  type HistoryViewMode,
  loadHistoryPrefs,
  parseHistoryEntryScope,
  saveHistoryPrefs,
} from '@/lib/historyPrefs'
import { usePairHistoryQuery } from '@/lib/hooks/usePairHistoryQuery'
import type { ChapterSlug } from '@/lib/hooks/useReportManifestQuery'
import { useReportManifestQuery } from '@/lib/hooks/useReportManifestQuery'
import { type SignalHistoryItem, useSignalHistoryQuery } from '@/lib/hooks/useSignalHistoryQuery'
import type { SignalEnergyLevel } from '@/lib/hooks/useSignalQuery'
import { useYichingHistoryQuery } from '@/lib/hooks/useYichingHistoryQuery'
import type { TranslationKeys } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'
import { hapticSelection } from '@/lib/ux/haptics'

const SIGNAL_ENERGY_I18N: Record<SignalEnergyLevel, TranslationKeys> = {
  rising: 'signal_energy_rising',
  steady: 'signal_energy_steady',
  productive: 'signal_energy_productive',
  guarded: 'signal_energy_guarded',
  volatile: 'signal_energy_volatile',
}

type ReadingRow =
  | {
      kind: 'personal_fate'
      /** Stable id derived from generationBatchId or fallback minute bucket */
      id: string
      sortAt: string
      chapterCount: number
      maxVersions: number
    }
  | { kind: 'pair'; id: string; sortAt: string; label: string }

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function toLocalDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Dot size + opacity encode how many records fall on that local calendar day. */
function historyCalendarDotStyle(count: number): { size: number; opacity: number } {
  if (count <= 0) return { size: 0, opacity: 0 }
  if (count === 1) return { size: 3, opacity: 0.42 }
  if (count <= 3) return { size: 4, opacity: 0.68 }
  if (count <= 6) return { size: 5, opacity: 0.88 }
  return { size: 6, opacity: 1 }
}

// ── Date grouping helpers ────────────────────────────────────

interface Section<T> {
  title: string
  data: T[]
}

function groupByDate<T>(
  items: T[],
  getDate: (item: T) => Date,
  t: ReturnType<typeof useI18n>['t'],
  locale: string
): Section<T>[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const d = getDate(item)
    const key = d.toDateString()
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return Array.from(map.entries()).map(([key, data]) => {
    const date = new Date(key)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let title: string
    if (date.toDateString() === today.toDateString()) {
      title = t('history_date_today')
    } else if (date.toDateString() === yesterday.toDateString()) {
      title = t('history_date_yesterday')
    } else {
      title = formatDate(key, locale as never)
    }
    return { title, data }
  })
}

export default function HistoryScreen() {
  const ios = useIosPalette()

  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const { t, locale } = useI18n()
  const router = useRouter()
  const params = useLocalSearchParams<{ historyScope?: string }>()
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [entryScope, setEntryScope] = useState<HistoryEntryScope | null>(null)
  const [segment, setSegment] = useState<HistorySegment>('oracle')
  const [fateSub, setFateSub] = useState<FateHistorySub>('readings')
  const [historyViewMode, setHistoryViewMode] = useState<HistoryViewMode>('list')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)

  useEffect(() => {
    const p = loadHistoryPrefs()
    const scope = parseHistoryEntryScope(params.historyScope)

    if (scope === 'oracle') {
      setSegment('oracle')
      setEntryScope('oracle')
      saveHistoryPrefs({ segment: 'oracle', fateSub: p.fateSub, viewMode: p.viewMode })
    } else if (scope === 'daily') {
      setSegment('fate')
      setFateSub('daily')
      setHistoryViewMode('list')
      setEntryScope('daily')
      saveHistoryPrefs({ segment: 'fate', fateSub: 'daily', viewMode: 'list' })
    } else if (scope === 'readings') {
      setSegment('fate')
      setFateSub('readings')
      setEntryScope('readings')
      saveHistoryPrefs({ segment: 'fate', fateSub: 'readings', viewMode: p.viewMode })
    } else {
      setSegment(p.segment)
      setFateSub(p.fateSub)
      setHistoryViewMode(p.viewMode)
      setEntryScope(null)
    }
    setPrefsLoaded(true)
  }, [params.historyScope])

  useEffect(() => {
    if (!prefsLoaded) return
    saveHistoryPrefs({ segment, fateSub, viewMode: historyViewMode })
  }, [segment, fateSub, historyViewMode, prefsLoaded])

  const oracleQuery = useYichingHistoryQuery(userId)
  const oracleRecords = oracleQuery.data ?? []
  const fateQuery = useSignalHistoryQuery(userId, 30)
  const fateRecords = fateQuery.data?.items ?? []
  const manifestQuery = useReportManifestQuery(userId)
  const pairQuery = usePairHistoryQuery(userId)

  const showDeleteError = useCallback(() => {
    Alert.alert(t('alert_notice'), t('common_retry_later'))
  }, [t])

  const onDeleteOracle = useCallback(
    (item: DivinationRecord) => {
      Alert.alert(t('history_delete_title'), t('history_delete_oracle'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('bond_delete_action'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteDivinationRecord(item.id)
                await queryClient.invalidateQueries({ queryKey: ['yiching-history', userId] })
              } catch (err) {
                if (__DEV__) console.warn('[history] delete oracle', err)
                showDeleteError()
              }
            })()
          },
        },
      ])
    },
    [t, queryClient, userId, showDeleteError]
  )

  const onDeleteDailySignal = useCallback(
    (item: SignalHistoryItem) => {
      Alert.alert(t('history_delete_title'), t('history_delete_daily'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('bond_delete_action'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteDailySignalRecord(item.signalId)
                await queryClient.invalidateQueries({ queryKey: ['signal-history', 30, userId] })
                await queryClient.invalidateQueries({ queryKey: ['signal-history', 7, userId] })
              } catch (err) {
                if (__DEV__) console.warn('[history] delete signal', err)
                showDeleteError()
              }
            })()
          },
        },
      ])
    },
    [t, queryClient, userId, showDeleteError]
  )

  const onDeletePairReading = useCallback(
    (id: string) => {
      Alert.alert(t('history_delete_title'), t('history_delete_pair'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('bond_delete_action'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deletePairHistoryRecord(id)
                await queryClient.invalidateQueries({ queryKey: ['pair-history', userId] })
              } catch (err) {
                if (err instanceof HistoryDeleteBondLinkedError) {
                  Alert.alert(t('alert_notice'), t('history_delete_pair_conflict'))
                  return
                }
                if (__DEV__) console.warn('[history] delete pair', err)
                showDeleteError()
              }
            })()
          },
        },
      ])
    },
    [t, queryClient, userId, showDeleteError]
  )

  const readingRows = useMemo(() => {
    type Ch = {
      slug: ChapterSlug
      sortAt: string
      versions: number
      generationBatchId: string | null
    }

    const rawChapters: Ch[] = (manifestQuery.data?.chapters ?? [])
      .filter((c) => c.hasCurrent && c.generatedAt)
      .map((c) => {
        const ga = c.generatedAt!
        // Fall back to per-minute bucket so legacy chapters without a batchId still group naturally.
        const batchId = c.generationBatchId ?? (ga.length >= 16 ? ga.slice(0, 16) : ga)
        return {
          slug: c.slug,
          sortAt: ga,
          versions: c.versions,
          generationBatchId: batchId,
        }
      })

    const batchMap = new Map<string, Ch[]>()
    for (const ch of rawChapters) {
      const key = ch.generationBatchId ?? ch.sortAt
      const arr = batchMap.get(key) ?? []
      arr.push(ch)
      batchMap.set(key, arr)
    }

    // Personal fate readings are intentionally excluded from history:
    // destiny (命) is fixed by birth and doesn't change across regenerations.
    // Only bond readings (pair) are meaningful as historical events.
    void batchMap

    const pairs: ReadingRow[] = (pairQuery.data ?? []).map((p) => ({
      kind: 'pair' as const,
      id: p.id,
      sortAt: p.createdAt,
      label:
        [p.personAName, p.personBName].filter((x) => x && String(x).trim()).join(' · ') ||
        t('history_pair_untitled'),
    }))
    pairs.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
    return pairs
  }, [manifestQuery.data?.chapters, pairQuery.data, t])

  const readingSections = useMemo(
    () => groupByDate(readingRows, (r) => new Date(r.sortAt), t, locale),
    [readingRows, t, locale]
  )

  // Group records by calendar date — Notion/Google Calendar style
  const oracleSections = useMemo(
    () => groupByDate(oracleRecords, (r) => new Date(r.createdAt), t, locale),
    [oracleRecords, t, locale]
  )
  const fateSections = useMemo(
    () => groupByDate(fateRecords, (r) => new Date(r.generatedAt), t, locale),
    [fateRecords, t, locale]
  )

  const oracleCountByDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of oracleRecords) {
      const k = toLocalDayKey(new Date(r.createdAt))
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [oracleRecords])

  const fateCountByDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of fateRecords) {
      const k = toLocalDayKey(new Date(r.generatedAt))
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [fateRecords])

  const showCalendarToggle = segment === 'oracle' || (segment === 'fate' && fateSub === 'daily')

  const calendarFilteredOracle = useMemo(() => {
    if (!selectedDayKey) return [] as DivinationRecord[]
    return oracleRecords.filter((r) => toLocalDayKey(new Date(r.createdAt)) === selectedDayKey)
  }, [oracleRecords, selectedDayKey])

  const calendarFilteredFate = useMemo(() => {
    if (!selectedDayKey) return [] as SignalHistoryItem[]
    return fateRecords.filter((r) => toLocalDayKey(new Date(r.generatedAt)) === selectedDayKey)
  }, [fateRecords, selectedDayKey])

  const weekdayLabels = useMemo(() => {
    const refSunday = new Date(2023, 4, 7)
    const labels: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(refSunday)
      d.setDate(refSunday.getDate() + i)
      labels.push(new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d))
    }
    return labels
  }, [locale])

  const shiftCalendarMonth = useCallback((delta: number) => {
    setCalendarMonth((prev) => {
      const n = new Date(prev)
      n.setMonth(n.getMonth() + delta)
      return n
    })
    setSelectedDayKey(null)
  }, [])

  useEffect(() => {
    setSelectedDayKey(null)
  }, [segment])

  const calendarTitle = useMemo(() => {
    const y = calendarMonth.getFullYear()
    const m = calendarMonth.getMonth() + 1
    return `${y}-${pad2(m)}`
  }, [calendarMonth])

  const calendarGrid = useMemo(() => {
    const y = calendarMonth.getFullYear()
    const m0 = calendarMonth.getMonth()
    const firstDow = new Date(y, m0, 1).getDay()
    const dim = new Date(y, m0 + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= dim; d++) cells.push(d)
    return { cells, y, m0, dim }
  }, [calendarMonth])

  // ── Section header (date label) ──────────────────────────────
  const renderSectionHeader = ({ section }: { section: Section<unknown> }) => (
    <View style={{ paddingTop: 24, paddingBottom: 6 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: ios.secondary,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {section.title}
      </Text>
    </View>
  )

  // ── Oracle item ────────────────────────────────────────────
  const renderOracleItem = ({
    item,
    index,
    section,
  }: {
    item: DivinationRecord
    index: number
    section: { data: DivinationRecord[] }
  }) => {
    const methodLabel =
      item.method === 'meihua' ? t('history_method_meihua') : t('history_method_liuyao')
    const oracleBadge = (
      <Text style={{ fontSize: 11, fontWeight: '500', color: ios.secondary, letterSpacing: 0.6 }}>
        {t('history_kind_oracle')}
      </Text>
    )
    return (
      <HistoryRowLayout
        ios={ios}
        groupPosition={historyRowGroupPosition(section.data.length, index)}
        timeLabel={formatTimeHm(item.createdAt, locale)}
        leadingGlyph={<TrigramIcon size={18} color={ios.secondary} />}
        kindBadge={oracleBadge}
        title={`${item.hexagramName}${t('yiching_gua_suffix')}`}
        subtitle={item.question}
        subtitleSecondary={item.summary}
        trailingMeta={[methodLabel, FORTUNE_LABELS[item.fortune]].join('\n')}
        onPress={() => router.push(`/detail/yiching/${item.id}`)}
        endAccessory={
          <Pressable
            onPress={() => onDeleteOracle(item)}
            hitSlop={10}
            accessibilityLabel={t('bond_delete_action')}
          >
            <Trash2 size={14} color={ios.dim} strokeWidth={1.2} />
          </Pressable>
        }
      />
    )
  }

  // ── Fate item (Daily Signal) ───────────────────────────────
  const renderFateItem = ({
    item,
    index,
    section,
  }: {
    item: SignalHistoryItem
    index: number
    section: { data: SignalHistoryItem[] }
  }) => {
    const headline = item.content?.headline ?? ''
    const lens = item.content?.todayLens ?? ''
    const level = item.content?.energy?.level
    const energyLabel = level ? t(SIGNAL_ENERGY_I18N[level]) : ''
    const dailyBadge = (
      <Text style={{ fontSize: 11, fontWeight: '500', color: ios.secondary, letterSpacing: 0.6 }}>
        {t('history_kind_daily')}
      </Text>
    )
    return (
      <HistoryRowLayout
        ios={ios}
        groupPosition={historyRowGroupPosition(section.data.length, index)}
        timeLabel={formatTimeHm(item.generatedAt, locale)}
        leadingGlyph={<Calendar size={18} color={ios.secondary} strokeWidth={1.5} />}
        kindBadge={dailyBadge}
        title={headline || t('history_fate')}
        subtitle={item.model.startsWith('almanac') ? t('history_kind_daily') : lens}
        trailingMeta={energyLabel}
        onPress={() =>
          router.push(`/(settings)/history/fate/${encodeURIComponent(item.signalId)}` as never)
        }
        endAccessory={
          <Pressable
            onPress={() => onDeleteDailySignal(item)}
            hitSlop={10}
            accessibilityLabel={t('bond_delete_action')}
          >
            <Trash2 size={14} color={ios.dim} strokeWidth={1.2} />
          </Pressable>
        }
      />
    )
  }

  const renderReadingItem = ({
    item,
    index,
    section,
  }: {
    item: ReadingRow
    index: number
    section: { data: ReadingRow[] }
  }) => {
    const badge = (
      <Text style={{ fontSize: 11, fontWeight: '500', color: ios.secondary, letterSpacing: 0.6 }}>
        {t('history_kind_pair')}
      </Text>
    )
    const title = item.kind === 'pair' ? item.label : t('history_personal_fate_title')
    return (
      <HistoryRowLayout
        ios={ios}
        groupPosition={historyRowGroupPosition(section.data.length, index)}
        timeLabel={formatTimeHm(item.sortAt, locale)}
        kindBadge={badge}
        title={title}
        onPress={() => {
          if (item.kind === 'pair') {
            router.push(`/(settings)/history/pair/${encodeURIComponent(item.id)}` as never)
          }
        }}
        endAccessory={
          item.kind === 'pair' ? (
            <Pressable
              onPress={() => onDeletePairReading(item.id)}
              hitSlop={10}
              accessibilityLabel={t('bond_delete_action')}
            >
              <Trash2 size={14} color={ios.dim} strokeWidth={1.2} />
            </Pressable>
          ) : undefined
        }
      />
    )
  }

  const emptyOracle = oracleQuery.isPending ? (
    <YiChingRecordSkeleton />
  ) : (
    <View style={{ alignItems: 'center', marginTop: 80, gap: 8 }}>
      <TrigramIcon size={36} color={ios.separator} />
      <Text style={{ fontSize: 15, fontWeight: '300', color: ios.secondary }}>
        {t('history_empty')}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '300', color: ios.dim }}>
        {t('history_empty_hint')}
      </Text>
    </View>
  )

  const emptyFate = (
    <View style={{ alignItems: 'center', marginTop: 80, gap: 8 }}>
      <Text style={{ fontSize: 36, color: ios.separator }}>☰</Text>
      <Text style={{ fontSize: 15, fontWeight: '300', color: ios.secondary }}>
        {t('history_empty')}
      </Text>
    </View>
  )

  const emptyReadings =
    manifestQuery.isPending || pairQuery.isPending ? (
      <View style={{ alignItems: 'center', marginTop: 80 }}>
        <Text style={{ fontSize: 13, color: ios.dim }}>{t('signal_loading')}</Text>
      </View>
    ) : (
      emptyFate
    )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          {router.canGoBack() && (
            <Pressable
              onPress={() => router.back()}
              style={{ marginRight: 12, padding: 4 }}
              hitSlop={8}
            >
              <ArrowLeft size={20} color={ios.text} />
            </Pressable>
          )}
          <Text
            style={{
              fontSize: 24,
              fontWeight: '300',
              color: ios.text,
              letterSpacing: 4,
            }}
          >
            {t('history_title')}
          </Text>
        </View>

        {/* Underline segment control — hidden when opened via Settings deep-link */}
        {!entryScope ? (
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {(['oracle', 'fate'] as HistorySegment[]).map((seg) => {
              const isActive = segment === seg
              const label = seg === 'oracle' ? t('history_oracle') : t('history_fate')
              const count =
                seg === 'oracle'
                  ? oracleRecords.length
                  : fateSub === 'daily'
                    ? fateRecords.length
                    : readingRows.length
              return (
                <Pressable
                  key={seg}
                  onPress={() => {
                    setSegment(seg)
                    hapticSelection()
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: 'center',
                    borderBottomWidth: isActive ? 1.5 : 0.5,
                    borderBottomColor: isActive ? ios.tint : ios.separator,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? '500' : '300',
                      color: isActive ? ios.text : ios.secondary,
                      letterSpacing: 0.5,
                    }}
                  >
                    {label}
                    {count > 0 ? `  ${count}` : ''}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}

        {segment === 'fate' && !entryScope ? (
          <View style={{ flexDirection: 'row', marginBottom: 12, gap: 10 }}>
            {(['daily', 'readings'] as FateHistorySub[]).map((sub) => {
              const active = fateSub === sub
              return (
                <Pressable
                  key={sub}
                  onPress={() => {
                    setFateSub(sub)
                    if (sub === 'readings') setHistoryViewMode('list')
                    hapticSelection()
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderWidth: 0.5,
                    borderColor: active ? ios.tint : ios.separator,
                    backgroundColor: active ? ios.cardElevated : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: active ? '500' : '300',
                      color: active ? ios.text : ios.secondary,
                    }}
                  >
                    {sub === 'daily' ? t('history_fate_sub_daily') : t('history_fate_sub_readings')}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}
      </View>

      {/* List vs calendar */}
      {showCalendarToggle ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 24,
            marginBottom: 8,
          }}
        >
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={t('history_view_list')}
            onPress={() => {
              setHistoryViewMode('list')
              hapticSelection()
            }}
            hitSlop={12}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 6,
              paddingHorizontal: 6,
            }}
          >
            <View style={{ opacity: historyViewMode === 'list' ? 1 : 0.38 }}>
              <List
                size={15}
                color={historyViewMode === 'list' ? ios.tint : ios.secondary}
                strokeWidth={historyViewMode === 'list' ? 2 : 1.35}
              />
            </View>
          </Pressable>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={t('history_view_calendar')}
            onPress={() => {
              setHistoryViewMode('calendar')
              hapticSelection()
            }}
            hitSlop={12}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 6,
              paddingHorizontal: 6,
            }}
          >
            <View style={{ opacity: historyViewMode === 'calendar' ? 1 : 0.38 }}>
              <Calendar
                size={15}
                color={historyViewMode === 'calendar' ? ios.tint : ios.secondary}
                strokeWidth={historyViewMode === 'calendar' ? 2 : 1.35}
              />
            </View>
          </Pressable>
        </View>
      ) : null}

      {/* Date-grouped SectionList or calendar + day list */}
      {segment === 'oracle' ? (
        historyViewMode === 'list' ? (
          <SectionList
            sections={oracleSections}
            renderItem={renderOracleItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => (item as DivinationRecord).id}
            contentContainerStyle={{ paddingBottom: 44, paddingHorizontal: 20 }}
            refreshing={oracleQuery.isFetching && !oracleQuery.isPending}
            onRefresh={() => {
              void oracleQuery.refetch()
            }}
            ListEmptyComponent={emptyOracle}
            stickySectionHeadersEnabled={false}
          />
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Pressable onPress={() => shiftCalendarMonth(-1)} hitSlop={8}>
                <ChevronLeft size={22} color={ios.text} strokeWidth={1.5} />
              </Pressable>
              <Text style={{ fontSize: 15, fontWeight: '500', color: ios.text }}>
                {calendarTitle}
              </Text>
              <Pressable onPress={() => shiftCalendarMonth(1)} hitSlop={8}>
                <ChevronRight size={22} color={ios.text} strokeWidth={1.5} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {weekdayLabels.map((lab, i) => (
                <View key={`wd-${i}`} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: ios.dim }}>{lab}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {calendarGrid.cells.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <View key={`pad-${idx}`} style={{ width: '14.28%', minHeight: 40 }} />
                }
                const key = `${calendarGrid.y}-${pad2(calendarGrid.m0 + 1)}-${pad2(dayNum)}`
                const count = oracleCountByDay.get(key) ?? 0
                const marked = count > 0
                const sel = selectedDayKey === key
                const dot = historyCalendarDotStyle(count)
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      if (!marked) return
                      setSelectedDayKey((p) => (p === key ? null : key))
                      hapticSelection()
                    }}
                    style={{
                      width: '14.28%',
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: sel ? 0.5 : 0,
                      borderColor: ios.tint,
                      backgroundColor: sel ? ios.cardElevated : 'transparent',
                      opacity: marked ? 1 : 0.32,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: ios.text, fontWeight: '400' }}>
                      {dayNum}
                    </Text>
                    {marked ? (
                      <View
                        style={{
                          width: dot.size,
                          height: dot.size,
                          borderRadius: dot.size / 2,
                          backgroundColor: ios.tint,
                          opacity: dot.opacity,
                          marginTop: 3,
                        }}
                      />
                    ) : (
                      <View style={{ height: 7 }} />
                    )}
                  </Pressable>
                )
              })}
            </View>
            {!selectedDayKey ? (
              <Text
                style={{
                  fontSize: 13,
                  color: ios.dim,
                  marginTop: 12,
                  textAlign: 'center',
                }}
              >
                {t('history_calendar_select_day')}
              </Text>
            ) : null}
            <FlatList
              data={calendarFilteredOracle}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) =>
                renderOracleItem({
                  item,
                  index,
                  section: { data: calendarFilteredOracle },
                })
              }
              ListEmptyComponent={
                selectedDayKey ? (
                  <Text
                    style={{
                      fontSize: 13,
                      color: ios.dim,
                      textAlign: 'center',
                      marginTop: 20,
                    }}
                  >
                    {t('history_empty')}
                  </Text>
                ) : null
              }
              refreshing={oracleQuery.isFetching && !oracleQuery.isPending}
              onRefresh={() => {
                void oracleQuery.refetch()
              }}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 44 }}
            />
          </View>
        )
      ) : fateSub === 'daily' ? (
        historyViewMode === 'list' ? (
          <SectionList
            sections={fateSections}
            renderItem={renderFateItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => (item as SignalHistoryItem).signalId}
            contentContainerStyle={{ paddingBottom: 44, paddingHorizontal: 20 }}
            refreshing={fateQuery.isFetching && !fateQuery.isPending}
            onRefresh={() => {
              void fateQuery.refetch()
            }}
            ListEmptyComponent={emptyFate}
            stickySectionHeadersEnabled={false}
          />
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Pressable onPress={() => shiftCalendarMonth(-1)} hitSlop={8}>
                <ChevronLeft size={22} color={ios.text} strokeWidth={1.5} />
              </Pressable>
              <Text style={{ fontSize: 15, fontWeight: '500', color: ios.text }}>
                {calendarTitle}
              </Text>
              <Pressable onPress={() => shiftCalendarMonth(1)} hitSlop={8}>
                <ChevronRight size={22} color={ios.text} strokeWidth={1.5} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {weekdayLabels.map((lab, i) => (
                <View key={`wd2-${i}`} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: ios.dim }}>{lab}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {calendarGrid.cells.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <View key={`pad2-${idx}`} style={{ width: '14.28%', minHeight: 40 }} />
                }
                const key = `${calendarGrid.y}-${pad2(calendarGrid.m0 + 1)}-${pad2(dayNum)}`
                const count = fateCountByDay.get(key) ?? 0
                const marked = count > 0
                const sel = selectedDayKey === key
                const dot = historyCalendarDotStyle(count)
                return (
                  <Pressable
                    key={`c2-${key}`}
                    onPress={() => {
                      if (!marked) return
                      setSelectedDayKey((p) => (p === key ? null : key))
                      hapticSelection()
                    }}
                    style={{
                      width: '14.28%',
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: sel ? 0.5 : 0,
                      borderColor: ios.tint,
                      backgroundColor: sel ? ios.cardElevated : 'transparent',
                      opacity: marked ? 1 : 0.32,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: ios.text, fontWeight: '400' }}>
                      {dayNum}
                    </Text>
                    {marked ? (
                      <View
                        style={{
                          width: dot.size,
                          height: dot.size,
                          borderRadius: dot.size / 2,
                          backgroundColor: ios.tint,
                          opacity: dot.opacity,
                          marginTop: 3,
                        }}
                      />
                    ) : (
                      <View style={{ height: 7 }} />
                    )}
                  </Pressable>
                )
              })}
            </View>
            {!selectedDayKey ? (
              <Text
                style={{
                  fontSize: 13,
                  color: ios.dim,
                  marginTop: 12,
                  textAlign: 'center',
                }}
              >
                {t('history_calendar_select_day')}
              </Text>
            ) : null}
            <FlatList
              data={calendarFilteredFate}
              keyExtractor={(item) => item.signalId}
              renderItem={({ item, index }) =>
                renderFateItem({
                  item,
                  index,
                  section: { data: calendarFilteredFate },
                })
              }
              ListEmptyComponent={
                selectedDayKey ? (
                  <Text
                    style={{
                      fontSize: 13,
                      color: ios.dim,
                      textAlign: 'center',
                      marginTop: 20,
                    }}
                  >
                    {t('history_empty')}
                  </Text>
                ) : null
              }
              refreshing={fateQuery.isFetching && !fateQuery.isPending}
              onRefresh={() => {
                void fateQuery.refetch()
              }}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 44 }}
            />
          </View>
        )
      ) : (
        <SectionList
          sections={readingSections}
          renderItem={renderReadingItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) =>
            item.kind === 'personal_fate' ? `book:${item.id}` : `pair:${item.id}`
          }
          contentContainerStyle={{ paddingBottom: 44, paddingHorizontal: 20 }}
          refreshing={
            (manifestQuery.isFetching && !manifestQuery.isPending) ||
            (pairQuery.isFetching && !pairQuery.isPending)
          }
          onRefresh={() => {
            void manifestQuery.refetch()
            void pairQuery.refetch()
          }}
          ListEmptyComponent={emptyReadings}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  )
}
