/**
 * Report chapter screen — single chapter of the 6-chapter book.
 *
 * Layout:
 *   Header  · index + slug-color stripe + title + generated-at
 *   Summary · 1-2 sentence core takeaway
 *   Sections · 3-5 heading + body blocks
 *   Highlights · 0-3 small inline tokens
 *   WatchOuts · 0-3 small inline tokens
 *   Footer  · trust ledger + (Pro) re-roll button + (Pro) history drawer
 *
 * Loading: shows `report_loading` while LLM generates first version.
 * Locked (Pro chapter accessed by Free user): server returns 403; we render
 * the locked state ourselves by checking manifest accessibility.
 */

import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { ChevronRight, Lock } from 'lucide-react-native'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { AskHexAstralCTA } from '@/components/detail/AskHexAstralCTA'
import { ShareChapterButton } from '@/components/sharing/ShareChapterButton'
import { useAuth } from '@/lib/auth'
import {
  ReportChapterError,
  useChapterHistoryQuery,
  useChapterQuery,
} from '@/lib/hooks/useChapterQuery'
import {
  type ReportStylePreset,
  useRefreshChapterMutation,
} from '@/lib/hooks/useRefreshChapterMutation'
import { type ChapterSlug, useReportManifestQuery } from '@/lib/hooks/useReportManifestQuery'
import { useUserQuery } from '@/lib/hooks/useUserQuery'
import { type TranslationKeys, useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

const VALID_SLUGS: readonly ChapterSlug[] = [
  'ch1_personality',
  'ch2_dimensions_static',
  'ch2_dimensions_dynamic',
  'ch3_stellar',
  'ch4_timeline',
  'ch5_hidden',
  'ch6_action',
]

const TITLE_KEYS: Record<ChapterSlug, TranslationKeys> = {
  ch1_personality: 'report_ch1_title',
  ch2_dimensions_static: 'report_ch2_title',
  ch2_dimensions_dynamic: 'report_ch2_title',
  ch3_stellar: 'report_ch3_title',
  ch4_timeline: 'report_ch4_title',
  ch5_hidden: 'report_ch5_title',
  ch6_action: 'report_ch6_title',
}

const STYLE_PRESETS: ReportStylePreset[] = ['direct', 'coach', 'gentle']

interface ChapterContent {
  title?: string
  summary?: string
  sections?: { heading?: string; body?: string }[]
  highlights?: string[]
  watchOuts?: string[]
  currentDayunOverview?: string
  yearlyRhythm?: { period?: string; theme?: string; intensity?: 'low' | 'medium' | 'high' }[]
  decisionWindows?: { timeframe?: string; domain?: string; description?: string }[]
  oneThingToFocus?: string
  tensionPoints?: {
    source?: string
    sourceType?: 'huaJi' | 'shenSha' | 'xingChong' | 'fiveElement' | 'other'
    impactDomain?: string
    mechanism?: string
    currentlyActive?: boolean
  }[]
  dormantPattern?: string
  immediateAction?: { description?: string; timeframe?: 'today' | 'thisWeek' }
  thirtyDayFocus?: { domain?: string; action?: string; rationale?: string }[]
  ninetyDayDirection?: { domain?: string; description?: string }
  delayItem?: { description?: string; reason?: string }
}

export default function ReportChapterScreen() {
  const { slug: rawSlug } = useLocalSearchParams<{ slug: string }>()
  const slug = useMemo<ChapterSlug | null>(
    () => (VALID_SLUGS.includes(rawSlug as ChapterSlug) ? (rawSlug as ChapterSlug) : null),
    [rawSlug]
  )

  const { t } = useI18n()
  const { colors, isDark } = useTheme()
  const { userId } = useAuth()
  const { data: user } = useUserQuery(userId)
  const effectiveUserId = user?.id ?? userId
  const { data: manifest } = useReportManifestQuery(effectiveUserId)
  const isPro = manifest?.isPro ?? false
  const entry = manifest?.chapters.find((c) => c.slug === slug)
  const accessible = entry?.accessible ?? true

  const {
    data: chapter,
    isLoading,
    error,
  } = useChapterQuery(effectiveUserId, slug ?? 'ch1_personality', !!slug && accessible)

  const { bottom: bottomInset } = useSafeAreaInsets()

  const [historyOpen, setHistoryOpen] = useState(false)
  const [perspectiveOpen, setPerspectiveOpen] = useState(false)
  const [stylePreset, setStylePreset] = useState<ReportStylePreset>('coach')
  const [perspectiveSeed, setPerspectiveSeed] = useState('')
  const [styleSeed, setStyleSeed] = useState('')
  const [versionOverride, setVersionOverride] = useState<{
    contentJson: unknown
    generatedAt: string | null
    label: string
  } | null>(null)

  const refreshMut = useRefreshChapterMutation(effectiveUserId)

  const onSubmitReroll = useCallback(() => {
    if (!slug) return
    const hasPerspective = !!perspectiveSeed.trim()
    const hasStyleSeed = !!styleSeed.trim()
    if (!hasPerspective && !hasStyleSeed && !stylePreset) return
    refreshMut.mutate(
      {
        slug,
        perspectiveSeed: perspectiveSeed.trim() || undefined,
        stylePreset,
        styleSeed: styleSeed.trim() || undefined,
      },
      {
        onSuccess: () => {
          setPerspectiveOpen(false)
          setPerspectiveSeed('')
          setStyleSeed('')
        },
      }
    )
  }, [refreshMut, slug, perspectiveSeed, styleSeed, stylePreset])

  const ios = {
    bg: isDark ? '#09090B' : '#FAFAFA',
    card: isDark ? '#18181B' : '#FFFFFF',
    sheet: colors.surface,
    sheetBg: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FAFAFA' : '#09090B',
    secondary: isDark ? '#A1A1AA' : '#71717A',
    dim: isDark ? '#52525B' : '#A1A1AA',
    tint: colors.primary,
    tintFg: isDark ? '#18181B' : '#FFFFFF',
    accent: colors.accent,
  }

  if (!slug) {
    router.back()
    return null
  }

  const titleKey = TITLE_KEYS[slug]
  const content =
    ((versionOverride?.contentJson ?? chapter?.contentJson) as ChapterContent | undefined) ?? null

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: ios.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Text style={[styles.backText, { color: ios.secondary }]}>← {t('report_toc_title')}</Text>
        </Pressable>

        <View style={[styles.headerStripe, { backgroundColor: ios.accent }]} />
        <Text style={[styles.chapterTitle, { color: ios.text }]}>{t(titleKey)}</Text>
        {content?.title && content.title !== t(titleKey) ? (
          <Text style={[styles.chapterSubtitle, { color: ios.secondary }]}>{content.title}</Text>
        ) : null}

        {versionOverride ? (
          <Pressable
            onPress={() => setVersionOverride(null)}
            style={[
              styles.versionBanner,
              { backgroundColor: ios.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.versionBannerText, { color: ios.secondary }]}>
              {versionOverride.label}
            </Text>
            <Text style={[styles.versionBannerHint, { color: ios.tint }]}>
              {t('report_tap_back_latest')}
            </Text>
          </Pressable>
        ) : null}

        {!accessible ? (
          <View
            style={[styles.lockedCard, { backgroundColor: ios.card, borderColor: colors.border }]}
          >
            <Lock size={28} color={ios.dim} />
            <Text style={[styles.lockedTitle, { color: ios.text }]}>
              {t('report_chapter_pro_locked')}
            </Text>
            <Text style={[styles.lockedBody, { color: ios.secondary }]}>
              {t('report_chapter_locked_body')}
            </Text>
            <Pressable
              onPress={() => router.push('/paywall')}
              style={[styles.tintButton, { backgroundColor: ios.tint }]}
            >
              <Text style={[styles.tintButtonText, { color: ios.tintFg }]}>
                {t('report_unlock_pro_cta')}
              </Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <Text style={[styles.loading, { color: ios.secondary }]}>{t('report_loading')}</Text>
        ) : error instanceof ReportChapterError && error.code === 'REPORT_REGEN_REQUIRES_PRO' ? (
          <View
            style={[styles.lockedCard, { backgroundColor: ios.card, borderColor: colors.border }]}
          >
            <Lock size={28} color={ios.dim} />
            <Text style={[styles.lockedTitle, { color: ios.text }]}>
              {t('report_regen_requires_pro_title')}
            </Text>
            <Text style={[styles.lockedBody, { color: ios.secondary }]}>
              {t('report_regen_requires_pro_body')}
            </Text>
            <Pressable
              onPress={() => router.push('/paywall')}
              style={[styles.tintButton, { backgroundColor: ios.tint }]}
            >
              <Text style={[styles.tintButtonText, { color: ios.tintFg }]}>
                {t('paywall_upgrade')}
              </Text>
            </Pressable>
          </View>
        ) : error ? (
          <Text style={[styles.error, { color: ios.secondary }]}>
            {error instanceof Error ? error.message : String(error)}
          </Text>
        ) : content ? (
          <View>
            {content.summary ? (
              <View style={styles.summaryBlock}>
                <Text style={[styles.sectionLabel, { color: ios.dim }]}>{t('report_summary')}</Text>
                <Text style={[styles.summaryText, { color: ios.text }]}>{content.summary}</Text>
              </View>
            ) : null}

            {slug === 'ch4_timeline' && content.currentDayunOverview ? (
              <View style={styles.sectionsBlock}>
                <Text style={[styles.sectionLabel, { color: ios.dim }]}>
                  {t('report_sections')}
                </Text>
                <View style={styles.sectionItem}>
                  <Text style={[styles.sectionHeading, { color: ios.text }]}>
                    {t('report_ch4_current_dayun')}
                  </Text>
                  <Text style={[styles.sectionBody, { color: ios.secondary }]}>
                    {content.currentDayunOverview}
                  </Text>
                </View>
                {Array.isArray(content.yearlyRhythm)
                  ? content.yearlyRhythm
                      .filter((item) => item.period && item.theme)
                      .map((item, idx) => (
                        <View key={`rhythm-${idx}`} style={styles.sectionItem}>
                          <Text style={[styles.sectionHeading, { color: ios.text }]}>
                            {item.period} {item.intensity ? `(${item.intensity})` : ''}
                          </Text>
                          <Text style={[styles.sectionBody, { color: ios.secondary }]}>
                            {item.theme}
                          </Text>
                        </View>
                      ))
                  : null}
                {Array.isArray(content.decisionWindows)
                  ? content.decisionWindows
                      .filter((item) => item.timeframe && item.description)
                      .map((item, idx) => (
                        <View key={`window-${idx}`} style={styles.sectionItem}>
                          <Text style={[styles.sectionHeading, { color: ios.text }]}>
                            {item.timeframe}
                            {item.domain ? ` · ${item.domain}` : ''}
                          </Text>
                          <Text style={[styles.sectionBody, { color: ios.secondary }]}>
                            {item.description}
                          </Text>
                        </View>
                      ))
                  : null}
                {content.oneThingToFocus ? (
                  <View style={styles.sectionItem}>
                    <Text style={[styles.sectionHeading, { color: ios.text }]}>
                      {t('report_ch4_focus_one_thing')}
                    </Text>
                    <Text style={[styles.sectionBody, { color: ios.secondary }]}>
                      {content.oneThingToFocus}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {slug === 'ch5_hidden' && Array.isArray(content.tensionPoints) ? (
              <View style={styles.sectionsBlock}>
                <Text style={[styles.sectionLabel, { color: ios.dim }]}>
                  {t('report_sections')}
                </Text>
                {content.tensionPoints
                  .filter((item) => item.source && item.mechanism)
                  .map((item, idx) => (
                    <View key={`tension-${idx}`} style={styles.sectionItem}>
                      <Text style={[styles.sectionHeading, { color: ios.text }]}>
                        {item.source}
                        {item.impactDomain ? ` · ${item.impactDomain}` : ''}
                        {item.currentlyActive ? ' · active' : ''}
                      </Text>
                      <Text style={[styles.sectionBody, { color: ios.secondary }]}>
                        {item.mechanism}
                      </Text>
                    </View>
                  ))}
                {content.dormantPattern ? (
                  <View style={styles.sectionItem}>
                    <Text style={[styles.sectionHeading, { color: ios.text }]}>
                      {t('report_ch5_dormant_pattern')}
                    </Text>
                    <Text style={[styles.sectionBody, { color: ios.secondary }]}>
                      {content.dormantPattern}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {slug === 'ch6_action' && content.immediateAction ? (
              <View style={styles.sectionsBlock}>
                <Text style={[styles.sectionLabel, { color: ios.dim }]}>
                  {t('report_sections')}
                </Text>
                <View style={styles.sectionItem}>
                  <Text style={[styles.sectionHeading, { color: ios.text }]}>
                    {t('report_ch6_immediate_action')}
                    {content.immediateAction.timeframe
                      ? ` · ${t(
                          content.immediateAction.timeframe === 'today'
                            ? 'report_ch6_timeframe_today'
                            : 'report_ch6_timeframe_this_week'
                        )}`
                      : ''}
                  </Text>
                  <Text style={[styles.sectionBody, { color: ios.secondary }]}>
                    {content.immediateAction.description}
                  </Text>
                </View>
                {Array.isArray(content.thirtyDayFocus)
                  ? content.thirtyDayFocus
                      .filter((item) => item.action)
                      .map((item, idx) => (
                        <View key={`focus-${idx}`} style={styles.sectionItem}>
                          <Text style={[styles.sectionHeading, { color: ios.text }]}>
                            {t('report_ch6_thirty_day_focus')}
                            {item.domain ? ` · ${item.domain}` : ''}
                          </Text>
                          <Text style={[styles.sectionBody, { color: ios.secondary }]}>
                            {item.action}
                            {item.rationale ? `\n${item.rationale}` : ''}
                          </Text>
                        </View>
                      ))
                  : null}
                {content.ninetyDayDirection ? (
                  <View style={styles.sectionItem}>
                    <Text style={[styles.sectionHeading, { color: ios.text }]}>
                      {t('report_ch6_ninety_day_direction')}
                      {content.ninetyDayDirection.domain
                        ? ` · ${content.ninetyDayDirection.domain}`
                        : ''}
                    </Text>
                    <Text style={[styles.sectionBody, { color: ios.secondary }]}>
                      {content.ninetyDayDirection.description}
                    </Text>
                  </View>
                ) : null}
                {content.delayItem ? (
                  <View style={styles.sectionItem}>
                    <Text style={[styles.sectionHeading, { color: ios.text }]}>
                      {t('report_ch6_delay_for_now')}
                    </Text>
                    <Text style={[styles.sectionBody, { color: ios.secondary }]}>
                      {content.delayItem.description}
                      {content.delayItem.reason ? `\n${content.delayItem.reason}` : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {Array.isArray(content.sections) && content.sections.length > 0 ? (
              <View style={styles.sectionsBlock}>
                <Text style={[styles.sectionLabel, { color: ios.dim }]}>
                  {t('report_sections')}
                </Text>
                {content.sections.map((s, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable order from server
                  <View key={i} style={styles.sectionItem}>
                    {s.heading ? (
                      <Text style={[styles.sectionHeading, { color: ios.text }]}>{s.heading}</Text>
                    ) : null}
                    {s.body ? (
                      <Text style={[styles.sectionBody, { color: ios.secondary }]}>{s.body}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {Array.isArray(content.highlights) && content.highlights.length > 0 ? (
              <View style={styles.tokensBlock}>
                <Text style={[styles.sectionLabel, { color: ios.dim }]}>
                  {t('report_highlights')}
                </Text>
                {content.highlights.map((h, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable order
                  <Text key={i} style={[styles.tokenText, { color: ios.text }]}>
                    · {h}
                  </Text>
                ))}
              </View>
            ) : null}

            {Array.isArray(content.watchOuts) && content.watchOuts.length > 0 ? (
              <View style={styles.tokensBlock}>
                <Text style={[styles.sectionLabel, { color: ios.dim }]}>
                  {t('report_watch_outs')}
                </Text>
                {content.watchOuts.map((w, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable order
                  <Text key={i} style={[styles.tokenText, { color: ios.secondary }]}>
                    · {w}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* Footer: generated-at only — model name not shown to user */}
            <View style={[styles.metaRow, { borderColor: colors.border }]}>
              <Text style={[styles.metaText, { color: ios.dim }]}>
                {formatGeneratedAt(
                  versionOverride?.generatedAt ?? chapter?.generatedAt ?? null,
                  t('report_generated_at')
                )}
              </Text>
            </View>

            {isPro ? (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => setPerspectiveOpen(true)}
                  style={({ pressed }) => [
                    styles.actionCard,
                    {
                      backgroundColor: pressed ? colors.surface : ios.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.actionRowInner}>
                    <Text
                      style={[styles.actionText, { color: ios.text }]}
                      numberOfLines={1}
                      ellipsizeMode='tail'
                    >
                      {t('report_refresh_button')}
                    </Text>
                    <ChevronRight size={16} color={ios.dim} />
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setHistoryOpen(true)}
                  style={({ pressed }) => [
                    styles.actionCard,
                    {
                      backgroundColor: pressed ? colors.surface : ios.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.actionRowInner}>
                    <Text
                      style={[styles.actionText, { color: ios.text }]}
                      numberOfLines={1}
                      ellipsizeMode='tail'
                    >
                      {t('report_history_drawer_title')}
                    </Text>
                    <ChevronRight size={16} color={ios.dim} />
                  </View>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push('/paywall')}
                style={({ pressed }) => [
                  styles.proHintCard,
                  {
                    backgroundColor: pressed ? colors.surface : ios.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.proHintText, { color: ios.secondary }]}>
                  {t('report_pro_hint')}
                </Text>
                <Text style={[styles.proHintCta, { color: ios.text }]}>
                  {t('report_unlock_pro_cta')} →
                </Text>
              </Pressable>
            )}

            <Text style={[styles.ledger, { color: ios.dim }]}>{t('report_trust_ledger')}</Text>

            {/* Phase C.3 — share this chapter as a card / public URL */}
            {accessible && content && effectiveUserId && slug ? (
              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <ShareChapterButton
                  reportType='fate'
                  reportId={`${effectiveUserId}-${slug}`}
                  title={t(titleKey)}
                  contentJson={JSON.stringify({
                    chapter: slug,
                    title: content.title ?? t(titleKey),
                    summary: content.summary ?? '',
                    sections: content.sections ?? [],
                    highlights: content.highlights ?? [],
                  })}
                />
              </View>
            ) : null}

            {/* AI chat CTA — opens chapter-specific conversation */}
            {accessible ? (
              <AskHexAstralCTA
                marginTop={8}
                marginBottom={32}
                onPress={() =>
                  router.push(`/detail/chat/report/${effectiveUserId}-${slug}` as never)
                }
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <PerspectiveModal
        visible={perspectiveOpen}
        stylePreset={stylePreset}
        onStylePresetChange={setStylePreset}
        value={perspectiveSeed}
        onChange={setPerspectiveSeed}
        styleSeed={styleSeed}
        onStyleSeedChange={setStyleSeed}
        onSubmit={onSubmitReroll}
        onDismiss={() => setPerspectiveOpen(false)}
        isLoading={refreshMut.isPending}
        errorMessage={refreshMut.error?.message ?? null}
        ios={ios}
        borderColor={colors.border}
        bottomInset={bottomInset}
        t={t}
      />

      <HistoryDrawer
        visible={historyOpen}
        onDismiss={() => setHistoryOpen(false)}
        onSelect={(item, label) => {
          setVersionOverride({
            contentJson: item.contentJson,
            generatedAt: item.generatedAt,
            label,
          })
          setHistoryOpen(false)
        }}
        userId={effectiveUserId ?? undefined}
        slug={slug}
        ios={ios}
        borderColor={colors.border}
        bottomInset={bottomInset}
        t={t}
      />
    </SafeAreaView>
  )
}

function formatGeneratedAt(iso: string | null | undefined, prefix: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${prefix} ${yyyy}-${mm}-${dd}`
  } catch {
    return prefix
  }
}

// ---------------------------------------------------------------------------
// Perspective re-roll modal
// ---------------------------------------------------------------------------

interface IosPalette {
  bg: string
  card: string
  sheet: string
  sheetBg: string
  text: string
  secondary: string
  dim: string
  tint: string
  tintFg: string
  accent: string
}

function PerspectiveModal(props: {
  visible: boolean
  stylePreset: ReportStylePreset
  onStylePresetChange: (v: ReportStylePreset) => void
  value: string
  onChange: (v: string) => void
  styleSeed: string
  onStyleSeedChange: (v: string) => void
  onSubmit: () => void
  onDismiss: () => void
  isLoading: boolean
  errorMessage: string | null
  ios: IosPalette
  borderColor: string
  bottomInset: number
  t: (k: TranslationKeys) => string
}) {
  const {
    visible,
    stylePreset,
    onStylePresetChange,
    value,
    onChange,
    styleSeed,
    onStyleSeedChange,
    onSubmit,
    onDismiss,
    isLoading,
    errorMessage,
    ios,
    borderColor,
    bottomInset,
    t,
  } = props

  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['75%'], [])

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  )

  const handleCancel = useCallback(() => {
    sheetRef.current?.close()
  }, [])

  if (!visible) return null

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={!isLoading}
      onClose={onDismiss}
      backgroundStyle={{ backgroundColor: ios.sheetBg }}
      handleIndicatorStyle={{ backgroundColor: ios.dim, opacity: 0.6 }}
      backdropComponent={renderBackdrop}
      keyboardBehavior='interactive'
      keyboardBlurBehavior='restore'
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(20, bottomInset + 12),
        }}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: ios.text }]}>{t('report_refresh_button')}</Text>
          <Pressable onPress={handleCancel} hitSlop={8} disabled={isLoading}>
            <Text style={[styles.sheetCancel, { color: ios.secondary }]}>
              {t('report_perspective_cancel')}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.sectionLabel, { color: ios.dim, marginBottom: 8 }]}>
          {t('report_style_preset_label')}
        </Text>
        <View style={styles.sheetPresetRow}>
          {STYLE_PRESETS.map((preset) => {
            const active = preset === stylePreset
            return (
              <Pressable
                key={preset}
                onPress={() => onStylePresetChange(preset)}
                style={[
                  styles.sheetPresetChip,
                  {
                    borderColor: active ? ios.tint : borderColor,
                    backgroundColor: active ? ios.tint : ios.sheetBg,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? ios.tintFg : ios.text,
                    fontSize: 12,
                    fontWeight: active ? '500' : '400',
                  }}
                >
                  {t(`report_style_preset_${preset}` as TranslationKeys)}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={t('report_perspective_placeholder')}
          placeholderTextColor={ios.dim}
          style={[styles.sheetInput, { color: ios.text, borderColor }]}
          multiline
          maxLength={64}
          editable={!isLoading}
        />
        <TextInput
          value={styleSeed}
          onChangeText={onStyleSeedChange}
          placeholder={t('report_style_seed_placeholder')}
          placeholderTextColor={ios.dim}
          style={[styles.sheetInput, { color: ios.text, borderColor, marginTop: 8 }]}
          multiline
          maxLength={64}
          editable={!isLoading}
        />
        <Text style={[styles.sheetHint, { color: ios.secondary }]}>
          {t('report_regen_chat_hint')}
        </Text>
        {errorMessage ? (
          <Text style={[styles.sheetError, { color: ios.secondary }]}>{errorMessage}</Text>
        ) : null}
        <View style={styles.sheetActions}>
          <Pressable
            onPress={onSubmit}
            disabled={isLoading || (!value.trim() && !styleSeed.trim())}
            style={[
              styles.sheetSubmit,
              {
                backgroundColor: value.trim() || styleSeed.trim() ? ios.tint : ios.dim,
                opacity: isLoading ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.sheetSubmitText, { color: ios.tintFg }]}>
              {isLoading ? t('report_loading') : t('report_perspective_submit')}
            </Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

// ---------------------------------------------------------------------------
// History drawer
// ---------------------------------------------------------------------------

function HistoryDrawer(props: {
  visible: boolean
  onDismiss: () => void
  onSelect: (item: { contentJson: unknown; generatedAt: string | null }, label: string) => void
  userId: string | undefined
  slug: ChapterSlug
  ios: IosPalette
  borderColor: string
  bottomInset: number
  t: (k: TranslationKeys) => string
}) {
  const { visible, onDismiss, onSelect, userId, slug, ios, borderColor, bottomInset, t } = props
  const { data, isLoading } = useChapterHistoryQuery(userId, slug, visible)

  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['50%', '80%'], [])

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  )

  const handleCancel = useCallback(() => {
    sheetRef.current?.close()
  }, [])

  if (!visible) return null

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onDismiss}
      backgroundStyle={{ backgroundColor: ios.sheetBg }}
      handleIndicatorStyle={{ backgroundColor: ios.dim, opacity: 0.6 }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(20, bottomInset + 12),
        }}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: ios.text }]}>
            {t('report_history_drawer_title')}
          </Text>
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Text style={[styles.sheetCancel, { color: ios.secondary }]}>
              {t('report_perspective_cancel')}
            </Text>
          </Pressable>
        </View>
        {isLoading ? (
          <Text style={[styles.loading, { color: ios.secondary }]}>{t('report_loading')}</Text>
        ) : data?.items.length ? (
          data.items.map((item, idx) => {
            const versionNum = data.items.length - idx
            const label = t('report_version_label').replace('{n}', String(versionNum))
            const c = (item.contentJson as ChapterContent | null) ?? null
            return (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item, label)}
                style={({ pressed }) => [
                  styles.historyItem,
                  { borderColor, backgroundColor: pressed ? ios.bg : 'transparent' },
                ]}
              >
                <View style={styles.historyRow}>
                  <View style={styles.historyContent}>
                    <Text style={[styles.historyMeta, { color: ios.dim }]}>
                      {label}
                      {'  ·  '}
                      {formatGeneratedAt(item.generatedAt, '')}
                      {item.perspectiveSeed ? `  ·  ${item.perspectiveSeed}` : ''}
                    </Text>
                    {c?.summary ? (
                      <Text style={[styles.historySummary, { color: ios.text }]} numberOfLines={3}>
                        {c.summary}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={14} color={ios.dim} />
                </View>
              </Pressable>
            )
          })
        ) : (
          <Text style={[styles.loading, { color: ios.secondary }]}>
            {t('report_history_empty')}
          </Text>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 120 },
  back: { marginBottom: 12 },
  backText: { fontSize: 14, fontWeight: '300' },
  headerStripe: { width: 36, height: 3, marginBottom: 16 },
  chapterTitle: { fontSize: 30, fontWeight: '600', letterSpacing: -0.5, lineHeight: 38 },
  chapterSubtitle: { fontSize: 15, fontWeight: '300', marginTop: 8, marginBottom: 32 },
  loading: { fontSize: 13, marginVertical: 24, textAlign: 'center' },
  error: { fontSize: 13, marginVertical: 24, textAlign: 'center' },
  summaryBlock: { marginTop: 28 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  summaryText: { fontSize: 17, fontWeight: '400', lineHeight: 28 },
  sectionsBlock: { marginTop: 36 },
  sectionItem: { marginBottom: 28 },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  sectionBody: { fontSize: 15, lineHeight: 26, fontWeight: '300' },
  tokensBlock: { marginTop: 32 },
  tokenText: { fontSize: 14, lineHeight: 24, fontWeight: '300', marginBottom: 6 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 36,
    borderTopWidth: 0.5,
  },
  metaText: { fontSize: 11, fontWeight: '300' },
  actions: { marginTop: 24, gap: 8 },
  actionCard: {
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: { flex: 1, fontSize: 15, fontWeight: '400' },
  proHintCard: {
    marginTop: 24,
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  proHintText: { fontSize: 12, lineHeight: 18, fontWeight: '300' },
  proHintCta: { fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },
  ledger: { fontSize: 11, textAlign: 'center', marginTop: 32, fontWeight: '300', lineHeight: 16 },
  lockedCard: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 24,
    marginTop: 32,
    alignItems: 'center',
    gap: 12,
  },
  lockedTitle: { fontSize: 17, fontWeight: '500' },
  lockedBody: { fontSize: 13, fontWeight: '300', textAlign: 'center', lineHeight: 20 },
  tintButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 0,
  },
  tintButtonText: { fontSize: 14, fontWeight: '500' },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '500' },
  sheetCancel: { fontSize: 14, fontWeight: '400' },
  sheetInput: {
    fontSize: 15,
    fontWeight: '300',
    borderWidth: 0.5,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  sheetError: { fontSize: 12, fontWeight: '300', marginTop: 8 },
  sheetHint: { fontSize: 11, fontWeight: '300', lineHeight: 16, marginTop: 8 },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
  },
  sheetPresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sheetPresetChip: {
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 0,
  },
  sheetSubmit: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 0,
  },
  sheetSubmitText: { fontSize: 14, fontWeight: '500' },
  versionBanner: {
    borderWidth: 0.5,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionBannerText: { fontSize: 12, fontWeight: '400' },
  versionBannerHint: { fontSize: 12, fontWeight: '400' },
  historyItem: {
    paddingVertical: 14,
    borderTopWidth: 0.5,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyContent: { flex: 1 },
  historyMeta: { fontSize: 11, fontWeight: '300', marginBottom: 6 },
  historySummary: { fontSize: 14, lineHeight: 20, fontWeight: '300' },
})
