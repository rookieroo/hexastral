/**
 * FortuneBlurWall — 运势付费墙
 *
 * Free 用户看到情绪钉子 + 模糊预览 + Upgrade CTA。
 * Pro 用户直接渲染 children。
 */

import { Pressable, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface FortuneBlurWallProps {
  isPro: boolean
  preview: string
  onUpgrade: () => void
  children: React.ReactNode
  /** 情绪钉子——命盘中最扭转用户的一句话，显示在模糊内容的上方 */
  hook?: string | null
}

export function FortuneBlurWall({
  isPro,
  preview,
  onUpgrade,
  children,
  hook,
}: FortuneBlurWallProps) {
  const { colors } = useTheme()
  const { t } = useI18n()

  if (isPro) return <>{children}</>

  const ios = {
    text: colors.text,
    secondary: colors.textSecondary,
    tint: colors.primary,
    accent: colors.accent,
  }

  return (
    <View style={{ gap: 16 }}>
      {/* 情绪钉子（可选） */}
      {hook ? (
        <Text
          style={{
            fontSize: 18,
            fontWeight: '300',
            color: ios.accent,
            lineHeight: 28,
            letterSpacing: -0.3,
            fontStyle: 'italic',
          }}
        >
          “{hook}”
        </Text>
      ) : null}

      {/* 模糊预览 — 正常流，无绝对定位 */}
      <Text
        numberOfLines={4}
        style={{
          fontSize: 15,
          fontWeight: '500',
          color: ios.tint,
          lineHeight: 24,
          textAlign: 'center',
        }}
      >
        {preview}
      </Text>

      {/* 解锁 CTA */}
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Pressable onPress={onUpgrade} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: ios.tint,
              letterSpacing: 1,
              textDecorationLine: 'underline',
            }}
          >
            {t('fortune_unlock_pro')} ›
          </Text>
        </Pressable>

        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: ios.secondary,
            letterSpacing: 0.3,
          }}
        >
          {t('fortune_social_proof')}
        </Text>
      </View>
    </View>
  )
}
