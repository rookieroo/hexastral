/**
 * ShareableChapterCard — 9:16 portrait card meant to be captured as PNG and
 * shared to IG Story / 小红书 / X / WeChat.
 *
 * Renders the chapter's `goldenLine` as the star of the card with minimal
 * supporting context (chapter title, two bond names, Yuán cinnabar seal).
 * Designed to be the universal "viral artefact" — when a user screenshots and
 * posts, the seal + glyph are immediately recognizable.
 *
 * Capture flow (caller responsibility):
 *   1. Render this in an off-screen `View` ref
 *   2. `react-native-view-shot` → captureRef → PNG
 *   3. `expo-sharing` or system share sheet
 *
 * Or alternatively render server-side via svc-poster (existing
 * `@zhop/portfolio-posters` package can be extended).
 *
 * IMPORTANT: this component must NEVER include the body text. Only the golden
 * line is the share artefact. Body text is what the post link drives users to.
 */

import { Text, View, type ViewProps } from 'react-native'
import { cinnabar, ink, ricePaper } from '@zhop/hexastral-tokens'
import { yuanType, yuanSpacing } from '@zhop/hexastral-tokens/yuan'
import type { SynastryChapter } from '../types'

const CHAPTER_TITLES: Record<SynastryChapter['kind'], string> = {
  first_impression: '第一印象',
  communication: '沟通方式',
  conflict: '冲突源头',
  complement: '互补之处',
  monthly_outlook: '本月运势',
  long_term_advice: '长期建议',
}

export interface ShareableChapterCardProps extends Omit<ViewProps, 'style'> {
  chapter: SynastryChapter
  selfName: string
  otherName: string
  /** Render size — default 1080x1920 for IG Story; reduce for inline preview */
  width?: number
  height?: number
  /** Optional brand URL shown at footer (e.g., yuan.hexastral.com) */
  brandUrl?: string
}

export function ShareableChapterCard({
  chapter,
  selfName,
  otherName,
  width = 1080,
  height = 1920,
  brandUrl = 'yuan.hexastral.com',
  ...rest
}: ShareableChapterCardProps) {
  // Aspect-ratio scaler — design is authored against 1080x1920
  const scale = width / 1080
  const s = (n: number) => Math.round(n * scale)

  const title = CHAPTER_TITLES[chapter.kind] ?? chapter.title

  return (
    <View
      {...rest}
      style={{
        width,
        height,
        backgroundColor: ricePaper.ivory,
        paddingHorizontal: s(80),
        paddingVertical: s(120),
        justifyContent: 'space-between',
      }}
    >
      {/* Top — chapter marker */}
      <View style={{ alignItems: 'center', gap: s(yuanSpacing.md) }}>
        <Text
          style={{
            fontSize: s(yuanType.seal.fontSize),
            lineHeight: s(yuanType.seal.lineHeight),
            fontWeight: '700',
            letterSpacing: s(yuanType.seal.letterSpacing),
            color: ink.brown,
            textTransform: 'uppercase',
          }}
        >
          Chapter
        </Text>
        <Text
          style={{
            fontSize: s(48),
            color: ink.gold,
            fontWeight: '300',
          }}
        >
          {title}
        </Text>
      </View>

      {/* Center — the golden line, the star of the card */}
      <Text
        style={{
          fontSize: s(72),
          lineHeight: s(96),
          fontWeight: '300',
          letterSpacing: -1,
          color: ink.brown,
          textAlign: 'center',
        }}
      >
        {chapter.goldenLine}
      </Text>

      {/* Bottom — names + seal + brand */}
      <View style={{ alignItems: 'center', gap: s(yuanSpacing.lg) }}>
        <Text
          style={{
            fontSize: s(36),
            lineHeight: s(48),
            color: ink.brown,
            opacity: 0.65,
            letterSpacing: s(4),
          }}
        >
          {selfName} · {otherName}
        </Text>

        <View
          style={{
            width: s(160),
            height: s(160),
            borderRadius: s(80),
            backgroundColor: cinnabar.seal,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: s(88),
              lineHeight: s(104),
              color: ink.gold,
              fontWeight: '400',
            }}
          >
            緣
          </Text>
        </View>

        <Text
          style={{
            fontSize: s(28),
            color: ink.brown,
            opacity: 0.4,
            letterSpacing: s(2),
          }}
        >
          {brandUrl}
        </Text>
      </View>
    </View>
  )
}
