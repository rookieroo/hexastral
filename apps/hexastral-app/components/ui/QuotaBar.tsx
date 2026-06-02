/**
 * QuotaBar — Pro 月度配额进度条
 *
 * 仅在剩余配额 < 20% 时显示对应域，避免计数焦虑。
 * 无配额数据（非 Pro 或加载中）时不渲染。
 */

import { Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'
import type { QuotaItem, QuotaStatus } from '@/lib/ux/useQuota'

interface QuotaBarProps {
  /** Full Pro quota status from useQuotaQuery */
  status: QuotaStatus
  /** Only render bars below this fill fraction (default 0.8 = 80% used) */
  threshold?: number
}

const QUOTA_KEYS = ['pair', 'divination', 'chatPool'] as const
type QuotaKey = (typeof QUOTA_KEYS)[number]

const LOCALE_KEYS: Record<QuotaKey, 'quota_synastry' | 'quota_divination' | 'quota_chat_pool'> = {
  pair: 'quota_synastry',
  divination: 'quota_divination',
  chatPool: 'quota_chat_pool',
}

export function QuotaBar({ status, threshold = 0.8 }: QuotaBarProps) {
  const { t } = useI18n()
  const ios = useIosPalette()

  // Filter to only domains above the warning threshold
  const warningDomains = QUOTA_KEYS.filter((key) => {
    const item = status[key] as QuotaItem
    if (item.limit === 0) return false
    const fillFraction = item.used / item.limit
    return fillFraction >= threshold
  })

  if (warningDomains.length === 0) return null

  return (
    <View
      style={{
        backgroundColor: ios.warnBg,
        borderWidth: 0.5,
        borderColor: ios.warnBar,
        padding: 12,
        gap: 10,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: ios.warnBar,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {t('quota_monthly_reset')}
      </Text>

      {warningDomains.map((key) => {
        const item = status[key] as QuotaItem
        const fillFraction = Math.min(item.used / item.limit, 1)
        const isExhausted = item.remaining === 0

        return (
          <View key={key} style={{ gap: 4 }}>
            {/* Label row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 12, color: ios.text, fontWeight: '500' }}>
                {t(LOCALE_KEYS[key])}
              </Text>
              <Text style={{ fontSize: 11, color: isExhausted ? ios.warnBar : ios.secondary }}>
                {isExhausted
                  ? t('quota_overflow_notice')
                  : t('quota_remaining', { remaining: String(item.remaining) })}
              </Text>
            </View>

            {/* Progress bar */}
            <View
              style={{
                height: 3,
                backgroundColor: ios.separator,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: 3,
                  width: `${fillFraction * 100}%`,
                  backgroundColor: isExhausted ? ios.warnBar : ios.accent,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
        )
      })}
    </View>
  )
}
