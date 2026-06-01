import {
  fetchPortfolioMemoryPreference,
  setPortfolioMemoryPreference,
} from '@zhop/portfolio-client'
import { getPortfolioUserId } from '@zhop/satellite-runtime'
import { Stack } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getMotionShakeEnabled, setMotionShakeEnabled } from '@/lib/coincast-ritual'
import { useSatelliteI18n } from '@/lib/i18n'
import { SheetHandle } from '@/lib/SheetHandle'
import { useAppTheme } from '@/lib/theme'

export default function CoinCastSettingsScreen() {
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()
  const [motion, setMotion] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [memory, setMemory] = useState(false)
  const [memoryLoaded, setMemoryLoaded] = useState(false)
  const [memoryGuest, setMemoryGuest] = useState(true)
  const [memorySaving, setMemorySaving] = useState(false)

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

  const toggleMotion = async () => {
    const next = !motion
    setMotion(next)
    await setMotionShakeEnabled(next)
  }

  const toggleMemory = async () => {
    if (memoryGuest || memorySaving) return
    const next = !memory
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

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackSettings') }} />
      <SheetHandle />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps='handled'
      >
        <View style={styles.body}>
          <Text style={[styles.label, { color: colors.secondary }]}>
            {t('settingsMotionLabel')}
          </Text>
          <Text style={[styles.hint, { color: colors.dim }]}>{t('settingsMotionHint')}</Text>
          <Pressable
            style={[styles.toggle, { borderColor: colors.separator, backgroundColor: colors.card }]}
            onPress={() => void toggleMotion()}
            accessibilityRole='switch'
            accessibilityState={{ checked: motion }}
            disabled={!loaded}
          >
            <Text style={[styles.toggleText, { color: colors.text }]}>
              {motion ? t('settingsMotionOn') : t('settingsMotionOff')}
            </Text>
          </Pressable>

          <Text style={[styles.label, { color: colors.secondary, marginTop: 28 }]}>
            {t('settingsMemoryLabel')}
          </Text>
          <Text style={[styles.hint, { color: colors.dim }]}>{t('settingsMemoryHint')}</Text>
          {memoryGuest ? (
            <Text style={[styles.hint, { color: colors.dim, marginTop: 4 }]}>
              {t('settingsMemoryGuestHint')}
            </Text>
          ) : null}
          <Pressable
            style={[styles.toggle, { borderColor: colors.separator, backgroundColor: colors.card }]}
            onPress={() => void toggleMemory()}
            accessibilityRole='switch'
            accessibilityState={{ checked: memory }}
            disabled={!memoryLoaded || memoryGuest || memorySaving}
          >
            {memorySaving ? (
              <View style={styles.row}>
                <ActivityIndicator color={colors.secondary} />
                <Text style={[styles.toggleText, { color: colors.text, marginLeft: 8 }]}>
                  {t('settingsMemorySaving')}
                </Text>
              </View>
            ) : (
              <Text style={[styles.toggleText, { color: colors.text }]}>
                {memory ? t('settingsMemoryOn') : t('settingsMemoryOff')}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollInner: { flexGrow: 1, justifyContent: 'center', paddingBottom: 24 },
  body: { paddingHorizontal: 24, paddingTop: 8, gap: 10 },
  label: { fontSize: 13, fontWeight: '500' },
  hint: { fontSize: 12, lineHeight: 18, fontWeight: '300' },
  toggle: {
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  toggleText: { fontSize: 14, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center' },
})
