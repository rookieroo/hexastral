/**
 * TermBubble — tap-to-explain for 命理 terms in Xingqi report prose.
 */

import type { ResolvedTerm } from '@zhop/astro-i18n'
import { Modal, Pressable, Text, View } from 'react-native'

export function TermBubble({
  term,
  onClose,
  cjk,
  colors,
}: {
  term: ResolvedTerm | null
  onClose: () => void
  cjk: boolean
  colors: { bg: string; ink: string; muted: string; accent: string }
}) {
  return (
    <Modal visible={term != null} transparent animationType='fade' onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: '#0a0a0acc',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        {term ? (
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              maxWidth: 380,
              width: '100%',
              backgroundColor: colors.bg,
              paddingVertical: 22,
              paddingHorizontal: 24,
              gap: 10,
              borderWidth: 0.5,
              borderColor: colors.muted,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <Text
                style={{
                  fontFamily: 'CrimsonPro',
                  fontSize: 22,
                  color: colors.ink,
                }}
              >
                {term.zh}
              </Text>
              {!cjk && term.pinyin ? (
                <Text
                  style={{
                    fontFamily: 'IBMPlexMono',
                    fontSize: 12,
                    color: colors.muted,
                  }}
                >
                  {term.pinyin}
                </Text>
              ) : null}
            </View>
            <Text style={{ color: colors.ink, fontSize: 15, lineHeight: 24 }}>
              {term.short}
            </Text>
            {term.long ? (
              <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>{term.long}</Text>
            ) : null}
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  )
}
