/**
 * Full reading archive — swipe-delete list for items beyond the home preview.
 */

import { useTheme } from '@zhop/core-ui'
import { deletePortfolioReading, fetchReadings, type PortfolioReadingItem } from '@zhop/portfolio-client'
import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { HistoryReadingRow } from '@/components/HistoryReadingRow'
import { XingqiLoader } from '@/components/XingqiLoader'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { formReadingListTitle, homeArchiveCopy, readingLocaleBadge } from '@/lib/living-copy'
import { resolveLocale } from '@/lib/i18n'
import { isCjkZh, pickZh } from '@/lib/locale-zh'
import { deleteReadingPhotoFolder } from '@/lib/reading-photos'
import { clearLastReadingPhotoSnapshot } from '@/lib/reading-photo-stamp'

export default function ArchiveScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const copy = homeArchiveCopy(locale)
  const [items, setItems] = useState<PortfolioReadingItem[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const hist = await fetchReadings(PORTFOLIO_TARGET_APP)
      setItems(hist.readings ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload])
  )

  const confirmDelete = (item: PortfolioReadingItem) => {
    Alert.alert(
      s('删除解读？', '刪除解讀？', 'Delete reading?'),
      s(
        '将从账号中永久删除此条形气解读，无法恢复。',
        '將從帳號中永久刪除此條形氣解讀，無法恢復。',
        'Permanently removes this form reading from your account.'
      ),
      [
        { text: s('取消', '取消', 'Cancel'), style: 'cancel' },
        {
          text: s('删除', '刪除', 'Delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deletePortfolioReading(PORTFOLIO_TARGET_APP, item.id)
                await deleteReadingPhotoFolder(item.id)
                await clearLastReadingPhotoSnapshot()
                await reload()
              } catch {
                Alert.alert(s('删除失败', '刪除失敗', 'Delete failed'))
              }
            })()
          },
        },
      ]
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole='button'
          accessibilityLabel={s('返回', '返回', 'Back')}
        >
          <ChevronLeft size={24} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', flex: 1 }}>
          {copy.archiveTitle}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.sm,
          flexGrow: 1,
        }}
      >
        {items.length > 0 ? (
          <Text style={{ color: colors.dim, fontSize: 11, marginBottom: 4, lineHeight: 16 }}>
            {copy.swipeHint}
          </Text>
        ) : null}

        {loading ? (
          <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center' }}>
            <XingqiLoader label={s('加载中', '載入中', 'Loading')} />
          </View>
        ) : null}

        {!loading && items.length === 0 ? (
          <View
            style={{
              flex: 1,
              minHeight: 220,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing.xl,
            }}
          >
            <Text style={{ color: colors.dim, fontSize: 13 }}>
              {s('尚无解读', '尚無解讀', 'No readings yet')}
            </Text>
          </View>
        ) : null}

        {items.map((item, index) => {
          const title = formReadingListTitle(locale)
          const localeBadge = readingLocaleBadge(item.locale)
          const dateLabel = item.createdAt?.slice(0, 10) ?? ''
          const meta = [s('形气', '形氣', 'Form'), dateLabel, localeBadge].filter(Boolean).join(' · ')
          return (
            <HistoryReadingRow
              key={item.id}
              title={title}
              meta={meta}
              onPress={() =>
                router.push({
                  pathname: '/result',
                  params: { readingId: item.id },
                } as never)
              }
              onDelete={() => confirmDelete(item)}
              colors={{
                text: colors.text,
                dim: colors.dim,
                accent: colors.accent,
                separator: colors.separator,
                bg: colors.bg,
              }}
              spacing={spacing}
              showTopBorder={index === 0}
              deleteLabel={s('删除', '刪除', 'Delete')}
            />
          )
        })}
      </ScrollView>
    </View>
  )
}
