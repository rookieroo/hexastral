import { useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/ui/BackButton'
import { LOCALE_NAMES, useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import { hapticSelection } from '@/lib/ux/haptics'

export default function LanguageScreen() {
  const { colors, isDark } = useTheme()
  const { locale, changeLocale, locales, t } = useI18n()
  const router = useRouter()

  const ios = useIosPalette()

  function handleSelect(loc: (typeof locales)[number]) {
    if (loc !== locale) {
      changeLocale(loc)
      hapticSelection()
    }
    router.back()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      {/* Back button */}
      <BackButton />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section label */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: ios.sectionLabel,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          {t('profile_language_row')}
        </Text>

        {/* Grouped card — same style as Settings YOU section */}
        <View
          style={{
            backgroundColor: ios.card,
            marginHorizontal: 16,
            borderRadius: 0,
            overflow: 'hidden',
          }}
        >
          {locales.map((loc, index) => {
            const isSelected = loc === locale
            const isLast = index === locales.length - 1
            return (
              <Pressable
                key={loc}
                onPress={() => handleSelect(loc)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    minHeight: 52,
                    borderBottomWidth: isLast ? 0 : 0.5,
                    borderBottomColor: ios.separator,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: '300',
                      color: ios.text,
                    }}
                  >
                    {LOCALE_NAMES[loc]}
                  </Text>
                  {isSelected && <Check size={16} color={colors.primary} strokeWidth={2} />}
                </View>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
