/**
 * GlossaryExpander — 折叠式术语深度解释卡片
 *
 * 在入门模式下，于 detail 页关键术语节点（日主、格局、命主、当前大运）
 * 后渲染可展开的 Markdown 长释义。
 *
 * - 默认折叠，只显示 title + chevron
 * - 展开后渲染 bodyMd（当前用 Text 节点；可扩展为 react-native-markdown-display）
 * - 若该 key 无词库内容则渲染 null
 */

import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { GlossaryItem } from '@/lib/hooks/useGlossaryQuery'
import { useTheme } from '@/lib/theme'
import { hapticLight } from '@/lib/ux/haptics'

interface GlossaryExpanderProps {
  item: GlossaryItem
}

export function GlossaryExpander({ item }: GlossaryExpanderProps) {
  const [expanded, setExpanded] = useState(false)
  const { colors, isDark } = useTheme()

  const ios = {
    card: isDark ? '#18181B' : '#FFFFFF',
    separator: isDark ? '#27272A' : '#E4E4E7',
    text: isDark ? '#FAFAFA' : '#09090B',
    secondary: isDark ? '#A1A1AA' : '#71717A',
    accent: colors.accent,
    dim: isDark ? '#52525B' : '#A1A1AA',
  }

  function toggle() {
    hapticLight()
    setExpanded((p) => !p)
  }

  // Split bodyMd into paragraphs (crude renderer: **bold** → treat as-is in Text)
  const paragraphs = item.bodyMd
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: ios.separator,
        borderRadius: 0,
        overflow: 'hidden',
        marginTop: 6,
      }}
    >
      {/* Header row */}
      <Pressable
        onPress={toggle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: ios.card,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <View
            style={{
              width: 3,
              height: 14,
              backgroundColor: ios.accent,
              borderRadius: 1,
            }}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: ios.text,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={14} color={ios.dim} />
        ) : (
          <ChevronDown size={14} color={ios.dim} />
        )}
      </Pressable>

      {/* Body */}
      {expanded && (
        <View
          style={{
            backgroundColor: ios.card,
            paddingHorizontal: 14,
            paddingTop: 0,
            paddingBottom: 14,
            gap: 8,
            borderTopWidth: 0.5,
            borderTopColor: ios.separator,
          }}
        >
          {paragraphs.map((para, idx) => (
            <Text
              // biome-ignore lint/suspicious/noArrayIndexKey: stable static content
              key={idx}
              style={{
                fontSize: 13,
                lineHeight: 20,
                color: para.startsWith('**') ? ios.text : ios.secondary,
              }}
            >
              {para.replace(/\*\*(.*?)\*\*/g, '$1')}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}
