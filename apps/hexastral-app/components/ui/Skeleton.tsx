/**
 * 骨架屏组件 — 加载占位符
 */

import { useEffect, useRef } from 'react'
import { Animated, useColorScheme, View } from 'react-native'
import { theme } from '@/lib/theme'

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string
  height: number
  borderRadius?: number
  style?: Record<string, unknown>
}) {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surface,
          opacity,
        },
        style,
      ]}
    />
  )
}

/** 周易记录骨架 */
export function YiChingRecordSkeleton() {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 0,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SkeletonBox width={80} height={22} borderRadius={6} />
            <SkeletonBox width={40} height={18} borderRadius={8} />
          </View>
          <SkeletonBox width='80%' height={16} borderRadius={4} style={{ marginTop: 8 }} />
          <SkeletonBox width='60%' height={14} borderRadius={4} style={{ marginTop: 6 }} />
          <SkeletonBox width={80} height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  )
}

/** 星宫记录骨架 */
export function StellarRecordSkeleton() {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.card,
            borderRadius: 0,
            padding: 16,
            marginBottom: 10,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <View>
              <SkeletonBox width={140} height={18} borderRadius={6} />
              <SkeletonBox width={180} height={14} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
            <SkeletonBox width={24} height={24} borderRadius={12} />
          </View>
          <SkeletonBox width={80} height={12} borderRadius={4} />
        </View>
      ))}
    </View>
  )
}
