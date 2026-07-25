/**
 * Welcome → home logo “magic move”.
 *
 * Reanimated 4 has no sharedTransitionTag; we fly an absolute overlay from the
 * welcome logo frame to the home header logo frame, then reveal the real header mark.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Image, StyleSheet } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const LOGO = require('../assets/icon.png')

export const WELCOME_LOGO_SIZE = 72
export const HOME_LOGO_SIZE = 28

export interface LogoRect {
  x: number
  y: number
  width: number
  height: number
}

interface MorphApi {
  /** True while the flying logo covers the home mark (hide header Image). */
  morphActive: boolean
  beginFromWelcome: (from: LogoRect) => void
  landAtHome: (to: LogoRect) => void
}

const MorphContext = createContext<MorphApi | null>(null)

const EASE = Easing.bezier(0.32, 0.72, 0, 1)
const DURATION = 520

export function BrandLogoMorphProvider({ children }: { children: ReactNode }) {
  const [morphActive, setMorphActive] = useState(false)
  const visible = useSharedValue(0)
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const w = useSharedValue(WELCOME_LOGO_SIZE)
  const h = useSharedValue(WELCOME_LOGO_SIZE)
  const flyingRef = useRef(false)
  const pendingToRef = useRef<LogoRect | null>(null)
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSafety = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = null
    }
  }, [])

  const finish = useCallback(() => {
    clearSafety()
    visible.value = 0
    flyingRef.current = false
    pendingToRef.current = null
    setMorphActive(false)
  }, [clearSafety, visible])

  const animateTo = useCallback(
    (to: LogoRect) => {
      clearSafety()
      x.value = withTiming(to.x, { duration: DURATION, easing: EASE })
      y.value = withTiming(to.y, { duration: DURATION, easing: EASE })
      w.value = withTiming(to.width, { duration: DURATION, easing: EASE })
      h.value = withTiming(to.height, { duration: DURATION, easing: EASE }, (finished) => {
        if (finished) runOnJS(finish)()
      })
    },
    [clearSafety, finish, h, w, x, y]
  )

  const beginFromWelcome = useCallback(
    (from: LogoRect) => {
      clearSafety()
      x.value = from.x
      y.value = from.y
      w.value = from.width
      h.value = from.height
      visible.value = 1
      flyingRef.current = true
      setMorphActive(true)
      const queued = pendingToRef.current
      if (queued) {
        pendingToRef.current = null
        animateTo(queued)
      } else {
        safetyTimerRef.current = setTimeout(() => {
          if (flyingRef.current) finish()
        }, 1200)
      }
    },
    [animateTo, clearSafety, finish, h, visible, w, x, y]
  )

  const landAtHome = useCallback(
    (to: LogoRect) => {
      if (flyingRef.current) {
        animateTo(to)
        return
      }
      pendingToRef.current = to
    },
    [animateTo]
  )

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
    width: w.value,
    height: h.value,
    borderRadius: Math.max(6, w.value * 0.22),
  }))

  const api = useMemo(
    () => ({ morphActive, beginFromWelcome, landAtHome }),
    [morphActive, beginFromWelcome, landAtHome]
  )

  return (
    <MorphContext.Provider value={api}>
      {children}
      <Animated.View pointerEvents='none' style={[styles.fly, overlayStyle]}>
        <Image source={LOGO} style={styles.img} resizeMode='contain' />
      </Animated.View>
    </MorphContext.Provider>
  )
}

export function useBrandLogoMorph(): MorphApi {
  const ctx = useContext(MorphContext)
  if (!ctx) {
    return {
      morphActive: false,
      beginFromWelcome: () => {},
      landAtHome: () => {},
    }
  }
  return ctx
}

const styles = StyleSheet.create({
  fly: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    zIndex: 1000,
  },
  img: { width: '100%', height: '100%' },
})
