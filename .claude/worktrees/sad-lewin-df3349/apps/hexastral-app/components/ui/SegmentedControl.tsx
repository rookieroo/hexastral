/**
 * SegmentedControl — Ink Brutalism segmented toggle.
 *
 * Visual rules:
 *   - Outer container: 0.5 px separator border, transparent fill, square corners.
 *   - Active segment: filled tint (`ios.tint`) with contrasting `ios.tintFg` text.
 *   - Inactive segment: transparent + `ios.text` text (full contrast, not muted).
 *
 * Previous design used a barely-visible 5–10 % accent overlay with secondary
 * text on inactive — both states read as low-contrast gray on light mode.
 */

import type { ViewStyle } from 'react-native'
import { Text, TouchableOpacity, View } from 'react-native'
import { useIosPalette } from '@/lib/theme'

export interface Segment<K extends string = string> {
  key: K
  label: string
}

interface SegmentedControlProps<K extends string = string> {
  segments: Segment<K>[]
  selected: K
  onChange: (key: K) => void
  style?: ViewStyle
}

export function SegmentedControl<K extends string>({
  segments,
  selected,
  onChange,
  style,
}: SegmentedControlProps<K>) {
  const ios = useIosPalette()
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          borderWidth: 0.5,
          borderColor: ios.separator,
          borderRadius: 0,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {segments.map((seg, i) => {
        const sel = selected === seg.key
        return (
          <TouchableOpacity
            key={seg.key}
            activeOpacity={0.7}
            onPress={() => onChange(seg.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              backgroundColor: sel ? ios.tint : `${ios.separator}26`,
              borderRadius: 0,
              alignItems: 'center',
              borderRightWidth: i < segments.length - 1 ? 0.5 : 0,
              borderRightColor: ios.separator,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: sel ? '500' : '400',
                color: sel ? ios.tintFg : ios.text,
                letterSpacing: 0.5,
              }}
            >
              {seg.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
