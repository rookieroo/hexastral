import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ChartMeta,
  FateStellarChart,
  PalaceSummary,
  ReadingRecord,
} from '@zhop/hexastral-client'
import { useRouter } from 'expo-router'
import { Star } from 'lucide-react-native'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StellarOverviewCard, ZiweiPalaceCard } from '@/components/ziwei'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { getBirthInfo } from '@/lib/domain/birthInfo'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { randomUUID } from '@/lib/uuid'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isChartMeta(v: unknown): v is ChartMeta {
  if (!isRecord(v)) return false
  const keys: (keyof ChartMeta)[] = [
    'solarDate',
    'lunarDate',
    'chineseDate',
    'fiveElementsClass',
    'soul',
    'body',
    'sign',
    'zodiac',
    'time',
    'timeRange',
    'earthlyBranchOfSoulPalace',
    'earthlyBranchOfBodyPalace',
  ]
  return keys.every((k) => typeof v[k] === 'string')
}

function isPalaceSummary(v: unknown): v is PalaceSummary {
  if (!isRecord(v)) return false
  if (typeof v.index !== 'number' || typeof v.name !== 'string') return false
  if (typeof v.heavenlyStem !== 'string' || typeof v.earthlyBranch !== 'string') return false
  if (typeof v.isBodyPalace !== 'boolean') return false
  if (!Array.isArray(v.majorStars) || !Array.isArray(v.minorStars)) return false
  if (!isRecord(v.decadal) || !Array.isArray(v.decadal.range)) return false
  const range = v.decadal.range
  if (
    range.length !== 2 ||
    typeof range[0] !== 'number' ||
    typeof range[1] !== 'number' ||
    typeof v.decadal.heavenlyStem !== 'string' ||
    typeof v.decadal.earthlyBranch !== 'string'
  ) {
    return false
  }
  if (!Array.isArray(v.ages) || !v.ages.every((a: unknown) => typeof a === 'number')) return false
  for (const star of v.majorStars) {
    if (
      !isRecord(star) ||
      typeof star.name !== 'string' ||
      typeof star.brightness !== 'string' ||
      typeof star.mutagen !== 'string'
    ) {
      return false
    }
  }
  for (const star of v.minorStars) {
    if (!isRecord(star) || typeof star.name !== 'string' || typeof star.type !== 'string') {
      return false
    }
  }
  return true
}

function toFateStellarChart(payload: unknown): FateStellarChart | null {
  if (!isRecord(payload)) return null
  const palaces = payload.palaces
  const meta = payload.meta
  if (!Array.isArray(palaces) || !isChartMeta(meta)) return null
  if (!palaces.every(isPalaceSummary)) return null
  return { palaces, meta }
}

function mapLanguage(locale: string): string {
  if (locale === 'zh' || locale === 'zh-Hant') return 'zh-CN'
  if (locale === 'ja') return 'ja-JP'
  return 'en-US'
}

export default function StellarScreen() {
  const { colors } = useTheme()
  const { t, locale } = useI18n()
  const router = useRouter()
  const { userId } = useAuth()
  const qc = useQueryClient()

  const historyQuery = useQuery({
    queryKey: ['stellar-history', userId],
    queryFn: async (): Promise<ReadingRecord[]> => {
      if (!userId) return []
      const resp = await apiClient.api.stellar.chart.history[':userId'].$get({ param: { userId } })
      if (!resp.ok) return []
      const json = await resp.json()
      return (json.data ?? []) as ReadingRecord[]
    },
    enabled: !!userId,
  })

  const latestId = historyQuery.data?.[0]?.id

  const detailQuery = useQuery({
    queryKey: ['stellar-detail-tab', latestId],
    queryFn: async () => {
      if (!latestId) return null
      const resp = await apiClient.api.stellar.chart[':readingId'].$get({
        param: { readingId: latestId },
      })
      if (!resp.ok) return null
      const json: unknown = await resp.json()
      const root = isRecord(json) ? json : null
      if (!root) return null
      const data = root.data !== undefined ? root.data : json
      return data
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
      const resp = await apiClient.api.stellar.chart.$post({
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
        throw new Error(errText || `stellar_post_${resp.status}`)
      }
      await qc.invalidateQueries({ queryKey: ['stellar-history', userId] })
    },
  })

  const chart: FateStellarChart | null = detailQuery.data
    ? toFateStellarChart(detailQuery.data)
    : null

  const isLoading =
    !!userId && (historyQuery.isPending || detailQuery.isPending || generateMutation.isPending)

  const ziweiColors = {
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
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('error_login_hint')}
          </Text>
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
          <Star size={32} color={colors.accent} strokeWidth={1} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: colors.accent,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            {t('stellar_page_title')}
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
            {t('stellar_tab_empty_body')}
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
              {t('stellar_tab_empty_birth_cta')}
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
            <Text
              style={{ fontSize: 13, fontWeight: '500', color: colors.accent, letterSpacing: 1 }}
            >
              {t('stellar_tab_generate_cta')}
            </Text>
          </Pressable>
          {generateMutation.isError ? (
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              {t('stellar_tab_generate_error')}
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
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('stellar_tab_parse_error')}
          </Text>
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
            paddingBottom: 16,
          }}
        >
          <Star size={16} color={colors.accent} strokeWidth={1.2} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: colors.accent,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            {t('stellar_page_title')}
          </Text>
        </View>

        <StellarOverviewCard meta={chart.meta} interpretation={null} colors={ziweiColors} t={t} />

        <Text
          style={{
            fontSize: 11,
            fontWeight: '500',
            color: colors.accent,
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          {t('stellar_twelve_palaces')}
        </Text>
        {chart.palaces.map((palace: PalaceSummary) => (
          <ZiweiPalaceCard key={palace.index} palace={palace} colors={ziweiColors} t={t} />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
