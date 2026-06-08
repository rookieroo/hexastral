/**
 * Relationship Make-If (Workstream B) — forward decision support for one bond.
 *
 * "假如我们在某个窗口推进这段关系，哪个时机最合？" Runs POST /api/bonds/:id/makeif:
 * the server ranks the pair's forward 流月 windows by 用神 alignment + 冲/合 and
 * returns a deterministic verdict. Forward-only framing — never past rumination
 * about a real person (the risky use the Auspice S5 cut flagged).
 *
 * Pro/subscription gated server-side; this screen renders the upsell when the
 * response comes back `pro: false`. Verdict / reasons are localized client-side
 * from the structured flags (the engine emits zh) so the English surface is clean.
 */

import { ErrorState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredRadius,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import {
  type DecisionLean,
  elementName,
  formatLean,
  formatVerdict,
  formatWindowMonth,
  formatWindowReasons,
  type RelMakeIfResponse,
  type RelMakeIfWindow,
  useBondMakeIf,
} from '@zhop/scenario-kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { type Locale, resolveLocale, t } from '@/lib/i18n'

function leanColor(lean: DecisionLean): string {
  switch (lean) {
    case 'favorable':
      return kindredDark.accent
    case 'caution':
      return kindredDark.seal
    default:
      return kindredDark.textMuted
  }
}

export default function MakeIfScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { id } = useLocalSearchParams<{ id: string; title?: string }>()
  const { data, isLoading, error, run } = useBondMakeIf()

  useEffect(() => {
    if (id) void run(id)
  }, [id, run])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole='button'>
          <Text style={[kindredType.heading, { color: kindredDark.textMuted }]}>←</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
          <Text
            style={[
              kindredType.caption,
              { color: kindredDark.textMuted, marginTop: kindredSpacing.lg },
            ]}
          >
            {t(locale, 'makeif.loading')}
          </Text>
        </View>
      ) : error ? (
        <ErrorState
          variant='fullscreen'
          illustration={<KindredMoon size={72} />}
          title={t(locale, 'makeif.error')}
          message={error.message}
          customAction={
            <PrimaryButton label='Retry →' onPress={() => id && void run(id)} block={false} />
          }
        />
      ) : data ? (
        <Body data={data} locale={locale} onUpsell={() => router.push('/(commerce)/paywall')} />
      ) : null}
    </SafeAreaView>
  )
}

function Body({
  data,
  locale,
  onUpsell,
}: {
  data: RelMakeIfResponse
  locale: Locale
  onUpsell: () => void
}) {
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: kindredSpacing.screenH,
        paddingBottom: kindredSpacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{ alignItems: 'center', gap: kindredSpacing.sm, marginBottom: kindredSpacing.lg }}
      >
        <KindredMoon size={48} />
        <Text style={[kindredType.title, { color: kindredDark.text }]}>
          {t(locale, 'makeif.title')}
        </Text>
        <Text style={[kindredType.caption, { color: kindredDark.textMuted, textAlign: 'center' }]}>
          {t(locale, 'makeif.subtitle')}
        </Text>
      </View>

      {!data.pro ? (
        <View
          style={{
            borderWidth: 0.5,
            borderColor: kindredDark.accent,
            borderRadius: kindredRadius.md,
            padding: kindredSpacing.lg,
            gap: kindredSpacing.sm,
          }}
        >
          <Text style={[kindredType.heading, { color: kindredDark.text }]}>
            {t(locale, 'makeif.upsell.title')}
          </Text>
          <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
            {t(locale, 'makeif.upsell.body')}
          </Text>
          <PrimaryButton label={t(locale, 'makeif.upsell.cta')} onPress={onUpsell} />
        </View>
      ) : (
        <>
          {/* 用神 — the bridging element */}
          {data.yongshen ? (
            <View
              style={{
                borderWidth: 0.5,
                borderColor: kindredDark.border,
                borderRadius: kindredRadius.md,
                padding: kindredSpacing.lg,
                backgroundColor: kindredDark.card,
                marginBottom: kindredSpacing.md,
                gap: 4,
              }}
            >
              <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
                {t(locale, 'makeif.yongshen.label')}
              </Text>
              <Text style={[kindredType.heading, { color: kindredDark.accent }]}>
                {elementName(data.yongshen, locale)}
              </Text>
            </View>
          ) : null}

          {/* The read — synthesis verdict */}
          <Text
            style={[
              kindredType.body,
              { color: kindredDark.text, lineHeight: 23, marginBottom: kindredSpacing.lg },
            ]}
          >
            {formatVerdict(data, locale)}
          </Text>

          {/* Month by month */}
          <Text
            style={[
              kindredType.seal,
              { color: kindredDark.textSecondary, marginBottom: kindredSpacing.sm },
            ]}
          >
            {t(locale, 'makeif.windows.label')}
          </Text>
          <View style={{ gap: kindredSpacing.sm }}>
            {(data.windows ?? []).map((w) => (
              <WindowCard
                key={w.key}
                w={w}
                yongshen={data.yongshen ?? ''}
                isBest={w.key === data.bestKey}
                locale={locale}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  )
}

function WindowCard({
  w,
  yongshen,
  isBest,
  locale,
}: {
  w: RelMakeIfWindow
  yongshen: string
  isBest: boolean
  locale: Locale
}) {
  const reasons = formatWindowReasons(w, yongshen, locale)
  return (
    <View
      style={{
        borderWidth: isBest ? 1 : 0.5,
        borderColor: isBest ? kindredDark.accent : kindredDark.border,
        borderRadius: kindredRadius.md,
        padding: kindredSpacing.lg,
        backgroundColor: kindredDark.card,
        gap: kindredSpacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: kindredSpacing.sm }}>
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: leanColor(w.lean) }}
        />
        <Text style={[kindredType.body, { color: kindredDark.text }]}>
          {formatWindowMonth(w, locale)} · {w.ganZhi}
        </Text>
        <View style={{ flex: 1 }} />
        {isBest ? (
          <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
            {t(locale, 'makeif.best')}
          </Text>
        ) : (
          <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
            {formatLean(w.lean, locale)}
          </Text>
        )}
      </View>
      {reasons.length > 0 ? (
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary, lineHeight: 19 }]}>
          {reasons.join(locale === 'en' ? ' · ' : '；')}
        </Text>
      ) : null}
    </View>
  )
}
