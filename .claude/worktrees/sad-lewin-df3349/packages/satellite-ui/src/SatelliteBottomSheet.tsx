import { getTokens } from '@zhop/hexastral-tokens/palette'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')
const SHEET_MAX = SCREEN_HEIGHT * 0.8
const SHEET_MIN = 200

interface SatelliteBottomSheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** `bottom`: docked sheet (default). `center`: centered card on dimmed backdrop. */
  placement?: 'bottom' | 'center'
  /** When `bottom`, vertically centers short content inside the sheet. Ignored when `placement` is `center` (already centered). */
  contentVerticalAlign?: 'top' | 'center'
}

export function SatelliteBottomSheet({
  visible,
  onClose,
  title,
  children,
  placement = 'bottom',
  contentVerticalAlign = 'center',
}: SatelliteBottomSheetProps) {
  const isDark = useColorScheme() === 'dark'
  const colors = getTokens(isDark)
  const translateY = useRef(new Animated.Value(SHEET_MAX)).current
  const fade = useRef(new Animated.Value(0)).current
  const [measuredInnerHeight, setMeasuredInnerHeight] = useState(0)
  const sheetHeightRef = useRef(SHEET_MIN)

  const sheetHeight = useMemo(() => {
    if (measuredInnerHeight <= 0) return SHEET_MIN
    return Math.min(Math.max(measuredInnerHeight, SHEET_MIN), SHEET_MAX)
  }, [measuredInnerHeight])

  const cardWidth = Math.min(SCREEN_WIDTH * 0.92, 400)

  useEffect(() => {
    sheetHeightRef.current = sheetHeight
  }, [sheetHeight])

  useEffect(() => {
    if (!visible) setMeasuredInnerHeight(0)
  }, [visible])

  useEffect(() => {
    if (!visible) return
    if (placement === 'center') {
      fade.setValue(0)
      translateY.setValue(12)
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 240,
        }),
      ]).start()
      return
    }
    translateY.setValue(sheetHeightRef.current)
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 220,
    }).start()
  }, [visible, translateY, fade, placement])

  const onInnerLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    const h = e.nativeEvent.layout.height
    if (h > 0) setMeasuredInnerHeight(h)
  }, [])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy)
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 100 || gestureState.vy > 0.5) {
            onClose()
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 220,
            }).start()
          }
        },
      }),
    [onClose, translateY]
  )

  const handleBackdropPress = useCallback(() => {
    onClose()
  }, [onClose])

  const isCenter = placement === 'center'
  const innerCluster = (
    <View onLayout={onInnerLayout} style={styles.innerMeasured}>
      <View style={styles.handleRow}>
        <View style={[styles.handle, { backgroundColor: colors.separator }]} />
      </View>
      {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
      {children}
    </View>
  )

  return (
    <Modal transparent visible={visible} animationType='none' onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, isCenter ? styles.backdropCentered : styles.backdropBottom]}
        onPress={handleBackdropPress}
        accessibilityRole='button'
        accessibilityLabel='Close'
      >
        <Animated.View
          style={[
            {
              backgroundColor: colors.bg,
              borderColor: colors.separator,
              transform: [{ translateY }],
              ...(isCenter
                ? {
                    opacity: fade,
                    width: cardWidth,
                    height: sheetHeight,
                    borderWidth: StyleSheet.hairlineWidth,
                  }
                : {
                    height: sheetHeight,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderLeftWidth: StyleSheet.hairlineWidth,
                    borderRightWidth: StyleSheet.hairlineWidth,
                    alignSelf: 'stretch',
                  }),
            },
          ]}
          {...(placement === 'bottom' ? panResponder.panHandlers : undefined)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheetInner}>
            {placement === 'bottom' && contentVerticalAlign === 'center' ? (
              <View style={styles.sheetBodyFill}>
                <View style={styles.sheetBodyCenter}>{innerCluster}</View>
              </View>
            ) : (
              innerCluster
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropBottom: {
    justifyContent: 'flex-end',
  },
  backdropCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sheetInner: {
    alignSelf: 'stretch',
    flexGrow: 0,
    flex: 1,
  },
  sheetBodyFill: {
    flex: 1,
    minHeight: 0,
  },
  sheetBodyCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  innerMeasured: {
    alignSelf: 'stretch',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
})
