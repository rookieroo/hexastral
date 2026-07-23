/**
 * ShareableChatCard — preview-first chat share card (Syel / Yuel / Kanyu).
 * Host passes brand logo + name + URL. Full message text by default.
 */

import { forwardRef } from 'react'
import {
  Image,
  type ImageSourcePropType,
  Text,
  View,
  type ViewProps,
} from 'react-native'

const PAPER = '#F7F4EE'
const INK = '#1C1914'
const INK_MUTED = '#7A7368'
const ASSISTANT_BUBBLE = '#E8E2D6'

export type ChatShareLine = {
  role: 'user' | 'assistant'
  content: string
}

export interface ShareableChatCardProps extends Omit<ViewProps, 'style'> {
  lines: ChatShareLine[]
  brandName: string
  brandUrl: string
  logoSource: ImageSourcePropType
  /** User bubble fill — brand accent. */
  userBubbleColor?: string
  width?: number
  /** Soft cap only; default keeps full selected messages. */
  maxCharsPerLine?: number
}

function clip(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export const ShareableChatCard = forwardRef<View, ShareableChatCardProps>(
  function ShareableChatCard(
    {
      lines,
      brandName,
      brandUrl,
      logoSource,
      userBubbleColor = '#2F6F5E',
      width = 780,
      maxCharsPerLine = 12_000,
      ...rest
    },
    ref
  ) {
    const pad = Math.round(width * 0.07)
    const logo = Math.round(width * 0.09)

    return (
      <View
        {...rest}
        ref={ref}
        collapsable={false}
        style={{
          width,
          backgroundColor: PAPER,
          paddingHorizontal: pad,
          paddingTop: pad,
          paddingBottom: Math.round(pad * 0.85),
          gap: Math.round(pad * 0.55),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={logoSource} style={{ width: logo, height: logo }} resizeMode='contain' />
          <Text
            style={{
              fontSize: Math.round(width * 0.055),
              fontWeight: '700',
              color: INK,
              letterSpacing: 0.5,
            }}
          >
            {brandName}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {lines.map((line, i) => {
            const isUser = line.role === 'user'
            return (
              <View
                key={`${i}-${line.role}`}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  backgroundColor: isUser ? userBubbleColor : ASSISTANT_BUBBLE,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderBottomRightRadius: isUser ? 2 : 12,
                  borderBottomLeftRadius: isUser ? 12 : 2,
                }}
              >
                <Text
                  style={{
                    fontSize: Math.round(width * 0.038),
                    lineHeight: Math.round(width * 0.055),
                    color: isUser ? '#F7F4EE' : INK,
                  }}
                >
                  {clip(line.content, maxCharsPerLine)}
                </Text>
              </View>
            )
          })}
        </View>

        <Text
          style={{
            marginTop: 4,
            fontSize: Math.round(width * 0.028),
            color: INK_MUTED,
            letterSpacing: 0.3,
          }}
        >
          {brandUrl}
        </Text>
      </View>
    )
  }
)
