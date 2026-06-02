/**
 * 占卜详情页 — 周易占卜结果完整展示
 *
 * 路由: /detail/yiching/[id]
 */

import type { DivinationDetail } from '@zhop/hexastral-client'
import { FORTUNE_LABELS, formatDate } from '@zhop/hexastral-tokens/constants/fortune'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AskHexAstralCTA } from '@/components/detail/AskHexAstralCTA'
import { DetailHeader } from '@/components/detail/DetailHeader'
import { StarRating } from '@/components/detail/StarRating'
import { ShareCard, ShareCardRow } from '@/components/share/ShareCard'
import { ShareChapterButton } from '@/components/sharing/ShareChapterButton'
import { ErrorRetry } from '@/components/ui/ErrorBoundary'
import { apiClient } from '@/lib/api'
import { cacheFirst } from '@/lib/cache'
import { useI18n } from '@/lib/i18n'
import { theme } from '@/lib/theme'
import { hapticLight } from '@/lib/ux/haptics'

export default function YiChingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const { t } = useI18n()

  const [detail, setDetail] = useState<DivinationDetail | null>(null)
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
        `yiching_detail:${id}`,
        async () => {
          const resp = await apiClient.api.yiching.divination[':id'].$get({ param: { id: id! } })
          if (!resp.ok) throw new Error('fetch_failed')
          const json = await resp.json()
          return (json.data ?? json) as DivinationDetail
        },
        7 * 24 * 60 * 60 * 1000 // 7 days
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
      await apiClient.api.yiching.divination[':id'].bookmark.$patch({
        param: { id: detail.id },
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
        await apiClient.api.yiching.divination[':id'].rating.$patch({
          param: { id: detail.id },
          json: { rating: value },
        })
        setRating(value)
      } catch {
        // 静默处理
      }
    },
    [detail]
  )

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
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('loading')}</Text>
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 顶部导航 */}
      <DetailHeader
        title={t('detail_yiching_title')}
        bookmarked={bookmarked}
        onBack={() => router.back()}
        onBookmark={handleToggleBookmark}
        bookmarkAccentColor={colors.accent}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 64 }}>
        {/* ── 卦象英雄区 ─────────────────────────────────────────── */}
        <View
          style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 28, paddingHorizontal: 24 }}
        >
          <Text style={{ fontSize: 12, letterSpacing: 2, color: colors.textSecondary }}>
            {formatDate(detail.createdAt).toUpperCase()}
          </Text>

          {detail.hexagramData && (
            <Text style={{ fontSize: 80, marginTop: 16, marginBottom: 8 }}>
              {detail.hexagramData.symbol}
            </Text>
          )}

          <Text style={{ fontSize: 26, fontWeight: '600', color: colors.text, letterSpacing: 0.5 }}>
            {detail.hexagramName}
            {t('yiching_gua_suffix')}
          </Text>

          {/* 吉凶 — 纯文字，无色边框 */}
          <Text
            style={{
              fontSize: 13,
              letterSpacing: 4,
              color: colors.textSecondary,
              marginTop: 10,
            }}
          >
            {FORTUNE_LABELS[detail.fortune]}
          </Text>
        </View>

        {/* 分割线 */}
        <View style={{ height: 0.5, backgroundColor: colors.border, marginHorizontal: 24 }} />

        {/* ── 问题 ───────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}>
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: colors.textSecondary,
              marginBottom: 10,
            }}
          >
            {t('detail_asked').toUpperCase()}
          </Text>
          <Text style={{ fontSize: 16, color: colors.text, lineHeight: 26 }}>
            {detail.question}
          </Text>
        </View>

        <View style={{ height: 0.5, backgroundColor: colors.border, marginHorizontal: 24 }} />

        {/* ── 一句话总结 ─────────────────────────────────────────── */}
        <View
          style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, alignItems: 'center' }}
        >
          {/* 细金线 */}
          <View
            style={{
              width: 32,
              height: 1,
              backgroundColor: colors.accent,
              marginBottom: 16,
              opacity: 0.6,
            }}
          />
          <Text
            style={{
              fontSize: 17,
              fontWeight: '500',
              color: colors.accent,
              textAlign: 'center',
              lineHeight: 27,
              letterSpacing: 0.3,
            }}
          >
            {detail.summary}
          </Text>
          <View
            style={{
              width: 32,
              height: 1,
              backgroundColor: colors.accent,
              marginTop: 16,
              opacity: 0.6,
            }}
          />
        </View>

        <View style={{ height: 0.5, backgroundColor: colors.border, marginHorizontal: 24 }} />

        {/* ── 卦辞 + 象辞 ────────────────────────────────────────── */}
        {detail.hexagramData && (
          <>
            <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  color: colors.textSecondary,
                  marginBottom: 10,
                }}
              >
                {t('yiching_guaci').toUpperCase()}
              </Text>
              <Text
                style={{ fontSize: 15, color: colors.text, fontStyle: 'italic', lineHeight: 24 }}
              >
                {detail.hexagramData.judgment}
              </Text>
            </View>

            <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  color: colors.textSecondary,
                  marginBottom: 10,
                }}
              >
                {t('yiching_xiangci').toUpperCase()}
              </Text>
              <Text
                style={{ fontSize: 15, color: colors.text, fontStyle: 'italic', lineHeight: 24 }}
              >
                {detail.hexagramData.image}
              </Text>
            </View>

            {detail.hexagramData.keywords.length > 0 && (
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  paddingHorizontal: 24,
                  paddingBottom: 24,
                  lineHeight: 22,
                }}
              >
                {detail.hexagramData.keywords.join('  ·  ')}
              </Text>
            )}

            <View style={{ height: 0.5, backgroundColor: colors.border, marginHorizontal: 24 }} />
          </>
        )}

        {/* ── AI 解读 ─────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}>
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: colors.textSecondary,
              marginBottom: 10,
            }}
          >
            {t('detail_ai_reading').toUpperCase()}
          </Text>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 26 }}>
            {detail.interpretation}
          </Text>
        </View>

        <View style={{ height: 0.5, backgroundColor: colors.border, marginHorizontal: 24 }} />

        {/* ── 建议 ────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}>
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: colors.textSecondary,
              marginBottom: 10,
            }}
          >
            {t('detail_advice').toUpperCase()}
          </Text>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 25 }}>{detail.advice}</Text>
        </View>

        <View style={{ height: 0.5, backgroundColor: colors.border, marginHorizontal: 24 }} />
        {/* Ask HexAstral CTA */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <AskHexAstralCTA
            onPress={() => router.push(`/detail/chat/yiching/${id}`)}
            marginBottom={0}
          />
        </View>
        {/* ── 评分 ────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}>
          <StarRating rating={rating} onRate={handleRate} accentColor={colors.accent} />
        </View>

        {/* ── 变爻 ────────────────────────────────────────────────── */}
        {detail.changingLines &&
          Array.isArray(detail.changingLines) &&
          detail.changingLines.length > 0 && (
            <>
              <View style={{ height: 0.5, backgroundColor: colors.border, marginHorizontal: 24 }} />
              <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 10,
                    letterSpacing: 3,
                    color: colors.textSecondary,
                    marginBottom: 10,
                  }}
                >
                  {t('yiching_changing_lines').toUpperCase()}
                </Text>
                <Text style={{ fontSize: 14, color: colors.text, lineHeight: 24 }}>
                  {detail.changingLines
                    .map((line) => t('yiching_yao_ordinal', { n: line }))
                    .join('  ')}
                </Text>
              </View>
            </>
          )}

        {/* ── 分享卡片 ─────────────────────────────────────────────── */}
        <View
          style={{
            height: 0.5,
            backgroundColor: colors.border,
            marginHorizontal: 24,
            marginBottom: 32,
          }}
        />
        <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
          <ShareCard
            title={`${detail.hexagramName}${t('yiching_gua_suffix')} · ${FORTUNE_LABELS[detail.fortune]}`}
            subtitle={formatDate(detail.createdAt)}
            accentColor={colors.accent}
            backgroundColor={colors.card}
            textColor={colors.text}
            secondaryColor={colors.textSecondary}
          >
            <ShareCardRow
              label={t('detail_question')}
              value={detail.question}
              valueColor={colors.text}
              labelColor={colors.textSecondary}
            />
            {detail.interpretation && (
              <Text
                style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}
                numberOfLines={4}
              >
                {detail.interpretation}
              </Text>
            )}
          </ShareCard>
          {/* Phase C.3 — URL-based share goes through `/api/share` snapshot. */}
          <View style={{ marginTop: 16 }}>
            <ShareChapterButton
              reportType='yiching'
              reportId={detail.id}
              title={`${detail.hexagramName}${t('yiching_gua_suffix')}`}
              contentJson={JSON.stringify({
                hexagramName: detail.hexagramName,
                question: detail.question,
                interpretation: detail.interpretation,
                fortune: detail.fortune,
                createdAt: detail.createdAt,
              })}
              labelKey='share_chart_cta'
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
