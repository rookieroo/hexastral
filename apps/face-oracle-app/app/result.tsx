/**
 * One-shot / period result — sections + forward event table (ADR-0028).
 */

import { Button, useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'

import { useSatelliteI18n } from '@/lib/i18n'

function parsePayload(payload?: string | string[]): Record<string, unknown> {
  if (!payload || Array.isArray(payload)) return {}
  try {
    return JSON.parse(decodeURIComponent(payload)) as Record<string, unknown>
  } catch {
    return {}
  }
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

export default function FaceResultScreen() {
  const { colors, spacing } = useTheme()
  const { locale } = useSatelliteI18n()
  const zh = locale.startsWith('zh')
  const params = useLocalSearchParams<{ readingId?: string; payload?: string }>()
  const output = parsePayload(params.payload)
  const ai = (output.aiInterpretation ?? {}) as Record<string, unknown>
  const events = Array.isArray(output.events)
    ? (output.events as Array<Record<string, unknown>>)
    : Array.isArray(ai.events)
      ? (ai.events as Array<Record<string, unknown>>)
      : []
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') ||
    hasEntitlement(entitlements, 'universe_pro')

  const sections = [
    { title: zh ? '总格局' : 'Overview', body: asString(ai.overview) },
    { title: zh ? '面部' : 'Face', body: asString(ai.faceSection) },
    { title: zh ? '左掌' : 'Left palm', body: asString(ai.palmLeftSection) },
    { title: zh ? '右掌' : 'Right palm', body: asString(ai.palmRightSection) },
    { title: zh ? '形气 × 八字' : 'Form × BaZi', body: asString(ai.natalContrast) },
    { title: zh ? '本期对照' : 'Period note', body: asString(ai.periodDiff) },
    { title: zh ? '建议' : 'Advice', body: asString(ai.advice) },
  ].filter((s) => s.body.length > 0)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
    >
      <Stack.Screen
        options={{ title: zh ? '解读结果' : 'Reading', headerShown: true }}
      />
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
        {zh ? '完整形气解读' : 'Full form reading'}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 12 }}>
        {zh
          ? '文化研习参考 · 非命运断语'
          : 'Cultural study framing · not deterministic fate'}
      </Text>

      {sections.map((s) => (
        <View
          key={s.title}
          style={{
            borderWidth: 0.5,
            borderColor: colors.separator,
            borderRadius: 0,
            padding: spacing.md,
            gap: 6,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>{s.title}</Text>
          <Text style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>{s.body}</Text>
        </View>
      ))}

      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
        {zh ? '前瞻时间窗' : 'Forward windows'}
      </Text>
      {events.length === 0 ? (
        <Text style={{ color: colors.secondary }}>
          {zh ? '本次未返回结构化事件' : 'No structured events in this response'}
        </Text>
      ) : (
        events.map((ev, idx) => (
          <View
            key={`${String(ev.startMonth)}-${idx}`}
            style={{
              borderWidth: 0.5,
              borderColor: colors.separator,
              padding: spacing.md,
              gap: 4,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '500' }}>
              {String(ev.startMonth ?? '')}
              {ev.endMonth ? ` → ${String(ev.endMonth)}` : ''}
            </Text>
            <Text style={{ color: colors.text }}>{String(ev.theme ?? '')}</Text>
            <Text style={{ color: colors.secondary, lineHeight: 20 }}>
              {String(ev.note ?? '')}
            </Text>
          </View>
        ))
      )}

      {!isPro ? (
        <Button variant='primary' onPress={() => router.push('/paywall')}>
          {zh ? '订阅 Pro · Timeline 与提醒' : 'Subscribe Pro · Timeline & reminders'}
        </Button>
      ) : (
        <Button variant='ghost' onPress={() => router.replace('/(tabs)')}>
          {zh ? '回到 Timeline' : 'Back to Timeline'}
        </Button>
      )}
    </ScrollView>
  )
}
