/**
 * Profile 共享原子组件 — 列表行 + 区块标题
 *
 * Ink-Brutalism: 文字优先, 不带装饰图标, 不带圆角.
 */

import { ChevronRight } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { useIosPalette } from '@/lib/theme'

export interface ProfileRowProps {
  label: string
  labelColor?: string
  detail?: string
  showChevron?: boolean
  onPress: () => void
  isLast?: boolean
}

export function ProfileRow({
  label,
  labelColor,
  detail,
  showChevron = true,
  onPress,
  isLast = false,
}: ProfileRowProps) {
  const ios = useIosPalette()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: isLast ? 0 : 0.5,
          borderBottomColor: ios.separator,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '300', color: labelColor ?? ios.text, flex: 1 }}>
          {label}
        </Text>
        {detail ? (
          <Text style={{ fontSize: 14, color: ios.secondary, marginRight: 6 }}>{detail}</Text>
        ) : null}
        {showChevron && <ChevronRight size={14} color={ios.dim} />}
      </View>
    </Pressable>
  )
}

/** 命/运/道/账 区块标题 — 中文字 + 大写英文标签 */
export function SectionLabel({ glyph, title }: { glyph: string; title: string }) {
  const ios = useIosPalette()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 10,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '300', color: ios.accent }}>{glyph}</Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '400',
          color: ios.sectionLabel,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
    </View>
  )
}

/** 卡片容器 — 全部 Profile 子卡通用边框 + 背景 */
export function ProfileCard({
  children,
  marginBottom = 0,
}: {
  children: React.ReactNode
  marginBottom?: number
}) {
  const ios = useIosPalette()
  return (
    <View
      style={{
        marginHorizontal: 16,
        borderWidth: 0.5,
        borderColor: ios.separator,
        backgroundColor: ios.card,
        marginBottom,
      }}
    >
      {children}
    </View>
  )
}
