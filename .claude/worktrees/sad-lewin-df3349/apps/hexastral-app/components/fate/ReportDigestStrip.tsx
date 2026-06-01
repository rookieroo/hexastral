/**
 * ReportDigestStrip — summary cards for the first 3 free report chapters.
 * Renders only when at least one chapter has been generated (hasCurrent).
 * Tap navigates to the full chapter view.
 */

import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { FateHomeInsetCard } from '@/components/fate/FateHomeInsetCard'
import { useAuth } from '@/lib/auth'
import { useChapterQuery } from '@/lib/hooks/useChapterQuery'
import {
  type ChapterSlug,
  type ChapterManifestEntry,
  useReportManifestQuery,
} from '@/lib/hooks/useReportManifestQuery'
import { useUserQuery } from '@/lib/hooks/useUserQuery'
import type { TranslationKeys } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'

const FREE_SLUGS: ChapterSlug[] = ['ch1_personality', 'ch2_dimensions_static', 'ch3_stellar']

const TITLE_KEYS: Record<ChapterSlug, TranslationKeys> = {
  ch1_personality: 'report_ch1_title',
  ch2_dimensions_static: 'report_ch2_title',
  ch2_dimensions_dynamic: 'report_ch2_title',
  ch3_stellar: 'report_ch3_title',
  ch4_timeline: 'report_ch4_title',
  ch5_hidden: 'report_ch5_title',
  ch6_action: 'report_ch6_title',
}

interface ChapterContent {
  summary?: string
  highlights?: string[]
}

export function ReportDigestStrip() {
  const { userId } = useAuth()
  const { data: user } = useUserQuery(userId)
  const { data: manifest } = useReportManifestQuery(user?.id ?? userId)
  const { t } = useI18n()
  const ios = useIosPalette()
  const router = useRouter()

  const available = manifest?.chapters.filter(
    (ch) => FREE_SLUGS.includes(ch.slug) && ch.hasCurrent
  )

  const displayed = available?.slice(0, 2)
  if (!displayed || displayed.length === 0) return null

  return (
    <FateHomeInsetCard marginTop={16}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: ios.secondary,
            fontSize: 11,
            fontWeight: '300',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {t('fate_report_digest_title')}
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/report' as never)} hitSlop={8}>
          <Text style={{ color: ios.text, fontSize: 11, fontWeight: '500', letterSpacing: 0.5 }}>
            {t('fate_recent_see_all')}
          </Text>
        </Pressable>
      </View>
      <View style={{ gap: 0 }}>
        {displayed.map((entry, idx) => (
          <DigestCard key={entry.slug} entry={entry} isLast={idx === displayed.length - 1} />
        ))}
      </View>
    </FateHomeInsetCard>
  )
}

function DigestCard({ entry, isLast }: { entry: ChapterManifestEntry; isLast: boolean }) {
  const { userId } = useAuth()
  const { data: user } = useUserQuery(userId)
  const { data: chapter } = useChapterQuery(user?.id ?? userId, entry.slug, entry.hasCurrent)
  const { t } = useI18n()
  const ios = useIosPalette()
  const { colors } = useTheme()
  const router = useRouter()

  const content = (chapter?.contentJson as ChapterContent | undefined) ?? null

  if (!content?.summary) return null

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/report/${entry.slug}` as never)}
      style={({ pressed }) => ({
        paddingVertical: 16,
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ flex: 1, color: ios.text, fontSize: 14, fontWeight: '500' }}>
          {t(TITLE_KEYS[entry.slug])}
        </Text>
        <ChevronRight size={14} color={ios.dim} />
      </View>
      <Text
        style={{ color: ios.secondary, fontSize: 13, lineHeight: 20, fontWeight: '300' }}
        numberOfLines={1}
      >
        {content.summary}
      </Text>
    </Pressable>
  )
}
