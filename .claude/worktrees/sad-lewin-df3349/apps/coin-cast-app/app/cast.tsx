import {
  PortfolioBannedError,
  PortfolioQuotaExceededError,
  PortfolioSessionExpiredError,
} from '@zhop/portfolio-client'
import { SatelliteLoadingOverlay } from '@zhop/satellite-ui'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { runPortfolioPreview } from '@/lib/api'
import {
  normalizeQuestion,
  recordReadingCompleted,
  rememberRecentQuestion,
} from '@/lib/coincast-ritual'
import { useSatelliteI18n } from '@/lib/i18n'
import { SheetHandle } from '@/lib/SheetHandle'
import { useAppTheme } from '@/lib/theme'

function formatCoincastBanRemaining(iso: string | null, uiLocale: string): string {
  if (!iso) return '—'
  const end = Date.parse(iso)
  if (!Number.isFinite(end)) return '—'
  const ms = Math.max(0, end - Date.now())
  const minsTotal = Math.max(1, Math.ceil(ms / 60_000))
  const hours = Math.floor(minsTotal / 60)
  const mins = minsTotal % 60
  if (uiLocale === 'ja') {
    return hours > 0 ? `約${hours}時間${mins}分` : `約${mins}分`
  }
  if (uiLocale === 'zh-Hant') {
    return hours > 0 ? `約${hours}小時${mins}分` : `約${mins}分`
  }
  if (uiLocale === 'zh') {
    return hours > 0 ? `约${hours}小时${mins}分` : `约${mins}分`
  }
  return hours > 0 ? `~${hours}h ${mins}m` : `~${mins}m`
}

export default function CastStubScreen() {
  const router = useRouter()
  const { locale, uiLocale, t } = useSatelliteI18n()
  const { colors } = useAppTheme()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cast = async () => {
    if (question.trim().length < 2) return
    try {
      setError(null)
      setLoading(true)
      const preview = await runPortfolioPreview(
        {
          question: question.trim(),
          entropy: `${Date.now()}_${Math.random()}`,
        },
        locale
      )
      if (preview.mode === 'refused') {
        let body = `${preview.reason}\n\n${t('alertRefusedTradition')}`
        if (preview.showViolationWarning) {
          body += `\n\n${t('alertRefusedWarn')}`
        }
        Alert.alert(t('alertRefusedTitle'), body)
        return
      }
      const norm = normalizeQuestion(question.trim())
      await rememberRecentQuestion(norm)
      await recordReadingCompleted(norm)
      router.push({
        pathname: '/result',
        params: {
          readingId: preview.readingId,
          payload: encodeURIComponent(JSON.stringify(preview.output)),
        },
      })
    } catch (err) {
      if (err instanceof PortfolioQuotaExceededError) {
        const msg = err.guestDailyLimit ? t('alertQuotaGuestDailyMsg') : t('alertQuotaMsg')
        if (err.guestDailyLimit) {
          Alert.alert(t('alertQuotaTitle'), msg, [
            { text: t('alertContinue'), style: 'cancel' },
            { text: t('alertQuotaSignIn'), onPress: () => router.push('/(tabs)/me') },
            { text: t('alertQuotaUpgrade'), onPress: () => router.push('/paywall') },
          ])
        } else {
          Alert.alert(t('alertQuotaTitle'), msg, [
            { text: t('alertContinue'), style: 'cancel' },
            { text: t('alertQuotaUpgrade'), onPress: () => router.push('/paywall') },
          ])
        }
        return
      }
      if (err instanceof PortfolioSessionExpiredError) {
        setError(t('castError'))
        return
      }
      if (err instanceof PortfolioBannedError) {
        const when = formatCoincastBanRemaining(err.bannedUntil, uiLocale)
        Alert.alert(t('alertBannedTitle'), t('alertBannedMsg', { time: when }))
        return
      }
      console.warn('[coincast] preview failed', err)
      setError(t('castError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackCast') }} />
      <SheetHandle />
      <Text style={[styles.title, { color: colors.text }]}>{t('castTitle')}</Text>
      <TextInput
        placeholder={t('castPlaceholder')}
        placeholderTextColor={colors.dim}
        style={[styles.input, { borderColor: colors.separator, color: colors.text }]}
        value={question}
        onChangeText={setQuestion}
      />
      <Pressable
        style={[styles.btn, { borderColor: colors.separator, backgroundColor: colors.card }]}
        onPress={cast}
        accessibilityRole='button'
      >
        <Text style={[styles.btnText, { color: colors.text }]}>{t('castSubmit')}</Text>
      </Pressable>
      {error ? <Text style={[styles.error, { color: colors.secondary }]}>{error}</Text> : null}
      <Pressable onPress={() => router.back()} accessibilityRole='button'>
        <Text style={[styles.back, { color: colors.accent }]}>← {t('castBack')}</Text>
      </Pressable>
      {loading ? <SatelliteLoadingOverlay label={t('homeCastingButton')} /> : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '500' },
  input: {
    borderWidth: 0.5,
    padding: 12,
    borderRadius: 0,
  },
  btn: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 0.5,
    borderRadius: 0,
    marginTop: 8,
  },
  btnText: { fontSize: 15 },
  error: { fontSize: 13 },
  back: { marginTop: 24, fontSize: 15 },
})
