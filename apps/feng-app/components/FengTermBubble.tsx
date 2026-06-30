/**
 * FengTermBubble — tap a 风水 term in report prose → plain-language definition.
 *
 * Yuel's TermBubble pattern, feng-domain + 宣纸 styled: a bottom sheet on paper
 * with the term, its category, the definition, and the classical 出处. Pure RN +
 * reanimated (no Skia). Driven by `term` — null hides it.
 */

import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { type FengTerm, fengCategoryLabel, fengTermDef, fengTermPinyin } from '@/lib/feng-terms'
import { resolveLocale } from '@/lib/i18n'
import { FENG_PAPER, spacing } from '@/lib/theme'

interface FengTermBubbleProps {
  term: FengTerm | null
  onClose: () => void
  /** Optional "ask AI about this term" hook (seeds chat). */
  onAsk?: (term: FengTerm) => void
  sourceLabel?: string
  askLabel?: string
}

export function FengTermBubble({
  term,
  onClose,
  onAsk,
  sourceLabel,
  askLabel,
}: FengTermBubbleProps) {
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const visible = term !== null

  return (
    <Modal visible={visible} transparent animationType='none' onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(160)}
        style={{ flex: 1, backgroundColor: 'rgba(20,15,11,0.38)', justifyContent: 'flex-end' }}
      >
        {/* backdrop — tap to dismiss */}
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole='button' />
        {term ? (
          <Animated.View
            entering={SlideInDown.duration(240)}
            style={{
              backgroundColor: FENG_PAPER.bg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: insets.bottom + spacing.xl,
              borderTopWidth: 1,
              borderColor: FENG_PAPER.hair,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: FENG_PAPER.hair,
                marginBottom: spacing.md,
              }}
            />
            <Text
              style={{
                color: FENG_PAPER.bronze,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {fengCategoryLabel(term.category, locale)}
            </Text>
            <Text style={{ color: FENG_PAPER.ink, fontSize: 24, fontWeight: '700' }}>
              {term.term}
            </Text>
            {fengTermPinyin(term, locale) ? (
              <Text
                style={{ color: FENG_PAPER.muted, fontSize: 14, fontStyle: 'italic', marginTop: 2 }}
              >
                {fengTermPinyin(term, locale)}
              </Text>
            ) : null}
            <View
              style={{ height: 1, backgroundColor: FENG_PAPER.hair, marginVertical: spacing.md }}
            />
            <ScrollView style={{ maxHeight: 280 }}>
              <Text style={{ color: FENG_PAPER.inkSoft, fontSize: 16, lineHeight: 26 }}>
                {fengTermDef(term, locale)}
              </Text>
              {term.source ? (
                <Text
                  style={{
                    color: FENG_PAPER.muted,
                    fontSize: 13,
                    fontStyle: 'italic',
                    marginTop: spacing.md,
                  }}
                >
                  {sourceLabel ? `${sourceLabel} ` : ''}
                  {term.source}
                </Text>
              ) : null}
            </ScrollView>
            {onAsk ? (
              <Pressable
                onPress={() => onAsk(term)}
                accessibilityRole='button'
                style={{
                  marginTop: spacing.lg,
                  alignSelf: 'flex-start',
                  paddingVertical: spacing.sm,
                }}
              >
                <Text
                  style={{
                    color: FENG_PAPER.cinnabar,
                    fontSize: 14,
                    fontWeight: '600',
                    textDecorationLine: 'underline',
                  }}
                >
                  {askLabel ?? 'Ask about this'}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </Animated.View>
    </Modal>
  )
}
