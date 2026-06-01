/**
 * Birth onboarding · Step 5 — Review & submit
 *
 * Shows the four collected fields with edit shortcuts, then issues the same
 * `PUT /api/user/:userId/birth-info` payload as the legacy birth-info modal
 * (server is unchanged) followed by `POST /api/onboarding/bootstrap` to warm
 * the chart immediately. On success, clears the draft and routes home.
 *
 * Free-tier guard: changing birth info regenerates the chart, which is gated
 * behind subscription. We mirror the legacy guard (showing the paywall) for
 * users who try to overwrite an already-saved chart while on the free plan.
 */

import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { clearBirthDraft, useBirthDraft } from '@/lib/birthDraft'
import { saveBirthInfo } from '@/lib/domain/birthInfo'
import { checkSubscriptionStatus } from '@/lib/domain/subscription'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

interface RowProps {
  label: string
  value: string
  onEdit: () => void
  ios: ReturnType<typeof useIosPalette>
}

function ReviewRow({ label, value, onEdit, ios }: RowProps) {
  return (
    <Pressable
      onPress={onEdit}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: ios.separator,
      }}
    >
      <View>
        <Text
          style={{
            color: ios.secondary,
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {label}
        </Text>
        <Text style={{ color: ios.text, fontSize: 16, fontWeight: '400' }}>{value}</Text>
      </View>
      <Text style={{ color: ios.secondary, fontSize: 13 }}>›</Text>
    </Pressable>
  )
}

export default function BirthReviewScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const ios = useIosPalette()
  const { userId } = useAuth()
  const draft = useBirthDraft()
  const [busy, setBusy] = useState(false)

  const dateLabel = draft.solarDate || '—'
  const timeLabel =
    draft.timeIndex == null
      ? t('birth_conv_time_unknown')
      : `#${draft.timeIndex} ${shichenBranch(draft.timeIndex)}`
  const genderLabel =
    draft.gender === '男'
      ? t('birth_conv_gender_male')
      : draft.gender === '女'
        ? t('birth_conv_gender_female')
        : '—'
  const placeLabel = draft.birthCity || '—'

  const ready = !!draft.solarDate && !!draft.gender && !!draft.birthCity

  const handleSubmit = async () => {
    if (!ready || busy) return
    Haptics.selectionAsync()

    // Free-plan guard mirrors the legacy birth-info edit flow.
    const sub = await checkSubscriptionStatus().catch(() => ({ isSubscribed: true }))
    if (!sub.isSubscribed) {
      Alert.alert(t('birth_change_gate_title'), t('birth_change_gate_desc'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('paywall_upgrade'), onPress: () => router.push('/paywall') },
      ])
      return
    }

    setBusy(true)
    try {
      await saveBirthInfo({
        solarDate: draft.solarDate,
        birthYear: draft.solarDate.split('-')[0],
        timeIndex: draft.timeIndex ?? undefined,
        gender: draft.gender ?? '男',
        birthCity: draft.birthCity,
        latitude: draft.latitude ?? undefined,
        longitude: draft.longitude ?? undefined,
        timezoneId: draft.timezoneId ?? undefined,
      })

      // Sync to server. Authed real users only — guests stay local.
      if (userId && !userId.startsWith('guest_')) {
        const put = await apiClient.api.user[':userId']['birth-info'].$put({
          param: { userId },
          json: {
            birthSolarDate: draft.solarDate,
            birthTimeIndex: draft.timeIndex ?? 6,
            birthGender: draft.gender ?? '男',
            birthCity: draft.birthCity,
            birthLongitude: draft.longitude != null ? String(draft.longitude) : undefined,
            birthLatitude: draft.latitude != null ? String(draft.latitude) : undefined,
            birthTimezoneId: draft.timezoneId ?? undefined,
          },
        })
        if (!put.ok && __DEV__) {
          console.warn('[birth-review] PUT failed', put.status, await put.text())
        }

        // Warm the chart synchronously so home → hero shows real data.
        await apiClient.api.onboarding.bootstrap
          .$post({ json: { explanationMode: 'plain' } })
          .catch((err) => {
            if (__DEV__) console.warn('[birth-review] bootstrap threw', err)
          })
      }

      await clearBirthDraft()
      router.replace('/(tabs)' as never)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}>
        <ProgressIndicator step={5} total={5} />
        <View style={{ height: 28 }} />
        <Text style={{ color: ios.text, fontSize: 26, fontWeight: '500', letterSpacing: 0.4 }}>
          {t('birth_conv_review_title')}
        </Text>
        <View style={{ height: 24 }} />

        <ReviewRow
          label={t('birth_conv_date_title')}
          value={dateLabel}
          onEdit={() => router.push('/birth-date')}
          ios={ios}
        />
        <ReviewRow
          label={t('birth_conv_time_title')}
          value={timeLabel}
          onEdit={() => router.push('/birth-time')}
          ios={ios}
        />
        <ReviewRow
          label={t('birth_conv_gender_title')}
          value={genderLabel}
          onEdit={() => router.push('/birth-gender')}
          ios={ios}
        />
        <ReviewRow
          label={t('birth_conv_place_title')}
          value={placeLabel}
          onEdit={() => router.push('/birth-place')}
          ios={ios}
        />

        <View style={{ height: 40 }} />

        <Pressable
          onPress={handleSubmit}
          disabled={!ready || busy}
          style={{
            paddingVertical: 16,
            alignItems: 'center',
            backgroundColor: ios.text,
            opacity: !ready || busy ? 0.4 : 1,
          }}
          accessibilityRole="button"
        >
          <Text
            style={{
              color: ios.bg,
              fontSize: 14,
              fontWeight: '500',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {busy ? t('fate_hero_generating') : t('birth_conv_review_submit')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const SHICHEN_BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
function shichenBranch(idx: number): string {
  if (idx < 0 || idx >= SHICHEN_BRANCH.length) return '—'
  return SHICHEN_BRANCH[idx] ?? '—'
}
