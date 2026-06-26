import {
  fetchPortfolioMemoryPreference,
  setPortfolioMemoryPreference,
} from '@zhop/portfolio-client'
import { getPortfolioUserId, hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { Stack, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  COIN_SKINS,
  type CoinSkinId,
  coinSkinLabel,
  coinSkinNote,
  coinSkinUi,
  DEFAULT_SKIN_ID,
  loadSelectedSkinId,
  saveSelectedSkinId,
} from '@/lib/coin-skins'
import { getMotionShakeEnabled, setMotionShakeEnabled } from '@/lib/coincast-ritual'
import { useSatelliteI18n } from '@/lib/i18n'
import { SheetHandle } from '@/lib/SheetHandle'
import { useAppTheme } from '@/lib/theme'

export default function CoinCastSettingsScreen() {
  const router = useRouter()
  const { colors } = useAppTheme()
  const { t, uiLocale } = useSatelliteI18n()
  const entitlements = useEntitlements()
  const coincastPro = hasEntitlement(entitlements, 'coincast_pro')
  const [skinId, setSkinId] = useState<CoinSkinId>(DEFAULT_SKIN_ID)
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
    void loadSelectedSkinId().then(setSkinId)
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

  const selectSkin = async (id: CoinSkinId, pro: boolean) => {
    if (pro && !coincastPro) {
      router.push('/paywall')
      return
    }
    setSkinId(id)
    await saveSelectedSkinId(id)
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

          <Text style={[styles.label, { color: colors.secondary, marginTop: 28 }]}>
            {coinSkinUi(uiLocale).title}
          </Text>
          <Text style={[styles.hint, { color: colors.dim }]}>{coinSkinUi(uiLocale).hint}</Text>
          {COIN_SKINS.map((skin) => {
            const selected = skin.id === skinId
            const locked = skin.pro && !coincastPro
            return (
              <Pressable
                key={skin.id}
                style={[
                  styles.skinRow,
                  {
                    borderColor: selected ? colors.text : colors.separator,
                    backgroundColor: colors.card,
                  },
                ]}
                onPress={() => void selectSkin(skin.id, skin.pro)}
                accessibilityRole='button'
                accessibilityState={{ selected }}
              >
                <View style={styles.skinInfo}>
                  <Text style={[styles.skinName, { color: colors.text }]}>
                    {coinSkinLabel(skin, uiLocale)}
                  </Text>
                  <Text style={[styles.skinNote, { color: colors.dim }]}>
                    {coinSkinNote(skin, uiLocale)}
                  </Text>
                </View>
                {locked ? (
                  <Text style={[styles.skinTag, { color: colors.secondary }]}>
                    {coinSkinUi(uiLocale).locked}
                  </Text>
                ) : selected ? (
                  <View style={[styles.skinDot, { backgroundColor: colors.text }]} />
                ) : null}
              </Pressable>
            )
          })}

          <Pressable
            style={[
              styles.toggle,
              { borderColor: colors.separator, backgroundColor: colors.card, marginTop: 28 },
            ]}
            onPress={() => router.push('/credits')}
            accessibilityRole='button'
          >
            <Text style={[styles.toggleText, { color: colors.text }]}>
              {{
                en: 'Credits & sources',
                zh: '来源与致谢',
                'zh-Hant': '來源與致謝',
                ja: 'クレジット',
              }[uiLocale as 'en' | 'zh' | 'zh-Hant' | 'ja'] ?? 'Credits & sources'}
            </Text>
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
  skinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  skinInfo: { flex: 1, gap: 2 },
  skinName: { fontSize: 14, fontWeight: '500' },
  skinNote: { fontSize: 11, lineHeight: 15 },
  skinTag: { fontSize: 12, fontWeight: '500', marginLeft: 12 },
  skinDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 12 },
})
