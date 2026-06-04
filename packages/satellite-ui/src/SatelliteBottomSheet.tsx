/**
 * SatelliteBottomSheet — iOS-standard content-sized bottom sheet.
 *
 * 2026-06 rebuild (3rd revision). Earlier designs measured `innerCluster` via
 * `onLayout` and tried to grow the sheet from a `SHEET_MIN=200` floor up to
 * `SHEET_MAX=80%screen`. The flex chain (Animated.View with fixed height +
 * Pressable flex:1 + inner stretch column) silently CONSTRAINED the inner
 * content's measured height to the parent's `SHEET_MIN`, so the loop never
 * grew the sheet past 200pt and content overflowed off-screen.
 *
 * New design — pure iOS standard:
 *   - Bottom-anchored `Animated.View` sized BY content (no `height` style),
 *     capped at `maxHeight: 85% screen`. Beyond that, content clips (rare
 *     for paywalls / auth sheets; if a caller needs taller content they can
 *     wrap children in a ScrollView).
 *   - `translateY` slides the sheet from `SCREEN_HEIGHT` (off-screen below)
 *     up to 0. Spring on open, timing on close.
 *   - Backdrop dims independently via `opacity` fade for clean motion.
 *   - Pan-to-dismiss preserved (panResponder on the sheet).
 *   - Home-indicator safe-area baked in (Platform.OS=='ios' → 34pt bottom).
 *   - Rounded 14pt top corners, centered 36×4 handle, optional centered title.
 *
 * Back-compat: `placement` and `contentVerticalAlign` props accepted but
 * no-op'd in the bottom variant (the common case). Callers that explicitly
 * relied on the old `placement='center'` rendering should opt back in if /
 * when we re-add that variant.
 */
import { useTheme } from '@zhop/core-ui'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85
/** iPhone home-indicator clearance; Android safe-area handled by the OS. */
const HOME_INDICATOR_PADDING = Platform.OS === 'ios' ? 34 : 16

interface SatelliteBottomSheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Accepted for back-compat; bottom is the only variant in the 2026-06 rebuild. */
  placement?: 'bottom' | 'center'
  /** No-op in the 2026-06 rebuild — content top-aligns. Kept for back-compat. */
  contentVerticalAlign?: 'top' | 'center'
  /** When false, the sheet snaps in/out instantly — no slide/fade. Default true. */
  animated?: boolean
}

export function SatelliteBottomSheet({
  visible,
  onClose,
  title,
  children,
  animated = true,
}: SatelliteBottomSheetProps) {
  const { colors } = useTheme()
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const fade = useRef(new Animated.Value(0)).current
  // Lift the sheet above the keyboard so a TextInput inside it stays visible.
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height))
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  useEffect(() => {
    if (!animated) {
      // Instant snap — no slide/fade (e.g. cycle's For-you paywall).
      translateY.setValue(visible ? 0 : SCREEN_HEIGHT)
      fade.setValue(visible ? 1 : 0)
      return
    }
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT)
      fade.setValue(0)
      // Smooth ease-out slide — symmetric with close. Earlier revisions used
      // a critically-damped spring (damping=22, stiffness=280) but small users
      // perceived the deceleration as bounce; per 2026-06 feedback the open
      // animation is a plain timing curve (matches iOS sheet feel).
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible, translateY, fade, animated])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy)
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 100 || g.vy > 0.5) {
            onClose()
          } else {
            // Snap-back from a partial drag — matches the open curve (smooth
            // ease, no spring overshoot).
            Animated.timing(translateY, {
              toValue: 0,
              duration: 200,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start()
          }
        },
      }),
    [onClose, translateY]
  )

  return (
    <Modal transparent visible={visible} animationType='none' onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop — independent opacity fade. Tap to close. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', opacity: fade }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole='button'
            accessibilityLabel='Close'
          />
        </Animated.View>

        {/* Sheet — content-sized + bottom-anchored. */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              maxHeight: MAX_SHEET_HEIGHT,
              bottom: keyboardHeight,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.separator }]} />
          </View>
          {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  content: {
    paddingBottom: HOME_INDICATOR_PADDING,
  },
})
