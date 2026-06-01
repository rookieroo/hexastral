import type { FateNatalChart, NatalGeJu, NatalInterpretation, NatalPillar } from '@zhop/hexastral-client'
import {
  NatalGejuCard,
  NatalInterpretationCard,
  NatalPillarGrid,
  NatalShiShenGrid,
} from '@zhop/scenario-bazi'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Columns3 } from 'lucide-react-native'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { getBirthInfo } from '@/lib/domain/birthInfo'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { randomUUID } from '@/lib/uuid'
import { apiClient } from '@/lib/api'

type NatalHistoryRecord = { id: string }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isNatalPillar(v: unknown): v is NatalPillar {
  return (
    isRecord(v) &&
    typeof v.stem === 'string' &&
    typeof v.branch === 'string' &&
    typeof v.nayin === 'string'
  )
}

function isNatalGeJu(v: unknown): v is NatalGeJu {
  if (!isRecord(v)) return false
  if (typeof v.primary !== 'string' || typeof v.category !== 'string') return false
  if (typeof v.dayMasterStrength !== 'string') return false
  if (typeof v.favorableElement !== 'string' || typeof v.unfavorableElement !== 'string') return false
  if (typeof v.description !== 'string') return false
  if (v.secondary != null && typeof v.secondary !== 'string') return false
  return true
}

function isFourPillarsShiShen(v: unknown): v is NonNullable<FateNatalChart['shishen']> {
  if (!isRecord(v)) return false
  const checkPillar = (p: unknown): boolean => {
    if (!isRecord(p)) return false
    return typeof p.stem === 'string' && typeof p.branchMain === 'string'
  }
  return checkPillar(v.year) && checkPillar(v.month) && checkPillar(v.day) && checkPillar(v.hour)
}

function isNayinRecord(v: unknown): v is NonNullable<FateNatalChart['nayin']> {
  if (!isRecord(v)) return false
  return Object.values(v).every((x) => typeof x === 'string')
}

function isTiaohou(v: unknown): v is NonNullable<FateNatalChart['tiaohou']> {
  if (!isRecord(v)) return false
  if (!Array.isArray(v.gods) || typeof v.type !== 'string' || typeof v.satisfied !== 'boolean') {
    return false
  }
  return v.gods.every((g) => typeof g === 'string')
}

function toFateNatalChart(chart: unknown): FateNatalChart | null {
  if (!isRecord(chart)) return null
  const pillars = chart.pillars
  const geju = chart.geju
  if (!isRecord(pillars) || !isNatalGeJu(geju)) return null
  const { year, month, day, hour } = pillars
  if (!isNatalPillar(year) || !isNatalPillar(month) || !isNatalPillar(day) || !isNatalPillar(hour)) {
    return null
  }
  const dm = typeof chart.dayMaster === 'string' && chart.dayMaster.length > 0 ? chart.dayMaster : day.stem
  const shishen = chart.shishen != null && isFourPillarsShiShen(chart.shishen) ? chart.shishen : undefined
  const nayin = chart.nayin != null && isNayinRecord(chart.nayin) ? chart.nayin : undefined
  const tiaohou = chart.tiaohou != null && isTiaohou(chart.tiaohou) ? chart.tiaohou : undefined
  return {
    pillars: { year, month, day, hour },
    geju,
    dayMaster: dm,
    dayMasterWuXing: typeof chart.dayMasterWuXing === 'string' ? chart.dayMasterWuXing : '',
    shishen,
    nayin,
    daYun: chart.daYun,
    shenSha: chart.shenSha,
    tiaohou,
  }
}

function mapLanguage(locale: string): string {
  if (locale === 'zh' || locale === 'zh-Hant') return 'zh-CN'
  if (locale === 'ja') return 'ja-JP'
  return 'en-US'
}

export default function NatalScreen() {
  const { colors } = useTheme()
  const { t, locale } = useI18n()
  const router = useRouter()
  const { userId } = useAuth()
  const qc = useQueryClient()

  const historyQuery = useQuery({
    queryKey: ['natal-history', userId],
    queryFn: async (): Promise<NatalHistoryRecord[]> => {
      if (!userId) return []
      const resp = await apiClient.api.natal.history.$get()
      if (!resp.ok) return []
      const json = (await resp.json()) as { records?: NatalHistoryRecord[] }
      return json.records ?? []
    },
    enabled: !!userId,
  })

  const latestId = historyQuery.data?.[0]?.id

  const detailQuery = useQuery({
    queryKey: ['natal-detail', latestId],
    queryFn: async () => {
      if (!latestId) return null
      const resp = await apiClient.api.natal[':id'].$get({ param: { id: latestId } })
      if (!resp.ok) return null
      return (await resp.json()) as {
        chart: unknown
        interpretation: NatalInterpretation | Record<string, string> | null
      }
    },
    enabled: !!latestId,
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('missing_user')
      const birth = await getBirthInfo()
      if (!birth.solarDate || birth.timeIndex == null || !birth.gender) {
        throw new Error('missing_birth')
      }
      const resp = await apiClient.api.natal.$post({
        json: {
          solarDate: birth.solarDate,
          timeIndex: birth.timeIndex,
          gender: birth.gender,
          longitude: birth.longitude,
          latitude: birth.latitude,
          timezoneId: birth.timezoneId,
          city: birth.birthCity,
          userId,
          language: mapLanguage(locale),
          requestId: randomUUID(),
        },
      })
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '')
        throw new Error(errText || `natal_post_${resp.status}`)
      }
      await qc.invalidateQueries({ queryKey: ['natal-history', userId] })
    },
  })

  const chart: FateNatalChart | null = detailQuery.data?.chart
    ? toFateNatalChart(detailQuery.data.chart)
    : null

  const interpRaw = detailQuery.data?.interpretation
  const interpretation: NatalInterpretation | null =
    interpRaw &&
    typeof interpRaw === 'object' &&
    interpRaw !== null &&
    'overview' in interpRaw
      ? (interpRaw as NatalInterpretation)
      : null

  const isLoading =
    !!userId && (historyQuery.isPending || detailQuery.isPending || generateMutation.isPending)

  const baziColors = {
    background: colors.background,
    text: colors.text,
    textSecondary: colors.textSecondary,
    border: colors.border,
    accent: colors.accent,
    primary: colors.primary,
    card: colors.card,
    surfaceSecondary: colors.surfaceSecondary,
  }

  if (!userId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('error_login_hint')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={colors.textSecondary} />
      </SafeAreaView>
    )
  }

  if (!chart && historyQuery.isSuccess && (historyQuery.data?.length ?? 0) === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
            gap: 20,
          }}
        >
          <Columns3 size={32} color={colors.accent} strokeWidth={1} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: colors.accent,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            {t('natal_four_pillars')}
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '300',
              color: colors.text,
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
            {t('natal_tab_empty_body')}
          </Text>
          <Pressable
            onPress={() => router.push('/birth-info')}
            style={({ pressed }) => ({
              borderWidth: 0.5,
              borderColor: colors.border,
              paddingVertical: 14,
              paddingHorizontal: 32,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text, letterSpacing: 1 }}>
              {t('natal_tab_empty_birth_cta')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => generateMutation.mutate()}
            style={({ pressed }) => ({
              borderWidth: 0.5,
              borderColor: colors.border,
              paddingVertical: 14,
              paddingHorizontal: 32,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.accent, letterSpacing: 1 }}>
              {t('natal_tab_generate_cta')}
            </Text>
          </Pressable>
          {generateMutation.isError ? (
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              {t('natal_tab_generate_error')}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    )
  }

  if (!chart) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('natal_tab_parse_error')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingTop: 8,
            paddingBottom: 24,
          }}
        >
          <Columns3 size={16} color={colors.accent} strokeWidth={1.2} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: colors.accent,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            {t('natal_four_pillars')}
          </Text>
        </View>

        <NatalPillarGrid pillars={chart.pillars} colors={baziColors} t={t} />
        <NatalGejuCard dayMaster={chart.dayMaster} geju={chart.geju} colors={baziColors} t={t} />
        {chart.shishen ? <NatalShiShenGrid shishen={chart.shishen} colors={baziColors} t={t} /> : null}
        {interpretation ? (
          <NatalInterpretationCard interpretation={interpretation} colors={baziColors} t={t} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
