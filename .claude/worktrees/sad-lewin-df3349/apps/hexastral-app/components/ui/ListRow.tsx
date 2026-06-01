/**
 * ListRow — standard settings/list row with left icon, title/subtitle, right accessory.
 *
 * Ink Brutalism: 0px radius, 0.5px separator, monochrome icons.
 */

import { ChevronRight } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Text, TouchableOpacity, View, type ViewStyle } from 'react-native'
import { SPACING, useIosPalette } from '@/lib/theme'

interface ListRowProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  /** Right-side value text */
  value?: string
  /** Show chevron on the right (default: true when onPress is provided) */
  showChevron?: boolean
  /** Custom right accessory — replaces value + chevron */
  rightAccessory?: ReactNode
  /** Whether to show bottom separator (default: true) */
  separator?: boolean
  onPress?: () => void
  style?: ViewStyle
}

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  showChevron,
  rightAccessory,
  separator = true,
  onPress,
  style,
}: ListRowProps) {
  const ios = useIosPalette()
  const hasChevron = showChevron ?? !!onPress

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: SPACING.lg,
          gap: SPACING.md,
          borderBottomWidth: separator ? 0.5 : 0,
          borderBottomColor: ios.separator,
        },
        style,
      ]}
    >
      {icon ?? null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: ios.text }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: ios.secondary, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      {rightAccessory ?? (
        <>
          {value ? (
            <Text style={{ fontSize: 15, color: ios.secondary, marginRight: 4 }}>{value}</Text>
          ) : null}
          {hasChevron ? <ChevronRight size={16} color={ios.dim} strokeWidth={1.5} /> : null}
        </>
      )}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
        {content}
      </TouchableOpacity>
    )
  }

  return content
}
