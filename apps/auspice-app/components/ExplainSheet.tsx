/**
 * 深度解读 bottom sheet (C.4) — the Pro/lazy LLM surface. Opens only when the user
 * taps a 宜忌 field (never pre-fetched), calls `POST /api/auspice/explain`, and shows
 * the reading + a Share action. `source==='template'` means the K.4 guard degraded
 * (free taste used up) — `upsell` then nudges to Pro. Chat ("continue asking") is
 * server-ready (`'cycle'` reading type) and lands with the in-app chat screen.
 *
 * Presentation unified onto the shared SatelliteBottomSheet (2026-06) — same
 * grabber + spring + pan-to-dismiss as the paywall sheet, for the minimalist
 * iOS-settings feel. No bespoke Modal / scrim here anymore.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { SatelliteBottomSheet } from '@zhop/satellite-ui'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { SHARE_PALETTE, ShareableCard } from '@/components/ShareableCard'
import { type AuspiceExplainResult, fetchAuspiceExplain } from '@/lib/api'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { useImageShare } from '@/lib/imageShare'
import { dayShareUrl, shareTaglineFor } from '@/lib/share'

interface SheetLabels {
  title: string
  share: string
  loading: string
  failed: string
  pro: string
  unlock: string
}

const LABELS: Record<Locale, SheetLabels> = {
  'zh-Hans': {
    title: '深度解读',
    share: '分享',
    loading: '正在解读…',
    failed: '解读失败',
    pro: '深度解读为 Pro 专享 · 下方为基础说明',
    unlock: '解锁深度解读',
  },
  'zh-Hant': {
    title: '深度解讀',
    share: '分享',
    loading: '正在解讀…',
    failed: '解讀失敗',
    pro: '深度解讀為 Pro 專享 · 下方為基礎說明',
    unlock: '解鎖深度解讀',
  },
  ja: {
    title: '詳しい解説',
    share: '共有',
    loading: '解説中…',
    failed: '取得に失敗しました',
    pro: '詳しい解説は Pro 限定 · 以下は基本説明',
    unlock: '詳しい解説を解錠',
  },
  en: {
    title: 'Deep reading',
    share: 'Share',
    loading: 'Reading…',
    failed: 'Failed to load',
    pro: 'The deep reading is Pro-only — below is the basics',
    unlock: 'Unlock the deep reading',
  },
}

export function ExplainSheet({
  date,
  field,
  ganZhi,
  dayMaster,
  onClose,
  onUpgrade,
}: {
  date: string
  /** The tapped field, e.g. "宜 动土"; `null` keeps the sheet closed. */
  field: string | null
  /** The day's 干支, e.g. "己酉" — shown on the share card. */
  ganZhi?: string
  dayMaster?: string
  onClose: () => void
  /** Opens the paywall — shown to free users instead of the deep reading. */
  onUpgrade?: () => void
}) {
  const { colors, spacing } = useTheme()
  const { locale } = useStrings()
  const { width } = useWindowDimensions()
  const isPro = hasEntitlement(useEntitlements(), 'auspice_pro')
  const L = LABELS[locale]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [result, setResult] = useState<AuspiceExplainResult | null>(null)
  // Image share (was a base64-token URL so long it dwarfed the reading). Pre-warm
  // once the reading lands so the Share tap hands off a ready PNG; the caption is
  // a SHORT /s/day link (install funnel), and the image itself carries the text.
  const {
    shotRef,
    capturing,
    share: shareImage,
  } = useImageShare({
    prewarm: isPro && !!result && field !== null,
    warmKey: `${date}:${field ?? ''}`,
  })

  useEffect(() => {
    if (!field) return
    setLoading(true)
    setError(false)
    setResult(null)
    fetchAuspiceExplain({ date, field, dayMaster, locale, isPro })
      .then((r) => setResult(r))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [field, date, dayMaster, locale, isPro])

  return (
    <SatelliteBottomSheet
      visible={field !== null}
      onClose={onClose}
      title={field ? `${field} · ${L.title}` : L.title}
    >
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
        {loading ? (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.secondary, marginTop: spacing.sm }}>{L.loading}</Text>
          </View>
        ) : error ? (
          <Text style={{ color: colors.secondary }}>{L.failed}</Text>
        ) : result ? (
          <ScrollView style={{ maxHeight: 320 }}>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24 }}>
              {result.explanation}
            </Text>
            {result.upsell ? (
              <Text style={{ color: colors.accent, fontSize: 13, marginTop: spacing.md }}>
                {L.pro}
              </Text>
            ) : null}
          </ScrollView>
        ) : null}

        {result && !isPro && onUpgrade ? (
          <Button variant='primary' onPress={onUpgrade}>
            {L.unlock}
          </Button>
        ) : null}
        {result && isPro && field ? (
          <Button
            variant='secondary'
            onPress={() => shareImage(`${shareTaglineFor(locale)}\n${dayShareUrl(date, locale)}`)}
          >
            {L.share}
          </Button>
        ) : null}

        {/* Off-screen capture target — the reading baked onto the branded ivory
            card, so the share IS the explanation (no giant token URL needed). */}
        {capturing && result && field ? (
          <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents='none'>
            <ShareableCard
              ref={shotRef}
              width={width}
              locale={locale}
              title={field}
              subtitle={[
                ganZhi
                  ? `${ganZhi}${locale.startsWith('zh') || locale === 'ja' ? '日' : ''}`
                  : null,
                date,
              ]
                .filter(Boolean)
                .join(' · ')}
            >
              <Text style={{ color: SHARE_PALETTE.text, fontSize: 15, lineHeight: 25 }}>
                {result.explanation}
              </Text>
            </ShareableCard>
          </View>
        ) : null}
      </View>
    </SatelliteBottomSheet>
  )
}
