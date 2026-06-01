/**
 * cast.tsx — auxiliary "ask a question" surface for Coin Cast.
 *
 * The flagship (tabs) home owns the 3D coin-cast experience; this screen is
 * the simpler text-only entry, reached via deep link or quick-action. Phase F
 * polish: switch to core-ui Card / Button + amber accent + 卦 glyph hero.
 */

import { Button, Card, useTheme } from '@zhop/core-ui'
import {
  PortfolioBannedError,
  PortfolioQuotaExceededError,
  PortfolioSessionExpiredError,
} from '@zhop/portfolio-client'
import { SatelliteLoadingOverlay } from '@zhop/satellite-ui'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
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
  const { spacing } = useTheme()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = question.trim().length >= 2 && !loading

  const cast = async () => {
    if (!canSubmit) return
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
      style={[
        styles.container,
        { backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.lg },
      ]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackCast') }} />
      <SheetHandle />

      {/* Glyph hero — matches the 卦 satellite mark per ADR-0004 */}
      <View style={{ alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            borderWidth: 0.5,
            borderColor: colors.accent,
            backgroundColor: `${colors.accent}1A`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 36, color: colors.accent, fontWeight: '400' }}>卦</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{t('castTitle')}</Text>

      <Card
        variant='outlined'
        padding='lg'
        style={{ backgroundColor: colors.card, gap: spacing.sm }}
      >
        <TextInput
          placeholder={t('castPlaceholder')}
          placeholderTextColor={colors.dim}
          style={{ fontSize: 16, color: colors.text, paddingVertical: spacing.sm }}
          value={question}
          onChangeText={setQuestion}
          multiline
          autoFocus
        />
      </Card>

      <Button variant='primary' fullWidth loading={loading} disabled={!canSubmit} onPress={cast}>
        {t('castSubmit')}
      </Button>

      {error ? <Text style={[styles.error, { color: colors.secondary }]}>{error}</Text> : null}

      <View style={{ flex: 1 }} />

      <Button variant='ghost' onPress={() => router.back()}>
        ← {t('castBack')}
      </Button>

      {loading ? <SatelliteLoadingOverlay label={t('homeCastingButton')} /> : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '500', textAlign: 'center' },
  error: { fontSize: 13, textAlign: 'center' },
})
