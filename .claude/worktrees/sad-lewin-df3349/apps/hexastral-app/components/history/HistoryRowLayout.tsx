/**
 * History row — typography-first, single-row layout.
 *
 * Structure: [kind · time] left · [trailingMeta + delete + chevron] right on the same line.
 * Title and subtitles stack below the meta row.
 * No leading icon, no card borders — hairline bottom separators between rows.
 */

import { ChevronRight } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { IosPalette } from '@/lib/theme'

export type HistoryRowGroupPosition = 'single' | 'first' | 'middle' | 'last'

export function historyRowGroupPosition(length: number, index: number): HistoryRowGroupPosition {
  if (length <= 1) return 'single'
  if (index === 0) return 'first'
  if (index === length - 1) return 'last'
  return 'middle'
}

export interface HistoryRowLayoutProps {
  ios: IosPalette
  timeLabel: string
  leadingGlyph?: ReactNode | null
  kindBadge: ReactNode
  title: string
  subtitle?: string | null
  subtitleSecondary?: string | null
  trailingMeta?: string | null
  onPress: () => void
  endAccessory?: ReactNode
  showTrailingChevron?: boolean
  groupPosition?: HistoryRowGroupPosition
}

export function HistoryRowLayout({
  ios,
  timeLabel,
  kindBadge,
  title,
  subtitle,
  subtitleSecondary,
  trailingMeta,
  onPress,
  endAccessory,
  showTrailingChevron = true,
  groupPosition = 'single',
}: HistoryRowLayoutProps) {
  const showSeparator = groupPosition === 'first' || groupPosition === 'middle'
  const bottomGap = groupPosition === 'last' || groupPosition === 'single' ? 14 : 0

  return (
    <View style={{ marginBottom: bottomGap }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          paddingVertical: 14,
          paddingHorizontal: 4,
          backgroundColor: pressed ? ios.inkWash : 'transparent',
        })}
      >
        {/* Single top row: kind badge · time (left) + trailingMeta + delete + chevron (right) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {kindBadge}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '400',
                color: ios.dim,
                letterSpacing: 0.2,
              }}
            >
              · {timeLabel}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {trailingMeta ? (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '400',
                  color: ios.secondary,
                  textAlign: 'right',
                }}
                numberOfLines={1}
              >
                {trailingMeta.replace('\n', '  ')}
              </Text>
            ) : null}
            {endAccessory}
            {showTrailingChevron ? (
              <ChevronRight size={15} color={ios.dim} strokeWidth={1.8} />
            ) : null}
          </View>
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: ios.text,
            letterSpacing: -0.2,
            lineHeight: 21,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>

        {/* Subtitle */}
        {subtitle ? (
          <Text
            style={{
              fontSize: 13,
              fontWeight: '300',
              color: ios.secondary,
              lineHeight: 18,
              marginTop: 3,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}

        {/* Secondary subtitle */}
        {subtitleSecondary ? (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '300',
              color: ios.dim,
              lineHeight: 16,
              marginTop: 2,
            }}
            numberOfLines={2}
          >
            {subtitleSecondary}
          </Text>
        ) : null}
      </Pressable>

      {/* Bottom separator */}
      {showSeparator ? (
        <View
          style={{
            height: 0.5,
            backgroundColor: ios.separator,
          }}
        />
      ) : null}
    </View>
  )
}
