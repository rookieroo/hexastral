/**
 * Report TOC — table of contents for the 6-chapter "命书".
 *
 * Reads /api/report manifest. Renders one row per chapter with:
 *   - Title (locale string)
 *   - Static / Dynamic badge
 *   - Free / Pro lock indicator
 *   - Generated-at hint (or "not yet generated")
 *   - Version count badge (if Pro and >1)
 *
 * Tap → /report/[slug]. Locked chapters open paywall instead.
 */

import { router, Stack, useLocalSearchParams } from 'expo-router'
import { Lock } from 'lucide-react-native'
import { Fragment, useCallback } from 'react'
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/ui/BackButton'
import { useAuth } from '@/lib/auth'
import { type ChapterSlug, useReportManifestQuery } from '@/lib/hooks/useReportManifestQuery'
import { useUserQuery } from '@/lib/hooks/useUserQuery'
import { type TranslationKeys, useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

const CHAPTER_TITLE_KEYS: Record<ChapterSlug, TranslationKeys> = {
  ch1_personality: 'report_ch1_title',
  ch2_dimensions_static: 'report_ch2_title',
  ch2_dimensions_dynamic: 'report_ch2_title',
  ch3_stellar: 'report_ch3_title',
  ch4_timeline: 'report_ch4_title',
  ch5_hidden: 'report_ch5_title',
  ch6_action: 'report_ch6_title',
}

/** 天干 — Heavenly Stems as chapter watermarks. Each stem carries elemental
 * resonance matching the chapter's domain: 甲(Yang Wood) opens the book,
 * 己(Yin Earth) stabilises the action guidance. */
const STEM_WATERMARKS = ['甲', '乙', '丙', '丁', '戊', '己'] as const

const SCREEN_WIDTH = Dimensions.get('window').width
// 2-column grid: 20px outer padding each side, 8px column gap → each card width
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2

export default function ReportTocScreen() {
  const { t } = useI18n()
  const { colors, isDark } = useTheme()
  const params = useLocalSearchParams<{ from?: string; batch?: string }>()
  const { userId } = useAuth()
  const { data: user } = useUserQuery(userId)
  const { data: manifest, isLoading } = useReportManifestQuery(user?.id ?? userId)

  const ios = {
    bg: isDark ? '#09090B' : '#FAFAFA',
    card: isDark ? '#18181B' : '#FFFFFF',
    text: isDark ? '#FAFAFA' : '#09090B',
    secondary: isDark ? '#A1A1AA' : '#71717A',
    dim: isDark ? '#52525B' : '#A1A1AA',
    border: isDark ? '#27272A' : '#E4E4E7',
  }

  const onPressChapter = useCallback((entry: { slug: ChapterSlug; accessible: boolean }) => {
    if (!entry.accessible) {
      router.push('/paywall')
      return
    }
    router.push(`/report/${entry.slug}` as never)
  }, [])

  const chapters = (
    manifest?.chapters.filter((entry) => {
      if (manifest.isPro && entry.slug === 'ch2_dimensions_static') return false
      if (!manifest.isPro && entry.slug === 'ch2_dimensions_dynamic') return false
      return true
    }) ?? []
  ).sort((a, b) => {
    if (!params.batch) return 0
    const am = a.generationBatchId === params.batch ? 1 : 0
    const bm = b.generationBatchId === params.batch ? 1 : 0
    return bm - am
  })

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: ios.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={chapters}
        keyExtractor={(item) => item.slug}
        numColumns={2}
        contentContainerStyle={styles.scroll}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Fragment>
            {params.from === 'fate' ? (
              <View style={{ marginBottom: 12 }}>
                <BackButton
                  onPress={() => router.replace('/(tabs)' as never)}
                  style={{ paddingHorizontal: 0, paddingVertical: 8 }}
                />
              </View>
            ) : null}
            <Text style={[styles.title, { color: ios.text }]}>{t('report_toc_title')}</Text>
          </Fragment>
        }
        ListFooterComponent={
          <Text style={[styles.ledger, { color: ios.dim }]}>{t('report_trust_ledger')}</Text>
        }
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.loading, { color: ios.secondary }]}>{t('report_loading')}</Text>
          ) : null
        }
        renderItem={({ item: entry, index: idx }) => {
          const titleKey = CHAPTER_TITLE_KEYS[entry.slug]
          const locked = !entry.accessible
          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onPressChapter(entry)}
              style={[
                styles.card,
                {
                  width: CARD_WIDTH,
                  backgroundColor: ios.card,
                  borderColor: ios.border,
                  opacity: locked ? 0.8 : 1,
                },
              ]}
            >
              {/* Watermark — 天干 stem */}
              <Text style={[styles.watermark, { color: ios.dim }]}>{STEM_WATERMARKS[idx]}</Text>

              {/* Lock badge */}
              {locked && (
                <View style={styles.lockBadge}>
                  <Lock size={10} color={ios.secondary} strokeWidth={1.5} />
                  <Text style={[styles.lockText, { color: ios.secondary }]}>PRO</Text>
                </View>
              )}

              {/* Title */}
              <Text style={[styles.cardTitle, { color: ios.text }]} numberOfLines={2}>
                {t(titleKey)}
              </Text>

              {/* Meta */}
              <Text style={[styles.cardMeta, { color: ios.secondary }]} numberOfLines={1}>
                {entry.hasCurrent
                  ? formatGeneratedAt(entry.generatedAt, t('report_generated_at'))
                  : t('report_no_current')}
              </Text>
              {entry.versions > 1 && manifest?.isPro ? (
                <Text style={[styles.cardVersions, { color: ios.dim }]}>
                  {entry.versions} {t('report_chapter_versions')}
                </Text>
              ) : null}
            </TouchableOpacity>
          )
        }}
      />
    </SafeAreaView>
  )
}

function formatGeneratedAt(iso: string | null, prefix: string): string {
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  columnWrapper: { gap: 8, marginBottom: 8 },
  title: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  loading: { fontSize: 13, marginBottom: 12 },
  card: {
    borderWidth: 0.5,
    borderRadius: 0,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 14,
    overflow: 'hidden',
    minHeight: 110,
  },
  watermark: {
    position: 'absolute',
    bottom: -8,
    right: 6,
    fontSize: 52,
    fontWeight: '300',
    opacity: 0.07,
    fontVariant: ['tabular-nums'],
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  lockText: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    marginBottom: 8,
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: '300',
    lineHeight: 15,
  },
  cardVersions: {
    fontSize: 10,
    fontWeight: '300',
    marginTop: 4,
  },
  ledger: { fontSize: 11, textAlign: 'center', marginTop: 20, fontWeight: '300' },
})
