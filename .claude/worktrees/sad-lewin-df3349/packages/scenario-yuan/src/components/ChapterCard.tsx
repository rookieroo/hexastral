/**
 * ChapterCard — single chapter of a SynastryReport, rendered as a vertical card.
 *
 * Structure (top to bottom):
 *   - Header: chapter index (01/06) + chapter title in seal-script style
 *   - Hero visual area (optional): radar chart / timeline / icon
 *   - Golden line: 1–3 sentence quotable line in larger title type
 *   - Body: 150–250 word interpretation
 *   - Footer: share button (cinnabar seal icon) + chapter nav hint
 *
 * The card is meant to be displayed inside a `ChapterPager` that snaps
 * horizontally. Each card occupies the full viewport width.
 */

import { Pressable, Text, View, ScrollView } from 'react-native'
import { yuanLight, yuanType, yuanSpacing } from '@zhop/hexastral-tokens/yuan'
import { cinnabar, ink } from '@zhop/hexastral-tokens'
import type { SynastryChapter } from '../types'

const CHAPTER_TITLES: Record<SynastryChapter['kind'], string> = {
  first_impression: '第一印象',
  communication: '沟通方式',
  conflict: '冲突源头',
  complement: '互补之处',
  monthly_outlook: '本月运势',
  long_term_advice: '长期建议',
}

export interface ChapterCardProps {
  chapter: SynastryChapter
  /** 0-indexed position in the report (for header display) */
  index: number
  /** Total chapter count (for header display) */
  total: number
  /** Tap the cinnabar share icon — opens share sheet for this chapter */
  onShare: () => void
}

export function ChapterCard({ chapter, index, total, onShare }: ChapterCardProps) {
  const title = CHAPTER_TITLES[chapter.kind] ?? chapter.title

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: yuanLight.bg }}
      contentContainerStyle={{
        paddingHorizontal: yuanSpacing.screenH,
        paddingTop: yuanSpacing.xxl,
        paddingBottom: yuanSpacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: yuanSpacing.xl,
        }}
      >
        <Text style={[yuanType.seal, { color: yuanLight.textMuted }]}>
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </Text>
        <Text style={[yuanType.caption, { color: yuanLight.textSecondary }]}>{title}</Text>
      </View>

      {/* Hero visual area — only rendered if chapter provides visualData */}
      {chapter.visualData != null && (
        <View
          style={{
            height: 200,
            marginBottom: yuanSpacing.xl,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Caller is expected to render the visual via a separate slot; for now,
              this is a placeholder hairline frame that signals "image here". */}
          <View
            style={{
              width: '60%',
              height: '100%',
              borderWidth: 0.5,
              borderColor: yuanLight.border,
            }}
          />
        </View>
      )}

      {/* Golden line — the quotable, screenshot-worthy lead */}
      <Text
        style={[
          yuanType.title,
          {
            color: yuanLight.text,
            marginBottom: yuanSpacing.xl,
          },
        ]}
      >
        {chapter.goldenLine}
      </Text>

      {/* Body — full interpretation */}
      <Text
        style={[
          yuanType.body,
          {
            color: yuanLight.text,
            marginBottom: yuanSpacing.xxl,
          },
        ]}
      >
        {chapter.body}
      </Text>

      {/* Footer — share affordance */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingTop: yuanSpacing.lg,
          borderTopWidth: 0.5,
          borderTopColor: yuanLight.border,
        }}
      >
        <Pressable onPress={onShare} hitSlop={12}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: cinnabar.seal,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 16, color: ink.gold }}>緣</Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  )
}
