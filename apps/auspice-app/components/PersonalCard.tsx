/**
 * 对你而言 — the deterministic personal overlay (C.3), now the primary Pro wall.
 *
 * Monetization (2026-06, simplified): the verdict (吉/平/凶) plus a single natural
 * one-line read are ALWAYS free — that's the honest takeaway ("today is good /
 * steady / cautious for you"). Only the per-reason "why" is Pro: a quiet
 * "了解原因 ›" link opens the paywall. No salesy "+N" chip, no heavy accent
 * frame — it should read like a calm daily note, not an upsell. No LLM here;
 * the Pro AI deep-reading (C.4) is a separate surface.
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { Pressable, Text, View } from 'react-native'
import type { AuspicePersonalization } from '@/lib/api'
import { useStrings } from '@/lib/i18n-context'
import type { LuckyGuide } from '@/lib/luckyGuide'
import { ELEMENT_COLORS } from '@/lib/shichen-content'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function PersonalCard({
  data,
  lucky,
  locked = false,
  onUnlock,
  onDeepRead,
}: {
  data: AuspicePersonalization
  /** 用神 → 吉色/吉方/吉时 — the actionable personal daily increment. Shown for
   *  everyone (the glanceable daily hook); the per-reason "why" stays the Pro gate.
   *  Undefined when birth info is missing (then the row is simply omitted). */
  lucky?: LuckyGuide | null
  /** Free tier: show the verdict + one-line read, gate the per-reason detail. */
  locked?: boolean
  onUnlock?: () => void
  /** Pro tier: open the LLM deep reading of the day's 对你而言 (the per-reason
   *  text alone was a dead end — paid users had nowhere deeper to go). */
  onDeepRead?: () => void
}) {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  const fitColor =
    data.fit === '吉' ? colors.success : data.fit === '凶' ? colors.danger : colors.secondary
  const hasWhy = locked && data.reasons.length > 0

  const L = t.personal.lucky
  // 吉时 label — 时辰 name (子时 / 子の刻) for CJK, clock range for en (suffix '').
  const luckyHoursLabel =
    lucky && lucky.hours.length > 0
      ? lucky.hours
          .map((h) =>
            L.shichenSuffix
              ? `${h.branch}${L.shichenSuffix}`
              : `${pad2(h.startHour)}–${pad2(h.endHour)}`
          )
          .join(L.shichenSep)
      : null

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: colors.card,
        borderWidth: 0.5,
        borderColor: colors.separator,
        padding: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ color: colors.secondary, fontSize: 13, letterSpacing: 1, flex: 1 }}>
          {t.personal.forYou}
        </Text>
        <Text style={{ color: fitColor, fontSize: 15, fontWeight: '700', letterSpacing: 1 }}>
          {t.personal.fit[data.fit]}
        </Text>
      </View>

      {/* Free natural takeaway — a sentence, not an upsell. */}
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
        {t.personal.summary[data.fit]}
      </Text>

      {/* 用神 → 吉色/吉方/吉时 — the actionable daily glance, keyed off the user's
          用神 (not the universal day-pillar color). Shown free; it's the daily
          open-the-app hook. App-only (never exported/pushed). */}
      {lucky ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.lg,
            marginTop: spacing.xs,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: colors.dim, fontSize: 12 }}>{L.color}</Text>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: ELEMENT_COLORS[lucky.element],
              }}
            />
            <Text style={{ color: colors.secondary, fontSize: 13 }}>
              {L.colorName[lucky.element]}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: colors.dim, fontSize: 12 }}>{L.direction}</Text>
            <Text style={{ color: colors.secondary, fontSize: 13 }}>
              {L.directionName[lucky.element]}
            </Text>
          </View>
          {luckyHoursLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.dim, fontSize: 12 }}>{L.time}</Text>
              <Text style={{ color: colors.secondary, fontSize: 13 }}>{luckyHoursLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {locked ? (
        hasWhy ? (
          // The per-reason "why" is the only thing behind Pro. Quiet text link.
          <Pressable
            onPress={onUnlock}
            accessibilityRole='button'
            accessibilityLabel={t.personal.why}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              marginTop: spacing.xs,
              opacity: pressed ? 0.55 : 1,
            })}
          >
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
              {t.personal.why}
            </Text>
            <ChevronRightIcon size={14} color={colors.accent} strokeWidth={1.6} />
          </Pressable>
        ) : null
      ) : (
        <>
          {data.reasons.map((r) => (
            <Text key={r} style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
              · {t.personal.reason[r]}
            </Text>
          ))}
          {/* Pro deep-read entry — the per-reason lines alone dead-ended paid
              users; this opens the LLM reading of today's 对你而言. */}
          {onDeepRead ? (
            <Pressable
              onPress={onDeepRead}
              accessibilityRole='button'
              accessibilityLabel={t.personal.deepRead}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                marginTop: spacing.xs,
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
                {t.personal.deepRead}
              </Text>
              <ChevronRightIcon size={14} color={colors.accent} strokeWidth={1.6} />
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  )
}
