/**
 * 命理签名 — Path 个人名片下的**固定**签句（非 Fate 首页每日信号）。
 *
 * `useFateSignature`：优先 `users.fate_signature`（服务端持久化），否则
 * `@zhop/astro-i18n` 由日主/强弱/紫微命宫确定性推导。
 *
 * Non‑Pro: 右侧 ↻ 走 `onUpgradePress()`（全屏 Unlock）。未来若恢复 LLM 重新生成，
 * 仍经同一入口。
 */

import { Text, TouchableOpacity, View } from 'react-native'
import type { FateSignatureData } from '@/lib/hooks/useFateSignature'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface FateSignatureProps {
  userId: string
  isPro: boolean
  signatureData: FateSignatureData | null
  /** Reserved for future LLM-rephrasing flow; kept for API parity. */
  chartFacts?: Record<string, unknown>
  /** No-op now — signature derives synchronously from cached user fields. */
  autoGenerate?: boolean
  onUpgradePress: () => void
}

export function FateSignature({ isPro, signatureData, onUpgradePress }: FateSignatureProps) {
  const { colors } = useTheme()
  const { t } = useI18n()

  const text = signatureData?.signature ?? ''
  const explanation = signatureData?.explanation?.trim() ?? ''

  const handleRegeneratePress = () => {
    // Style customisation requires the (now-removed) LLM regen endpoint.
    // Surface the paywall — this is where future Pro rephrasing will live.
    onUpgradePress()
  }

  if (!text) {
    return (
      <View style={{ paddingHorizontal: 20, marginTop: -8, marginBottom: 24 }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' }}>
          {t('you_signature_empty')}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ paddingHorizontal: 20, marginTop: -8, marginBottom: 24 }}>
      <View style={{ gap: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: '300',
              color: colors.accent,
              letterSpacing: 2,
              lineHeight: 24,
            }}
          >
            「{text}」
          </Text>
          {!isPro ? (
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityLabel={t('you_signature_pro_hint')}
              onPress={handleRegeneratePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 12, marginBottom: 2, alignItems: 'flex-end' }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '400',
                  color: colors.textSecondary,
                  letterSpacing: 1,
                }}
              >
                ↻
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '300',
                  color: colors.textSecondary,
                  marginTop: 2,
                  maxWidth: 72,
                  textAlign: 'right',
                }}
                numberOfLines={2}
              >
                {t('you_signature_pro_hint')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {explanation && explanation !== text ? (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '300',
              color: colors.textSecondary,
              lineHeight: 18,
              paddingRight: 28,
            }}
          >
            {explanation}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
