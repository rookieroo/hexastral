import { useTheme } from '@zhop/core-ui'
import { getPortfolioUserId } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronRight, Plus } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { type LantaiConfigRow, listConfigs } from '@/lib/api'
import { useSatelliteI18n } from '@/lib/i18n'

export default function LantaiSlotsScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t, templateLabel } = useSatelliteI18n()
  const [configs, setConfigs] = useState<LantaiConfigRow[]>([])
  const [signedIn, setSignedIn] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const userId = await getPortfolioUserId()
        setSignedIn(Boolean(userId))
        if (!userId) {
          setConfigs([])
          return
        }
        setConfigs(await listConfigs())
      })()
    }, [])
  )

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.md,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '600' }}>{t('appName')}</Text>
      <Text style={{ color: colors.secondary, fontSize: 15 }}>{t('subtitle')}</Text>
      <Text style={{ color: colors.dim, fontSize: 13 }}>{t('slotsFreeCap')}</Text>

      <Pressable
        onPress={() => router.push(signedIn ? '/config/new' : '/connect')}
        style={{
          borderWidth: 0.5,
          borderRadius: 0,
          borderColor: colors.separator,
          backgroundColor: colors.card,
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16 }}>{t('slotsAdd')}</Text>
        <Plus color={colors.text} size={18} />
      </Pressable>

      {!signedIn ? (
        <Text style={{ color: colors.secondary, marginTop: spacing.md }}>{t('signedOut')}</Text>
      ) : null}

      {signedIn && configs.length === 0 ? (
        <Text style={{ color: colors.secondary, marginTop: spacing.md }}>{t('slotsEmpty')}</Text>
      ) : null}

      {configs.map((row) => (
        <Pressable
          key={row.id}
          onPress={() => router.push(`/config/${row.id}`)}
          style={{
            borderWidth: 0.5,
            borderRadius: 0,
            borderColor: colors.separator,
            backgroundColor: colors.card,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 16 }}>{row.command.name}</Text>
            <Text style={{ color: colors.secondary, fontSize: 13 }}>
              {row.command.templateId === 'custom'
                ? t('templateCustom')
                : templateLabel(row.command.templateId)}
            </Text>
          </View>
          <ChevronRight color={colors.dim} size={18} />
        </Pressable>
      ))}
    </ScrollView>
  )
}
