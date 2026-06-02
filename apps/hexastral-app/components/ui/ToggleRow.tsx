/**
 * ToggleRow — boolean row backed by a custom animated Switch.
 *
 * Wrapped in React.memo so that only the row whose `value` actually
 * changed re-renders. Parent must provide a stable `onValueChange`
 * reference (via useMemo / useCallback) for memo to be effective.
 */

import { memo, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { Switch } from '@/components/ui/Switch'
import { useIosPalette } from '@/lib/theme'

export type ToggleRowVariant = 'default' | 'compact'

interface ToggleRowProps {
  label: string
  description?: string
  value: boolean
  onValueChange: (next: boolean) => void
  disabled?: boolean
  variant?: ToggleRowVariant
  /** Passed to inner Switch for touch target (compact rows benefit from ~12–14). */
  switchHitSlop?: number
  /** Rendered between label and switch (e.g. info icon). */
  endAccessory?: ReactNode
}

export const ToggleRow = memo(function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  variant = 'default',
  switchHitSlop,
  endAccessory,
}: ToggleRowProps) {
  const ios = useIosPalette()
  const isCompact = variant === 'compact'

  return (
    <View
      style={{
        width: '100%',
        minHeight: isCompact ? 32 : 40,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          numberOfLines={isCompact ? 1 : 2}
          style={{
            flex: 1,
            fontSize: isCompact ? 14 : 15,
            fontWeight: isCompact ? '400' : '500',
            color: ios.text,
          }}
        >
          {label}
        </Text>
        {endAccessory ? (
          <View style={{ flexShrink: 0, marginRight: 8, justifyContent: 'center' }}>
            {endAccessory}
          </View>
        ) : null}
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          hitSlop={switchHitSlop ?? (isCompact ? 14 : undefined)}
          style={
            isCompact
              ? { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }], flexShrink: 0 }
              : { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }], flexShrink: 0 }
          }
        />
      </View>
      {description ? (
        <Text
          style={{
            fontSize: 12,
            color: ios.secondary,
            lineHeight: 18,
            fontWeight: '300',
            marginTop: 4,
          }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  )
})
