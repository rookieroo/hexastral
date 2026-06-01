/**
 * ScreenLayout — standard back-button + scroll/view wrapper.
 */
import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import { Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView, type Edge } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'

interface IosPalette {
  bg: string
  text: string
}

interface ScreenLayoutProps {
  children: ReactNode
  ios: IosPalette
  /** Called when back button pressed. If undefined, back button is hidden. */
  onBack?: () => void
  edges?: Edge[]
  scrollable?: boolean
  contentStyle?: ViewStyle
  headerRight?: ReactNode
}

export function ScreenLayout({
  children,
  ios,
  onBack,
  edges = ['top', 'left', 'right'],
  scrollable = true,
  contentStyle,
  headerRight,
}: ScreenLayoutProps) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: ios.bg }}>
      {(onBack ?? headerRight) ? (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={{ paddingHorizontal: 20, paddingVertical: 12 }}
              hitSlop={12}
            >
              <ArrowLeft size={22} color={ios.text} strokeWidth={1} />
            </Pressable>
          ) : (
            <View />
          )}
          {headerRight ? <View style={{ paddingRight: 20 }}>{headerRight}</View> : null}
        </View>
      ) : null}
      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[{ paddingHorizontal: 24, paddingBottom: 48 }, contentStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  )
}
