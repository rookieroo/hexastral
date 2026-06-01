/**
 * Cast screen — single form: an optional question + an optional "observed
 * number" (邵雍先天数法). Submits to `/api/portfolio/preview/numerology`
 * (engine is 梅花易数 post-Phase-K) then routes to /result with the cast
 * payload encoded as URL params.
 */

import { Button, Card, useTheme } from '@zhop/core-ui'
import {
  PortfolioBannedError,
  PortfolioQuotaExceededError,
  PortfolioSessionExpiredError,
} from '@zhop/portfolio-client'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { castMeihuaReading } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

export default function ComputeScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const { colors } = useAppTheme()
  const { spacing } = useTheme()
  const [question, setQuestion] = useState('')
  const [numberStr, setNumberStr] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Cast is always allowed — both fields are optional (pure time-based cast).
  const ready = true

  const handleSubmit = async () => {
    if (!ready || busy) return
    setBusy(true)
    setErr(null)
    try {
      const trimmedNumber = numberStr.trim()
      const parsedNumber = trimmedNumber === '' ? undefined : Number(trimmedNumber)
      if (parsedNumber !== undefined && (!Number.isFinite(parsedNumber) || parsedNumber < 0)) {
        setErr(t('computeError'))
        return
      }
      const resp = await castMeihuaReading({
        question: question.trim() || undefined,
        observedNumber: parsedNumber,
      })
      router.replace({
        pathname: '/result',
        params: {
          payload: JSON.stringify(resp.reading),
          readingId: resp.readingId,
          mode: resp.mode,
        },
      })
    } catch (e) {
      if (e instanceof PortfolioQuotaExceededError) {
        router.push('/paywall')
        return
      }
      if (e instanceof PortfolioSessionExpiredError) {
        setErr(t('computeError'))
        return
      }
      if (e instanceof PortfolioBannedError) {
        Alert.alert(t('computeError'), e.message)
        return
      }
      setErr(e instanceof Error ? e.message : t('computeError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps='handled'
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 22,
            fontWeight: '500',
            letterSpacing: 0.4,
          }}
        >
          {t('computeTitle')}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
          {t('computeIntro')}
        </Text>

        <Card
          variant='outlined'
          padding='lg'
          style={{ backgroundColor: colors.card, gap: spacing.xs }}
        >
          <SectionLabel color={colors.secondary}>{t('computeQuestionLabel')}</SectionLabel>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder={t('computeQuestionPlaceholder')}
            placeholderTextColor={colors.secondary}
            multiline
            style={{
              fontSize: 17,
              color: colors.text,
              paddingVertical: spacing.sm,
              minHeight: 60,
              textAlignVertical: 'top',
            }}
          />
          <Text style={{ color: colors.secondary, fontSize: 11 }}>
            {t('computeQuestionHelper')}
          </Text>
        </Card>

        <Card
          variant='outlined'
          padding='lg'
          style={{ backgroundColor: colors.card, gap: spacing.xs }}
        >
          <SectionLabel color={colors.secondary}>{t('computeNumberLabel')}</SectionLabel>
          <TextInput
            value={numberStr}
            onChangeText={setNumberStr}
            placeholder={t('computeNumberPlaceholder')}
            placeholderTextColor={colors.secondary}
            keyboardType='number-pad'
            maxLength={4}
            style={{
              fontSize: 22,
              color: colors.text,
              paddingVertical: spacing.sm,
              letterSpacing: 4,
            }}
          />
          <Text style={{ color: colors.secondary, fontSize: 11 }}>{t('computeNumberHelper')}</Text>
        </Card>

        {err ? <Text style={{ color: colors.secondary, fontSize: 13 }}>{err}</Text> : null}

        <View style={{ flex: 1, minHeight: spacing.lg }} />

        <Button variant='primary' fullWidth loading={busy} disabled={!ready} onPress={handleSubmit}>
          {t('computeSubmit')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <Text
      style={{
        color,
        fontSize: 11,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  )
}
