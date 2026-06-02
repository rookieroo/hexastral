/**
 * Fate quick actions — "Ask HexAstral" CTA on the Fate home.
 *
 * Phase J · J.3.2: collapsed from a three-cell row (Ask · Cast · Solo) plus
 * ResonanceCTA. After bonds + yiching went away (J.3.2), Ask is the only
 * remaining in-app action; Cast/Solo/Resonance all route to satellites via
 * <DiscoverSatellitesSection> instead.
 *
 * Visual language (Ink Brutalism): single tall pressable cell with icon +
 * label + status line. ios.separator hairline border, zero border radius.
 */

import { MessageCircle } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'
import type { QuotaStatus } from '@/lib/ux/useQuota'
import type { TranslationKeys } from '@/locales/zh'

/**
 * Retained for legacy callers (e.g. (tabs)/index.tsx still computes the hint
 * for any in-flight UI). After bonds+yiching delete, the hint no longer
 * drives any cell — kept as a no-op type so callers don't break.
 */
export type OracleCastHint =
  | { type: 'free_remaining'; n: number }
  | { type: 'pro'; monthLeft: number; todayLeft: number }

interface Props {
  isPro: boolean
  onAsk: () => void
  /** Pro-only: from GET /api/quota — drives the Ask chat-pool status line. */
  proQuota?: QuotaStatus | null
}

/** Section kicker + Ask CTA — drop in below the Daily Signal card. */
const FATE_ACTIONS_SECTION: TranslationKeys = 'fate_actions_section_label'

export function FateActionDeck({ isPro, onAsk, proQuota }: Props) {
  const { t } = useI18n()
  const ios = useIosPalette()

  const askStatus = (() => {
    if (!isPro) return t('paywall_free')
    if (!proQuota) return t('paywall_current_plan')
    return t('quick_status_pro_chat', {
      remaining: proQuota.chatPool.remaining,
      limit: proQuota.chatPool.limit,
    })
  })()

  return (
    <View style={{ gap: 14, width: '100%', alignSelf: 'stretch' }}>
      <Text
        style={{
          color: ios.secondary,
          fontSize: 11,
          fontWeight: '300',
          letterSpacing: 1.8,
          textTransform: 'uppercase',
        }}
      >
        {t(FATE_ACTIONS_SECTION)}
      </Text>
      <Pressable
        onPress={onAsk}
        style={({ pressed }) => ({
          alignSelf: 'stretch',
          minHeight: 96,
          paddingVertical: 18,
          paddingHorizontal: 18,
          justifyContent: 'center',
          gap: 10,
          borderWidth: 0.5,
          borderColor: ios.separator,
          backgroundColor: pressed ? ios.card : ios.cardElevated,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <MessageCircle size={18} color={ios.text} strokeWidth={1.5} />
          <Text
            style={{
              color: ios.text,
              fontSize: 15,
              fontWeight: '500',
              letterSpacing: 0.8,
            }}
          >
            {t('quick_ask_hexastral')}
          </Text>
        </View>
        <Text
          style={{
            color: ios.secondary,
            fontSize: 12,
            lineHeight: 18,
            fontWeight: '300',
          }}
        >
          {askStatus}
        </Text>
      </Pressable>
    </View>
  )
}

export function QuickActions(props: Props) {
  return <FateActionDeck {...props} />
}
