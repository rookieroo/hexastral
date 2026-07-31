/**
 * In-report fuel disclosure — Pro 合盘 mints ~30–45d evening reminders.
 * Surfaces empty harvest honestly (no silent failure).
 */

import { kindredPaper, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import { kindredFonts } from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { fetchPushFuel } from '@/lib/push-fuel'

export function PushFuelDisclosure({ bondId }: { bondId: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchPushFuel().then((snap) => {
      if (cancelled || !snap) return
      // Count queued rows that belong to this bond when present in the preview;
      // otherwise fall back to the user's total remaining fuel.
      const bondHits = snap.next.filter((n) => n.bondId === bondId)
      // Never fall back to user-wide `remaining` — that mis-attributes other
      // bonds' fuel to this report. No preview rows for this bond ⇒ empty.
      setRemaining(bondHits.length)
    })
    return () => {
      cancelled = true
    }
  }, [bondId])

  const empty = remaining === 0
  const line =
    remaining == null
      ? t('report.fuel.pending')
      : empty
        ? t('report.fuel.empty')
        : t('report.fuel.ready').replace('{n}', String(remaining))

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: kindredSpacing.lg,
        paddingVertical: kindredSpacing.xl,
        backgroundColor: kindredPaper.bg,
      }}
    >
      <Text
        style={{
          fontFamily: kindredFonts.mono,
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: kindredPaper.muted,
          marginBottom: 12,
        }}
      >
        {t('report.fuel.kicker')}
      </Text>
      <Text
        style={{
          fontFamily: kindredFonts.serif,
          fontSize: 16,
          lineHeight: 24,
          color: kindredPaper.ink,
        }}
      >
        {line}
      </Text>
      <Pressable
        onPress={() => router.push('/(settings)')}
        style={({ pressed }) => ({ marginTop: 16, opacity: pressed ? 0.6 : 1 })}
      >
        <Text
          style={{
            fontFamily: kindredFonts.mono,
            fontSize: 12,
            letterSpacing: 1,
            color: kindredPaper.muted,
          }}
        >
          {t('report.fuel.settings')}
        </Text>
      </Pressable>
    </View>
  )
}
