/**
 * (new-site)/birth — step 5 of 6.
 *
 * The 个人命卦 (八宅 / personal_fit) chapter is computed from the user's birth
 * year + gender, loaded server-side from the account's saved birth info (the
 * SAME record configured in Settings). This step surfaces that dependency
 * explicitly instead of burying it as an optional card on review:
 *
 *   - birth info on record → confirm it's being used, offer to edit.
 *   - none on record       → offer to set it now, or skip (5-chapter report).
 *
 * Editing routes to the shared (birth-info) form (root stack); on return we
 * re-fetch so the choice reflects immediately. Birth info is global to the
 * account, not part of the site draft — so there is nothing to persist here.
 */

import { type Href, useFocusEffect, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChevronRight } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { type FengBirthInfo, fetchBirthInfo } from '@/lib/birth-info'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { spacing, useFengTheme } from '@/lib/theme'

export default function BirthStepScreen() {
  const router = useRouter()
  const { colors } = useFengTheme()
  const t = useStrings(resolveLocale())
  const insets = useSafeAreaInsets()

  // undefined = not yet checked; null = none on file; value = birth info present.
  const [birthInfo, setBirthInfo] = useState<FengBirthInfo | null | undefined>(undefined)

  useFocusEffect(
    useCallback(() => {
      let alive = true
      fetchBirthInfo()
        .then((bi) => {
          if (alive) setBirthInfo(bi)
        })
        .catch(() => {
          if (alive) setBirthInfo(null)
        })
      return () => {
        alive = false
      }
    }, [])
  )

  const hasBirth = !!birthInfo
  const genderLabel = birthInfo
    ? birthInfo.gender === '男'
      ? t.birth_gender_male
      : t.birth_gender_female
    : ''
  const summary = birthInfo ? `${birthInfo.birthSolarDate} · ${genderLabel}` : ''

  const goToForm = () => router.push('/(birth-info)' as Href)
  const goNext = () => router.push('/(new-site)/review')

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
        backgroundColor: colors.bg,
        flexGrow: 1,
      }}
    >
      <StatusBar style='light' />
      <ProgressIndicator step={5} total={6} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>
        {t.new_site_birth_title}
      </Text>

      {birthInfo === undefined ? (
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <Pressable
          onPress={goToForm}
          accessibilityRole='button'
          accessibilityLabel={hasBirth ? t.new_site_birth_edit : t.new_site_birth_add}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: spacing.lg,
            gap: spacing.sm,
            borderLeftWidth: 2,
            borderLeftColor: hasBirth ? colors.accent : colors.border,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text
              style={{ color: colors.text, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }}
            >
              {hasBirth ? summary : t.new_site_birth_add}
            </Text>
            <ChevronRight size={16} color={colors.textMute} strokeWidth={1.4} />
          </View>
          <Text style={{ color: colors.textMute, fontSize: 13, lineHeight: 19 }}>
            {hasBirth ? t.new_site_birth_desc_have : t.new_site_birth_desc_none}
          </Text>
          {hasBirth ? (
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
              {t.new_site_birth_edit} →
            </Text>
          ) : null}
        </Pressable>
      )}

      <View style={{ flex: 1 }} />

      {birthInfo !== undefined ? (
        <Pressable
          onPress={goNext}
          accessibilityRole='button'
          accessibilityLabel={hasBirth ? t.new_site_birth_continue : t.new_site_birth_skip}
          style={{
            backgroundColor: hasBirth ? colors.accent : 'transparent',
            borderWidth: hasBirth ? 0 : 1,
            borderColor: colors.border,
            paddingVertical: spacing.lg,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: hasBirth ? colors.bg : colors.textMute,
              fontWeight: '700',
              fontSize: 16,
            }}
          >
            {hasBirth ? t.new_site_birth_continue : t.new_site_birth_skip}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  )
}
