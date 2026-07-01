/**
 * FengButton — feng's primary action button.
 *
 * core-ui's Button is intentionally square ("Ink Brutalism") and shared across
 * apps; feng's surfaces are rounded (FAB, fields, cards), so the square button
 * read as out-of-place. This is the rounded 铜金 button feng uses for primary
 * actions (生成报告, etc.).
 */

import { ActivityIndicator, Pressable, Text } from 'react-native'
import { FENG_PALETTE, spacing } from '@/lib/theme'

interface FengButtonProps {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}

export function FengButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = true,
}: FengButtonProps) {
  const off = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      style={{
        backgroundColor: off ? FENG_PALETTE.copperGoldMute : FENG_PALETTE.copperGold,
        borderRadius: 14,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        opacity: off ? 0.7 : 1,
      }}
    >
      {loading ? <ActivityIndicator color={FENG_PALETTE.night} /> : null}
      <Text style={{ color: FENG_PALETTE.night, fontWeight: '700', fontSize: 16 }}>{label}</Text>
    </Pressable>
  )
}
