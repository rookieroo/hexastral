import { useTheme } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LANTAI_STARTER_TEMPLATES } from '@/lib/config-gen'
import { useSatelliteI18n } from '@/lib/i18n'

export default function LantaiTemplatesScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t, templateLabel } = useSatelliteI18n()

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
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '600' }}>
        {t('templatesTitle')}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 15 }}>{t('templatesHint')}</Text>

      {LANTAI_STARTER_TEMPLATES.map((tpl) => (
        <Pressable
          key={tpl.id}
          onPress={() => router.push(`/config/new?template=${tpl.id}`)}
          style={{
            borderWidth: 0.5,
            borderRadius: 0,
            borderColor: colors.separator,
            backgroundColor: colors.card,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 16 }}>{templateLabel(tpl.id)}</Text>
          </View>
          <ChevronRight color={colors.dim} size={18} />
        </Pressable>
      ))}
    </ScrollView>
  )
}
