import { Toggle, useTheme } from '@zhop/core-ui'
import {
  fetchPortfolioMemoryPreference,
  setPortfolioMemoryPreference,
} from '@zhop/portfolio-client'
import {
  type DevEntitlementOverride,
  getDevEntitlementOverride,
  getPortfolioUserId,
  setDevEntitlementOverride,
} from '@zhop/satellite-runtime'
import { Stack, useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, DevSettings, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getMotionShakeEnabled, setMotionShakeEnabled } from '@/lib/coincast-ritual'
import { useSatelliteI18n } from '@/lib/i18n'

/** Tiny letter-spaced kicker above each section — matches the auspice Me idiom. */
function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3, marginBottom: 10 }}>
      {children}
    </Text>
  )
}

/** A card row carrying a label (+ optional hint) on the left and a Toggle on the right. */
function ToggleCard({
  label,
  hint,
  value,
  onToggle,
  disabled,
  saving,
  savingLabel,
}: {
  label: string
  hint?: string
  value: boolean
  onToggle: (next: boolean) => void | Promise<void>
  disabled?: boolean
  saving?: boolean
  savingLabel?: string
}) {
  const { colors, spacing } = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontSize: 16 }}>{label}</Text>
        {hint ? (
          <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>{hint}</Text>
        ) : null}
      </View>
      {saving ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator color={colors.secondary} />
          {savingLabel ? (
            <Text style={{ color: colors.dim, fontSize: 12 }}>{savingLabel}</Text>
          ) : null}
        </View>
      ) : (
        <Toggle
          value={value}
          onValueChange={onToggle}
          accent={colors.accent}
          disabled={disabled}
          accessibilityLabel={label}
        />
      )}
    </View>
  )
}

export default function CoinCastSettingsScreen() {
  const router = useRouter()
  const { colors, spacing } = useTheme()
  const { t, uiLocale } = useSatelliteI18n()
  const [motion, setMotion] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [memory, setMemory] = useState(false)
  const [memoryLoaded, setMemoryLoaded] = useState(false)
  const [memoryGuest, setMemoryGuest] = useState(true)
  const [memorySaving, setMemorySaving] = useState(false)
  const [devPro, setDevPro] = useState<DevEntitlementOverride>(getDevEntitlementOverride())

  useEffect(() => {
    void (async () => {
      const v = await getMotionShakeEnabled()
      setMotion(v)
      setLoaded(true)
    })()
  }, [])

  const loadMemory = useCallback(async () => {
    const uid = await getPortfolioUserId()
    if (!uid) {
      setMemoryGuest(true)
      setMemoryLoaded(true)
      return
    }
    setMemoryGuest(false)
    try {
      const { enabled } = await fetchPortfolioMemoryPreference()
      setMemory(enabled)
    } catch {
      setMemory(false)
    } finally {
      setMemoryLoaded(true)
    }
  }, [])

  useEffect(() => {
    void loadMemory()
  }, [loadMemory])

  const toggleMotion = async (next: boolean) => {
    setMotion(next)
    await setMotionShakeEnabled(next)
  }

  const toggleMemory = async (next: boolean) => {
    if (memoryGuest || memorySaving) return
    setMemorySaving(true)
    try {
      const res = await setPortfolioMemoryPreference(next)
      setMemory(res.enabled)
    } catch {
      setMemory((v) => v)
    } finally {
      setMemorySaving(false)
    }
  }

  const cycleDevPro = () => {
    const nextOverride: DevEntitlementOverride =
      devPro === null ? 'pro' : devPro === 'pro' ? 'free' : null
    setDevEntitlementOverride(nextOverride)
    setDevPro(nextOverride)
  }

  const creditsLabel =
    { en: 'Credits & sources', zh: '来源与致谢', 'zh-Hant': '來源與致謝', ja: 'クレジット' }[
      uiLocale as 'en' | 'zh' | 'zh-Hant' | 'ja'
    ] ?? 'Credits & sources'

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={['left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackSettings') }} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingTop: spacing.lg }}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing.md }}>
          <SectionLabel>{t('settingsMotionLabel')}</SectionLabel>
          <ToggleCard
            label={t('settingsMotionLabel')}
            hint={t('settingsMotionHint')}
            value={motion}
            onToggle={toggleMotion}
            disabled={!loaded}
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <SectionLabel>{t('settingsMemoryLabel')}</SectionLabel>
          <ToggleCard
            label={t('settingsMemoryLabel')}
            hint={memoryGuest ? t('settingsMemoryGuestHint') : t('settingsMemoryHint')}
            value={memory}
            onToggle={toggleMemory}
            disabled={!memoryLoaded || memoryGuest}
            saving={memorySaving}
            savingLabel={t('settingsMemorySaving')}
          />
        </View>

        <Pressable
          onPress={() => router.push('/credits')}
          accessibilityRole='button'
          accessibilityLabel={creditsLabel}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.card,
            borderRadius: 14,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: colors.text, fontSize: 16 }}>{creditsLabel}</Text>
          <ChevronRight size={18} color={colors.dim} strokeWidth={1.6} />
        </Pressable>

        {__DEV__ ? (
          <View style={{ gap: spacing.md }}>
            <SectionLabel>PRO · DEV</SectionLabel>
            <Pressable
              onPress={cycleDevPro}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.card,
                borderRadius: 14,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16 }}>Force entitlement</Text>
              <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>
                {devPro === null ? 'Off · real' : devPro === 'pro' ? 'PRO' : 'FREE'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => DevSettings.reload()}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.card,
                borderRadius: 14,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16 }}>Reload app</Text>
              <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>↻</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
