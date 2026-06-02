/**
 * FateRecentStrip — horizontal chips for recent oracle or daily signals.
 * Renders only when there is data; "See all" opens History with the right scope.
 */

import type { Locale } from '@zhop/astro-i18n'
import type { DivinationRecord } from '@zhop/hexastral-client'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { FateHomeInsetCard } from '@/components/fate/FateHomeInsetCard'
import { formatDate } from '@/lib/format'
import { historyHref } from '@/lib/historyPrefs'
import { useSignalHistoryQuery } from '@/lib/hooks/useSignalHistoryQuery'
import { useYichingHistoryQuery } from '@/lib/hooks/useYichingHistoryQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

const MAX_CHIPS = 3

function sortYiNewestFirst(records: DivinationRecord[]): DivinationRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function FateRecentStrip({ userId }: { userId: string | null | undefined }) {
  const { t, locale } = useI18n()
  const ios = useIosPalette()
  const router = useRouter()
  const astroLocale = locale as Locale

  const yiQuery = useYichingHistoryQuery(userId)
  const sigQuery = useSignalHistoryQuery(userId, 7)

  const { chips, historyScope } = useMemo(() => {
    const yi = sortYiNewestFirst(yiQuery.data ?? []).slice(0, MAX_CHIPS)
    if (yi.length > 0) {
      return {
        chips: yi.map((r) => ({
          key: r.id,
          title: r.hexagramName || r.question,
          subtitle:
            r.method === 'liuyao'
              ? t('history_method_liuyao')
              : formatDate(r.createdAt, astroLocale),
        })),
        historyScope: 'oracle' as const,
      }
    }
    const items = [...(sigQuery.data?.items ?? [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const sliced = items.slice(0, MAX_CHIPS)
    if (sliced.length === 0) {
      return {
        chips: [] as { key: string; title: string; subtitle: string }[],
        historyScope: 'daily' as const,
      }
    }
    return {
      chips: sliced.map((it) => ({
        key: it.signalId,
        title: it.content.headline,
        subtitle: it.date,
      })),
      historyScope: 'daily' as const,
    }
  }, [yiQuery.data, sigQuery.data, t, astroLocale])

  if (chips.length === 0) {
    return (
      <FateHomeInsetCard marginTop={20} style={{ paddingTop: 14, paddingBottom: 14 }}>
        <Text
          style={{
            color: ios.secondary,
            fontSize: 11,
            fontWeight: '300',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          {t('fate_recent_section_title')}
        </Text>
        <Text
          style={{
            color: ios.dim,
            fontSize: 13,
            fontWeight: '300',
            lineHeight: 18,
          }}
        >
          {t('fate_recent_empty_hint')}
        </Text>
      </FateHomeInsetCard>
    )
  }

  return (
    <FateHomeInsetCard marginTop={20} style={{ paddingTop: 14, paddingBottom: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: ios.secondary,
            fontSize: 11,
            fontWeight: '300',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          {t('fate_recent_section_title')}
        </Text>
        <Pressable onPress={() => router.push(historyHref(historyScope) as never)} hitSlop={8}>
          <Text style={{ color: ios.text, fontSize: 11, fontWeight: '500', letterSpacing: 0.5 }}>
            {t('fate_recent_see_all')}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {chips.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => router.push(historyHref(historyScope) as never)}
            style={({ pressed }) => ({
              width: 156,
              paddingVertical: 14,
              paddingHorizontal: 12,
              borderWidth: 0.5,
              borderColor: ios.separator,
              backgroundColor: pressed ? ios.card : ios.cardElevated,
            })}
          >
            <Text
              style={{ color: ios.text, fontSize: 13, fontWeight: '500', lineHeight: 18 }}
              numberOfLines={2}
            >
              {c.title}
            </Text>
            {c.subtitle ? (
              <Text style={{ color: ios.secondary, fontSize: 10, marginTop: 6 }} numberOfLines={1}>
                {c.subtitle}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </FateHomeInsetCard>
  )
}
