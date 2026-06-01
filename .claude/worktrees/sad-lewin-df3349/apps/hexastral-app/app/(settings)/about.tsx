/**
 * ✦ About HexAstral
 *
 * 路由: /about (stack push from Profile)
 * 内容: 理念 · 八字 · 紫微 · 周易 · 梅花 · 使命
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/ui/BackButton'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import type { TranslationKeys } from '@/locales/zh'

type Section = {
  titleKey: TranslationKeys
  bodyKey: TranslationKeys
}

const SECTIONS: Section[] = [
  { titleKey: 'about_manifesto_title', bodyKey: 'about_manifesto_body' },
  { titleKey: 'about_bazi_title', bodyKey: 'about_bazi_body' },
  { titleKey: 'about_stellar_title', bodyKey: 'about_stellar_body' },
  { titleKey: 'about_yiching_title', bodyKey: 'about_yiching_body' },
  { titleKey: 'about_meihua_title', bodyKey: 'about_meihua_body' },
  { titleKey: 'about_mission_title', bodyKey: 'about_mission_body' },
]

export default function AboutScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()

  const ios = {
    bg: isDark ? '#09090B' : '#FAFAFA',
    separator: isDark ? '#27272A' : '#E4E4E7',
    text: isDark ? '#FAFAFA' : '#09090B',
    secondary: isDark ? '#A1A1AA' : '#71717A',
    accent: colors.accent,
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <BackButton color={ios.text} />
      <ScrollView contentContainerStyle={s.container}>
        <Text style={[s.wordmark, { color: ios.accent }]}>HEXASTRAL</Text>
        <Text style={[s.intro, { color: ios.secondary }]}>{t('about_intro')}</Text>

        {SECTIONS.map((section, index) => (
          <View key={section.titleKey}>
            {index > 0 && <View style={[s.separator, { backgroundColor: ios.separator }]} />}
            <Text style={[s.sectionTitle, { color: ios.secondary }]}>{t(section.titleKey)}</Text>
            <Text style={[s.sectionBody, { color: ios.text }]}>{t(section.bodyKey)}</Text>
          </View>
        ))}

        <View style={[s.separator, { backgroundColor: ios.separator }]} />
        <Text style={[s.footer, { color: ios.accent }]}>HEXASTRAL · {t('about_footer')}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 60,
  },
  wordmark: {
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 12,
  },
  intro: {
    fontSize: 13,
    fontWeight: '300',
    lineHeight: 20,
    marginBottom: 32,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionBody: {
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 23,
  },
  footer: {
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
})
