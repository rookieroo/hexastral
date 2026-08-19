/**
 * DEV-only header chip — tap to cycle Off → PRO → FREE.
 */

import { useTheme } from '@zhop/core-ui'
import {
  type DevEntitlementOverride,
  getDevEntitlementOverride,
} from '@zhop/satellite-runtime'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text } from 'react-native'

import { cycleDevEntitlementOverride, devEntitlementLabel } from '@/lib/dev-pro-toggle'

export function DevProChip({ onChange }: { onChange?: () => void }) {
  const { colors, spacing } = useTheme()
  const [override, setOverride] = useState<DevEntitlementOverride>(
    __DEV__ ? getDevEntitlementOverride() : null
  )

  useFocusEffect(
    useCallback(() => {
      if (__DEV__) setOverride(getDevEntitlementOverride())
    }, [])
  )

  if (!__DEV__) return null

  return (
    <Pressable
      onPress={() => {
        void cycleDevEntitlementOverride().then((next) => {
          setOverride(next)
          onChange?.()
        })
      }}
      hitSlop={8}
      accessibilityRole='button'
      accessibilityLabel={`DEV Pro: ${devEntitlementLabel(override)}`}
      style={{
        borderWidth: 0.5,
        borderColor: override === 'pro' ? colors.accent : colors.separator,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          color: override === 'pro' ? colors.accent : colors.dim,
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        }}
      >
        {`DEV · ${devEntitlementLabel(override)}`}
      </Text>
    </Pressable>
  )
}
