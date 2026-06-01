/**
 * Bond detail / synastry report.
 *
 * Loads /api/bonds/:id via useSynastryReport, then renders:
 *   - Header: 2 names + relationship + compatibility score
 *   - If report has chapters: ChapterPager (horizontal swipe across 6 chapters)
 *   - Else: fall back to single-page summary card with goldenLine if present
 *
 * Status 202 → "generating" UI; on 4xx/5xx → error state + retry.
 */

import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import {
  ChapterPager,
  CompatibilityScore,
  YuanSeal,
  useSynastryReport,
} from '@zhop/scenario-yuan'
import { yuanLight, yuanType, yuanSpacing, yuanPresets } from '@zhop/hexastral-tokens/yuan'

export default function BondDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { detail, isLoading, isGenerating, error, refetch, chapters } = useSynastryReport(id ?? null)
  const [chapterIndex, setChapterIndex] = useState<number>(0)

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={yuanLight.accent} />
        </View>
      </SafeAreaView>
    )
  }

  if (isGenerating) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: yuanSpacing.lg }}>
          <YuanSeal mode="breathing" size={96} />
          <Text style={[yuanType.body, { color: yuanLight.textSecondary }]}>合盘中…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: yuanSpacing.lg }}>
          <Text style={[yuanType.body, { color: yuanLight.seal, textAlign: 'center' }]}>
            {error?.message ?? 'Bond not found'}
          </Text>
          <Pressable onPress={() => void refetch()} hitSlop={12} style={{ marginTop: yuanSpacing.md }}>
            <Text style={yuanPresets.ctaText}>Retry →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // Chapter-based report (v2): horizontal pager
  if (chapters && chapters.length > 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
        <View style={{ paddingHorizontal: yuanSpacing.screenH, paddingVertical: yuanSpacing.md, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft color={yuanLight.text} size={24} strokeWidth={1.2} />
          </Pressable>
          <Text style={[yuanType.caption, { color: yuanLight.textSecondary, marginLeft: yuanSpacing.md }]}>
            {detail.targetName} · {detail.relationshipLabel}
          </Text>
        </View>
        <ChapterPager
          report={{
            id: detail.id,
            bondId: detail.id,
            generatedAt: detail.createdAt,
            chapters,
            headline: detail.archetypeTagline ?? '',
          }}
          currentIndex={chapterIndex}
          onIndexChange={setChapterIndex}
          onShareChapter={(idx) => {
            // TODO: invoke ShareableChapterCard → view-shot → expo-sharing
            console.log('Share chapter', idx)
          }}
        />
      </SafeAreaView>
    )
  }

  // V1 fallback — single-page summary
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: yuanSpacing.screenH, paddingTop: yuanSpacing.lg, paddingBottom: yuanSpacing.xxl }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: 'flex-start' }}>
          <ChevronLeft color={yuanLight.text} size={24} strokeWidth={1.2} />
        </Pressable>

        <View style={{ alignItems: 'center', marginTop: yuanSpacing.lg, gap: yuanSpacing.sm }}>
          <Text style={[yuanType.seal, { color: yuanLight.textMuted }]}>{detail.relationshipLabel}</Text>
          <Text style={[yuanType.title, { color: yuanLight.text }]}>{detail.targetName}</Text>
        </View>

        {detail.score != null && (
          <View style={{ alignItems: 'center', marginTop: yuanSpacing.xl }}>
            <CompatibilityScore score={detail.score} label={detail.grade ?? undefined} />
          </View>
        )}

        {detail.archetypeName && (
          <View style={{ marginTop: yuanSpacing.xl, gap: yuanSpacing.sm }}>
            <Text style={[yuanType.caption, { color: yuanLight.accent, letterSpacing: 4 }]}>
              {detail.archetypeCategory?.toUpperCase()}
            </Text>
            <Text style={[yuanType.heading, { color: yuanLight.text }]}>{detail.archetypeName}</Text>
            {detail.archetypeTagline && (
              <Text style={[yuanType.body, { color: yuanLight.textSecondary }]}>
                {detail.archetypeTagline}
              </Text>
            )}
          </View>
        )}

        {detail.interpretation?.overview && (
          <View style={{ marginTop: yuanSpacing.xl }}>
            <Text style={[yuanType.body, { color: yuanLight.text }]}>
              {detail.interpretation.overview}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
