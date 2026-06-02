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

export function PersonalCard({
  data,
  locked = false,
  onUnlock,
}: {
  data: AuspicePersonalization
  /** Free tier: show the verdict + one-line read, gate the per-reason detail. */
  locked?: boolean
  onUnlock?: () => void
}) {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  const fitColor =
    data.fit === '吉' ? colors.success : data.fit === '凶' ? colors.danger : colors.secondary
  const hasWhy = locked && data.reasons.length > 0

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
        data.reasons.map((r) => (
          <Text key={r} style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
            · {t.personal.reason[r]}
          </Text>
        ))
      )}
    </View>
  )
}
