/**
 * DDL 欢迎页 — Web → App 衔接成功后展示
 *
 * 路由参数:
 *   ?mode=personal|pairing
 *   &dayMaster=甲
 *   &score=85
 *
 * 用法: router.push('/ddl-welcome?mode=personal&dayMaster=甲')
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Sparkles } from 'lucide-react-native'
import { Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function DDLWelcomeScreen() {
  const { colors } = useTheme()
  const { t } = useI18n()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    mode?: string
    dayMaster?: string
    score?: string
  }>()

  const mode = params.mode as 'personal' | 'pairing' | undefined
  const dayMaster = params.dayMaster
  const score = params.score

  // Build headline based on mode
  let headline: string
  if (mode === 'personal' && dayMaster) {
    headline = t('ddl_welcome_personal').replace('{dayMaster}', dayMaster)
  } else if (mode === 'pairing' && score) {
    headline = t('ddl_welcome_pairing').replace('{score}', score)
  } else {
    headline = t('ddl_welcome_generic')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.55],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.inkWash,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <Sparkles size={28} color={colors.accent} strokeWidth={1.5} />
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '300',
            letterSpacing: 3,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          {t('ddl_welcome_title')}
        </Text>

        {/* Headline */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: '500',
            color: colors.text,
            textAlign: 'center',
            lineHeight: 30,
            marginBottom: 12,
          }}
        >
          {headline}
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            maxWidth: 280,
            marginBottom: 40,
          }}
        >
          {t('ddl_welcome_subtitle')}
        </Text>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => {
            router.dismiss()
            router.replace('/(tabs)')
          }}
          activeOpacity={0.8}
          style={{
            width: '100%',
            backgroundColor: colors.primary,
            paddingVertical: 16,
            borderRadius: 0,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: '500',
              color: colors.background,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {t('ddl_welcome_cta')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
