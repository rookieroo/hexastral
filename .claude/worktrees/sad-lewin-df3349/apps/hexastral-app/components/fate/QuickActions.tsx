/**
 * Fate quick actions — split into primary CTA + utility row.
 *
 * Visual language (Ink Brutalism):
 * - ResonanceCTA: full-width pressable with inkWash ambient tint, arrow affordance
 * - SecondaryActions: three taller cells with vertical icon+label+status
 *
 * Both use ios.separator hairlines and zero border radius.
 */

import { ArrowRight, Hexagon, MessageCircle, User, Users } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import type { QuotaStatus } from '@/lib/ux/useQuota'
import type { TranslationKeys } from '@/locales/zh'

/** Cast (Oracle) quota line — Free uses monthly free tier; Pro uses subscription quota from GET /api/quota */
export type OracleCastHint =
  | { type: 'free_remaining'; n: number }
  | { type: 'pro'; monthLeft: number; todayLeft: number }

interface Props {
  isPro: boolean
  onAsk: () => void
  onCast: () => void
  onSolo: () => void
  onResonance: () => void
  /** When set, drives Cast cell status; else Free shows generic label, Pro shows current plan while quota loads */
  oracleCastHint?: OracleCastHint | null
  /** Pro-only: from GET /api/quota — drives Ask (chat pool) + Solo (pair) status lines */
  proQuota?: QuotaStatus | null
}

export function ResonanceCTA({ onResonance }: Pick<Props, 'onResonance'>) {
  const { t } = useI18n()
  const ios = useIosPalette()
  const { colors } = useTheme()

  return (
    <Pressable
      onPress={onResonance}
      style={({ pressed }) => ({
        alignSelf: 'stretch',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: pressed ? ios.card : colors.inkWash,
        borderWidth: 0.5,
        borderColor: ios.separator,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderWidth: 0.5,
            borderColor: ios.separator,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Users size={16} color={ios.text} strokeWidth={1.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: ios.text,
              fontSize: 15,
              fontWeight: '500',
              letterSpacing: 0.8,
            }}
          >
            {t('bond_mode_resonance')}
          </Text>
          <Text
            style={{
              color: ios.secondary,
              fontSize: 12,
              lineHeight: 18,
              fontWeight: '300',
              marginTop: 4,
            }}
            numberOfLines={2}
          >
            {t('bond_mode_resonance_desc')}
          </Text>
        </View>
        <ArrowRight size={18} color={ios.text} strokeWidth={1.5} />
      </View>
    </Pressable>
  )
}

export function SecondaryActions({
  isPro,
  onAsk,
  onCast,
  onSolo,
  oracleCastHint,
  proQuota,
}: Pick<Props, 'isPro' | 'onAsk' | 'onCast' | 'onSolo' | 'oracleCastHint' | 'proQuota'>) {
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

  const soloStatus = (() => {
    if (!isPro) return t('paywall_upgrade')
    if (!proQuota) return t('paywall_current_plan')
    return t('quick_status_pro_pair', {
      remaining: proQuota.pair.remaining,
      limit: proQuota.pair.limit,
    })
  })()

  const castStatus = (() => {
    if (oracleCastHint?.type === 'free_remaining') {
      return t('quick_status_remaining', { n: oracleCastHint.n })
    }
    if (oracleCastHint?.type === 'pro') {
      return t('quick_status_pro_cast', {
        month: oracleCastHint.monthLeft,
        today: oracleCastHint.todayLeft,
      })
    }
    if (isPro) return t('paywall_current_plan')
    return t('paywall_free')
  })()

  const cells: Array<{
    id: string
    label: string
    status: string
    onPress: () => void
    icon: typeof MessageCircle
  }> = [
    {
      id: 'ask',
      label: t('quick_ask_hexastral'),
      status: askStatus,
      onPress: onAsk,
      icon: MessageCircle,
    },
    {
      id: 'cast',
      label: t('quick_cast_hexagram'),
      status: castStatus,
      onPress: onCast,
      icon: Hexagon,
    },
    {
      id: 'solo',
      label: t('bond_mode_solo'),
      status: soloStatus,
      onPress: onSolo,
      icon: User,
    },
  ]

  /** Three gapped columns — stretch to full width of the action band. */
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 8,
        alignItems: 'stretch',
        justifyContent: 'space-between',
        alignSelf: 'stretch',
        width: '100%',
      }}
    >
      {cells.map((cell) => (
        <Pressable
          key={cell.id}
          onPress={cell.onPress}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: 108,
            paddingVertical: 16,
            paddingHorizontal: 8,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 0.5,
            borderColor: ios.separator,
            backgroundColor: pressed ? ios.card : ios.cardElevated,
          })}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%' }}>
            <cell.icon size={18} color={ios.text} strokeWidth={1.5} />
            <Text
              style={{
                color: ios.text,
                fontSize: 13,
                fontWeight: '500',
                letterSpacing: 0.8,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {cell.label}
            </Text>
            <Text
              style={{
                color: ios.secondary,
                fontSize: cell.id === 'cast' ? 8 : 9,
                letterSpacing: cell.id === 'cast' ? 0.4 : 1,
                textTransform: cell.id === 'cast' || cell.id === 'ask' || cell.id === 'solo' ? 'none' : 'uppercase',
                fontWeight: '300',
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {cell.status}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  )
}

/** Section kicker + Resonance + secondary row — use on Fate tab home. */
const FATE_ACTIONS_SECTION: TranslationKeys = 'fate_actions_section_label'

export function FateActionDeck(props: Props) {
  const { t } = useI18n()
  const ios = useIosPalette()

  /** Column only — parent `FateHomeInsetCard` supplies card chrome. */
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
      <ResonanceCTA onResonance={props.onResonance} />
      <SecondaryActions
        isPro={props.isPro}
        onAsk={props.onAsk}
        onCast={props.onCast}
        onSolo={props.onSolo}
        oracleCastHint={props.oracleCastHint}
        proQuota={props.proQuota ?? null}
      />
    </View>
  )
}

export function QuickActions(props: Props) {
  return <FateActionDeck {...props} />
}
