/**
 * 排盘详情页 — 星宫命盘完整展示  (Ink Brutalism)
 *
 * 路由: /detail/stellar/[id]
 */

import type { ReadingDetail } from '@zhop/hexastral-client'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Bookmark, BookmarkCheck, Share2 } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AskHexAstralCTA } from '@/components/detail/AskHexAstralCTA'
import { StarRating } from '@/components/detail/StarRating'
import { ErrorRetry } from '@/components/ui/ErrorBoundary'
import { ZiweiPalaceCard } from '@/components/ziwei'
import { apiClient } from '@/lib/api'
import { cacheFirst } from '@/lib/cache'
import { shareReportAsLink } from '@/lib/domain/share'
import { formatShichenLabel } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { type ThemeColors, useTheme } from '@/lib/theme'
import { hapticLight } from '@/lib/ux/haptics'

export default function StellarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const { t, locale } = useI18n()

  const [detail, setDetail] = useState<ReadingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [rating, setRating] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    loadDetail()
  }, [id, loadDetail])

  async function loadDetail() {
    try {
      setLoading(true)
      setError(false)
      const data = await cacheFirst(
        `stellar_detail:${id}`,
        async () => {
          const resp = await apiClient.api.stellar.chart[':readingId'].$get({
            param: { readingId: id! },
          })
          if (!resp.ok) throw new Error('fetch_failed')
          const json = await resp.json()
          return (json.data ?? json) as unknown as ReadingDetail
        },
        7 * 24 * 60 * 60 * 1000
      )
      setDetail(data)
      setBookmarked(data.bookmarked)
      setRating(data.rating)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBookmark = useCallback(async () => {
    if (!detail) return
    hapticLight()
    try {
      await apiClient.api.stellar.chart[':readingId'].bookmark.$patch({
        param: { readingId: detail.id },
        json: { bookmarked: !bookmarked },
      })
      setBookmarked((prev) => !prev)
    } catch {
      // 静默处理
    }
  }, [detail, bookmarked])

  const handleRate = useCallback(
    async (value: number) => {
      if (!detail) return
      try {
        await apiClient.api.stellar.chart[':readingId'].rating.$patch({
          param: { readingId: detail.id },
          json: { rating: value },
        })
        setRating(value)
      } catch {
        // 静默处理
      }
    },
    [detail]
  )

  const handleShare = useCallback(async () => {
    if (!detail) return
    hapticLight()
    // Phase C.3 — go through `/api/share` so the URL points at hexastral-web's
    // `/report/[shareId]/page.tsx` (OG-ready) instead of a guessed legacy /c/.
    try {
      await shareReportAsLink({
        reportType: 'stellar',
        reportId: detail.id,
        title: t('detail_stellar_title'),
        contentJson: JSON.stringify(detail),
      })
    } catch {
      // Fallback to the bare URL share if snapshot creation fails — better
      // than blocking the user from sharing entirely.
      const url = `https://hexastral.com/c/${detail.id}`
      try {
        await Share.share({ url, message: url })
      } catch {
        /* silent */
      }
    }
  }, [detail, t])

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size='large' color={colors.accent} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontWeight: '300' }}>
          {t('loading')}
        </Text>
      </SafeAreaView>
    )
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ErrorRetry
          message={error ? t('load_failed') : t('record_not_found')}
          onRetry={error ? loadDetail : () => router.back()}
        />
      </SafeAreaView>
    )
  }

  const timeLabel = formatShichenLabel(detail.timeIndex, locale)
  const isMale = detail.gender === '男' || detail.gender === 'male'
  const genderLabel = isMale ? t('stellar_gender_male') : t('stellar_gender_female')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 顶部导航 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 8 }} hitSlop={8}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '400',
            color: colors.text,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {t('detail_stellar_title')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable onPress={handleShare} style={{ padding: 8 }} hitSlop={8}>
            <Share2 size={20} color={colors.textSecondary} strokeWidth={1.5} />
          </Pressable>
          <Pressable onPress={handleToggleBookmark} style={{ padding: 8 }} hitSlop={8}>
            {bookmarked ? (
              <BookmarkCheck size={20} color={colors.accent} strokeWidth={1.5} />
            ) : (
              <Bookmark size={20} color={colors.textSecondary} strokeWidth={1.5} />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* 命盘概览 */}
        {detail.meta && (
          <View
            style={{
              backgroundColor: colors.card,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
              padding: 24,
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: '200',
                color: colors.text,
                marginBottom: 8,
                textAlign: 'center',
                letterSpacing: 4,
              }}
            >
              {detail.meta.fiveElementsClass}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '300',
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: 2,
              }}
            >
              {detail.meta.chineseDate}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '300',
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: 2,
              }}
            >
              {detail.solarDate} {timeLabel} · {genderLabel}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '300',
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: detail.interpretation?.summary ? 16 : 0,
              }}
            >
              {t('stellar_soul_star')} {detail.meta.soul} · {detail.meta.body} ·{' '}
              {detail.meta.zodiac} · {detail.meta.sign}
            </Text>

            {/* AI 一句话总结 */}
            {detail.interpretation?.summary ? (
              <View
                style={{
                  borderTopWidth: 0.5,
                  borderTopColor: colors.border,
                  paddingTop: 14,
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '300',
                    color: colors.text,
                    textAlign: 'center',
                    lineHeight: 22,
                  }}
                >
                  {detail.interpretation.summary}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* 十二宫 */}
        {detail.palaces.length > 0 && (
          <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '400',
                color: colors.textSecondary,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              {t('stellar_twelve_palaces')}
            </Text>
            {detail.palaces.map((palace) => (
              <ZiweiPalaceCard key={palace.index} palace={palace} colors={colors} t={t} />
            ))}
          </View>
        )}

        {/* AI 解读 */}
        {detail.interpretation && (
          <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '400',
                color: colors.textSecondary,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              {t('stellar_ai_reading')}
            </Text>
            {detail.interpretation.overview ? (
              <InterpretationCard
                title={t('stellar_interp_overall')}
                content={detail.interpretation.overview}
                colors={colors}
              />
            ) : null}
            {detail.interpretation.career ? (
              <InterpretationCard
                title={t('stellar_interp_career')}
                content={detail.interpretation.career}
                colors={colors}
              />
            ) : null}
            {detail.interpretation.relationship ? (
              <InterpretationCard
                title={t('stellar_interp_romance')}
                content={detail.interpretation.relationship}
                colors={colors}
              />
            ) : null}
            {detail.interpretation.wealth ? (
              <InterpretationCard
                title={t('stellar_interp_wealth')}
                content={detail.interpretation.wealth}
                colors={colors}
              />
            ) : null}
            {detail.interpretation.health ? (
              <InterpretationCard
                title={t('stellar_interp_health')}
                content={detail.interpretation.health}
                colors={colors}
              />
            ) : null}
            {detail.interpretation.currentYear ? (
              <InterpretationCard
                title={t('stellar_interp_current')}
                content={detail.interpretation.currentYear}
                colors={colors}
              />
            ) : null}
          </View>
        )}

        {/* 评分 */}
        <View
          style={{
            marginTop: 24,
            marginHorizontal: 16,
            borderWidth: 0.5,
            borderColor: colors.border,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '300',
              color: colors.textSecondary,
              marginBottom: 14,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}
          >
            {t('detail_rate')}
          </Text>
          <View style={{ alignItems: 'center' }}>
            <StarRating rating={rating} onRate={handleRate} showLabel={false} />
          </View>
        </View>

        {/* 时间戳 */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: 16,
            letterSpacing: 0.5,
          }}
        >
          {t('detail_created_at', { date: new Date(detail.createdAt).toLocaleDateString() })}
        </Text>

        {/* 分享行 */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 16,
            marginHorizontal: 16,
            marginBottom: 8,
            paddingVertical: 14,
            borderWidth: 0.5,
            borderColor: colors.border,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Share2 size={16} color={colors.textSecondary} strokeWidth={1.5} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '400',
              color: colors.text,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            {t('share_result')}
          </Text>
        </Pressable>

        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <AskHexAstralCTA
            onPress={() => router.push(`/detail/chat/stellar/${id}`)}
            marginBottom={0}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ==================== Sub-components ====================

function InterpretationCard({
  title,
  content,
  colors,
}: {
  title: string
  content: string
  colors: ThemeColors
}) {
  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 8,
        backgroundColor: colors.card,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '400',
          color: colors.textSecondary,
          marginBottom: 10,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '300', color: colors.text, lineHeight: 22 }}>
        {content}
      </Text>
    </View>
  )
}
