/**
 * DetailHeader — shared top navigation bar for all detail pages.
 *
 * Layout: [← back]  [centered title]  [bookmark icon]
 *
 * titleVariant:
 *   'large'  — fontSize 17, fontWeight '600' (yiching, stellar style)
 *   'micro'  — fontSize 12, fontWeight '500', uppercase + letterSpacing 3 (fate style)
 */

import { ArrowLeft, Bookmark, BookmarkCheck, Share2 } from 'lucide-react-native'
import { Pressable, Text, useColorScheme, View } from 'react-native'
import { theme } from '@/lib/theme'

interface DetailHeaderProps {
  title: string
  onBack: () => void
  /** Whether the item is bookmarked — omit to hide the bookmark icon */
  bookmarked?: boolean
  /** Tap handler for bookmark — omit to hide the bookmark icon */
  onBookmark?: () => void
  /** Tap handler for the share icon — omit to hide the icon */
  onShare?: () => void
  titleVariant?: 'large' | 'micro'
  /** Color for the filled BookmarkCheck icon — defaults to colors.accent */
  bookmarkAccentColor?: string
  showBottomBorder?: boolean
}

export function DetailHeader({
  title,
  bookmarked,
  onBack,
  onBookmark,
  onShare,
  titleVariant = 'large',
  bookmarkAccentColor,
  showBottomBorder = false,
}: DetailHeaderProps) {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const accentColor = bookmarkAccentColor ?? colors.accent

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: showBottomBorder ? 0.5 : 0,
        borderBottomColor: colors.border,
      }}
    >
      <Pressable onPress={onBack} style={{ padding: 8 }}>
        <ArrowLeft
          size={titleVariant === 'micro' ? 22 : 24}
          color={colors.text}
          strokeWidth={titleVariant === 'micro' ? 1.5 : 2}
        />
      </Pressable>

      <Text
        style={
          titleVariant === 'micro'
            ? {
                fontSize: 12,
                fontWeight: '500',
                color: colors.text,
                letterSpacing: 3,
                textTransform: 'uppercase',
              }
            : {
                fontSize: 17,
                fontWeight: '600',
                color: colors.text,
              }
        }
      >
        {title}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {onShare && (
          <Pressable onPress={onShare} style={{ padding: 8 }}>
            <Share2
              size={titleVariant === 'micro' ? 18 : 20}
              color={colors.textSecondary}
              strokeWidth={titleVariant === 'micro' ? 1.5 : 2}
            />
          </Pressable>
        )}
        {onBookmark != null && (
          <Pressable onPress={onBookmark} style={{ padding: 8 }}>
            {bookmarked ? (
              <BookmarkCheck
                size={titleVariant === 'micro' ? 20 : 22}
                color={accentColor}
                strokeWidth={titleVariant === 'micro' ? 1.5 : 2}
              />
            ) : (
              <Bookmark
                size={titleVariant === 'micro' ? 20 : 22}
                color={colors.textSecondary}
                strokeWidth={titleVariant === 'micro' ? 1.5 : 2}
              />
            )}
          </Pressable>
        )}
      </View>
    </View>
  )
}
