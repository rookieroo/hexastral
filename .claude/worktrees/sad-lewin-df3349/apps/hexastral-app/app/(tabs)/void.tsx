/**
 * ◯ Oracle Tab — Quick divination questions in 4 categories
 *
 * SELF / LOVE / WORK / MOOD — each a grouped iOS card section.
 * Category headers show Lucide icons for visual breathing room.
 * Tapping a question pushes /oracle-reading (stack) so swipe-back works.
 */

import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import { Briefcase, ChevronRight, Cloud, Heart, User } from 'lucide-react-native'
import { SectionList, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getIsPro, useAuth } from '@/lib/auth'
import { useUserQuery } from '@/lib/hooks/useUserQuery'
import type { TranslationKeys } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import { useFreeQuotaQuery } from '@/lib/ux/useQuota'

type VoidCategory = 'self' | 'love' | 'work' | 'mood'

const CATEGORY_ICONS: Record<VoidCategory, LucideIcon> = {
  self: User,
  love: Heart,
  work: Briefcase,
  mood: Cloud,
}

const CATEGORIES: VoidCategory[] = ['self', 'love', 'work', 'mood']

interface QuestionItem {
  questionKey: TranslationKeys
  category: VoidCategory
}

export default function VoidScreen() {
  const { colors: _colors, isDark } = useTheme()
  const { t } = useI18n()
  const router = useRouter()
  const { userId } = useAuth()

  const ios = {
    ...useIosPalette(),
    chevron: isDark ? '#636366' : '#C7C7CC',
    icon: isDark ? '#AEAEB2' : '#48484A',
  }

  const freeQuota = useFreeQuotaQuery(userId)
  const userQuery = useUserQuery(userId)
  const isPro = getIsPro(userQuery.data ?? null)

  const handleQuestionPress = (question: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Push to a full-screen stack route so swipe-back (gesture) works
    router.push({ pathname: '/oracle-reading', params: { question } })
  }

  const handleHeroPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({ pathname: '/oracle-reading' })
  }

  const sections = CATEGORIES.map((category) => ({
    category,
    title: t(`void_${category}` as TranslationKeys),
    Icon: CATEGORY_ICONS[category],
    data: ([1, 2, 3] as const).map((i) => ({
      questionKey: `void_${category}_q${i}` as TranslationKeys,
      category,
    })),
  }))

  type Section = (typeof sections)[number]

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: ios.bg }}>
      {/* Page header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: ios.sectionLabel,
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          {t('tab_void')}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.questionKey}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        ListHeaderComponent={
          <TouchableOpacity
            onPress={handleHeroPress}
            activeOpacity={0.7}
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              backgroundColor: ios.card,
              borderWidth: 0.5,
              borderColor: ios.separator,
              paddingVertical: 18,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: ios.text,
                  marginBottom: 3,
                }}
              >
                {t('void_hero_title')}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '300',
                  color: ios.secondary,
                  lineHeight: 18,
                }}
              >
                {t('void_hero_subtitle')}
              </Text>
              {/* Free monthly quota badge — hidden for Pro */}
              {!isPro && freeQuota.data != null && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '400',
                    color: ios.accent,
                    marginTop: 6,
                  }}
                >
                  {freeQuota.data.divination.remaining > 0
                    ? t('void_free_quota').replace(
                        '{{n}}',
                        String(
                          freeQuota.data.divination.remaining +
                            freeQuota.data.divination.creditsRemaining
                        )
                      )
                    : freeQuota.data.divination.creditsRemaining > 0
                      ? t('void_free_quota').replace(
                          '{{n}}',
                          String(freeQuota.data.divination.creditsRemaining)
                        )
                      : null}
                </Text>
              )}
            </View>
            <ChevronRight size={16} color={ios.chevron} strokeWidth={1.2} />
          </TouchableOpacity>
        }
        renderSectionHeader={({ section }: { section: Section }) => {
          const Icon = section.Icon
          return (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 20,
                paddingTop: 28,
                paddingBottom: 8,
              }}
            >
              <Icon size={13} color={ios.icon} strokeWidth={1.5} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: ios.sectionLabel,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                {section.title}
              </Text>
            </View>
          )
        }}
        renderSectionFooter={() => <View style={{ height: 2 }} />}
        renderItem={({
          item,
          index,
          section,
        }: {
          item: QuestionItem
          index: number
          section: Section
        }) => {
          const _isFirst = index === 0
          const isLast = index === section.data.length - 1
          return (
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: ios.card,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                onPress={() => handleQuestionPress(t(item.questionKey))}
                activeOpacity={0.55}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderBottomWidth: isLast ? 0 : 0.5,
                  borderBottomColor: ios.separator,
                  minHeight: 52,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: '300',
                    color: ios.text,
                    lineHeight: 22,
                    marginRight: 8,
                  }}
                >
                  {t(item.questionKey)}
                </Text>
                <ChevronRight size={16} color={ios.chevron} strokeWidth={1.2} />
              </TouchableOpacity>
            </View>
          )
        }}
      />
    </SafeAreaView>
  )
}
