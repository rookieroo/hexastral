/**
 * FacingCalibrator — satellite tile + bearing picker.
 *
 * Map tap (true north) or pan fallback. Worklet helpers must live in this file
 * so the Reanimated Babel plugin compiles them (cross-module worklets crash on device).
 */

import * as Haptics from 'expo-haptics'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { Image, type ImageSourcePropType, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { normalizeFengDeg } from '../lib/facing-deg'
import { BaguaCompassOverlay } from './BaguaCompassOverlay'

function normalizeFengDegWorklet(deg: number): number {
  'worklet'
  return ((deg % 360) + 360) % 360
}

function pointToFengDegWorklet(x: number, y: number, center: number): number {
  'worklet'
  const dx = x - center
  const dy = y - center
  const svgDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  return normalizeFengDegWorklet(svgDeg + 90)
}

export interface FacingCalibratorProps {
  satelliteSource?: ImageSourcePropType
  size?: number
  initialFacingDeg?: number
  onChange?: (facingDegTrue: number) => void
  arrowColor?: string
  showSitArrow?: boolean
  doorDeg?: number
  onDoorChange?: (doorDegTrue: number) => void
  liveHeadingDeg?: number | null
  /** Which arrow drag adjusts when unit-door mode is on. */
  editTarget?: 'face' | 'door'
  ringRotation?: number
}

const SIT_COLOR = '#9B2226'
const DOOR_COLOR = '#3A86FF'
const FACING_SPRING = { damping: 18, stiffness: 220, mass: 1 } as const

function lightImpact(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
}

export const FacingCalibrator = memo(function FacingCalibrator({
  satelliteSource,
  size = 320,
  initialFacingDeg = 180,
  onChange,
  arrowColor = '#E6B450',
  showSitArrow = false,
  doorDeg,
  onDoorChange,
  liveHeadingDeg = null,
  editTarget = 'face',
  ringRotation = 0,
}: FacingCalibratorProps) {
  const center = size / 2

  const facingDeg = useSharedValue(normalizeFengDeg(initialFacingDeg))
  const doorDegSv = useSharedValue(normalizeFengDeg(doorDeg ?? initialFacingDeg))
  const doorMode = useSharedValue(doorDeg !== undefined ? 1 : 0)
  const forcedTarget = useSharedValue(editTarget === 'door' ? 1 : 0)
  const dragTarget = useSharedValue(0)

  useEffect(() => {
    facingDeg.value = normalizeFengDeg(initialFacingDeg)
  }, [initialFacingDeg, facingDeg])

  useEffect(() => {
    const hasDoor = doorDeg !== undefined
    doorMode.value = hasDoor ? 1 : 0
    forcedTarget.value = editTarget === 'door' ? 1 : 0
    if (hasDoor) {
      doorDegSv.value = normalizeFengDeg(doorDeg)
    }
  }, [doorDeg, doorDegSv, doorMode, editTarget, forcedTarget])

  const emitFacing = useCallback(
    (deg: number) => {
      onChange?.(deg)
      lightImpact()
    },
    [onChange]
  )

  const emitDoor = useCallback(
    (deg: number) => {
      onDoorChange?.(deg)
      lightImpact()
    },
    [onDoorChange]
  )

  const gestures = useMemo(() => {
    const pan = Gesture.Pan()
      .onBegin((e) => {
        'worklet'
        const fengDeg = pointToFengDegWorklet(e.x, e.y, center)
        if (doorMode.value === 0) {
          dragTarget.value = 0
        } else {
          dragTarget.value = forcedTarget.value
        }
        if (dragTarget.value === 1) {
          doorDegSv.value = fengDeg
        } else {
          facingDeg.value = fengDeg
        }
        runOnJS(lightImpact)()
      })
      .onChange((e) => {
        'worklet'
        const fengDeg = pointToFengDegWorklet(e.x, e.y, center)
        if (dragTarget.value === 1) {
          doorDegSv.value = fengDeg
        } else {
          facingDeg.value = fengDeg
        }
      })
      .onEnd((e) => {
        'worklet'
        const fengDeg = pointToFengDegWorklet(e.x, e.y, center)
        const final = Math.round(fengDeg)
        if (dragTarget.value === 1) {
          doorDegSv.value = withSpring(final, FACING_SPRING)
          runOnJS(emitDoor)(final)
        } else {
          facingDeg.value = withSpring(final, FACING_SPRING)
          runOnJS(emitFacing)(final)
        }
      })

    const tap = Gesture.Tap().onEnd((e) => {
      'worklet'
      const fengDeg = pointToFengDegWorklet(e.x, e.y, center)
      const target = doorMode.value === 0 ? 0 : forcedTarget.value
      const final = Math.round(fengDeg)
      if (target === 1) {
        doorDegSv.value = withSpring(final, FACING_SPRING)
        runOnJS(emitDoor)(final)
      } else {
        facingDeg.value = withSpring(final, FACING_SPRING)
        runOnJS(emitFacing)(final)
      }
    })

    return Gesture.Simultaneous(pan, tap)
  }, [center, doorDegSv, dragTarget, emitDoor, emitFacing, facingDeg, forcedTarget, doorMode])

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${facingDeg.value}deg` }],
  }))
  const sitArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${normalizeFengDegWorklet(facingDeg.value + 180)}deg` }],
  }))
  const doorArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${doorDegSv.value}deg` }],
  }))

  const showDoorArrow = doorDeg !== undefined
  const editingDoor = editTarget === 'door' && showDoorArrow
  const faceOpacity = editingDoor ? 0.4 : 1
  const doorOpacity = editingDoor ? 1 : showDoorArrow ? 0.4 : 1

  const headingIndicator =
    typeof liveHeadingDeg === 'number' ? (
      <View
        pointerEvents='none'
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 8,
          transform: [{ rotate: `${liveHeadingDeg}deg` }],
        }}
      >
        <View
          style={{
            width: 3,
            height: size * 0.38,
            backgroundColor: 'rgba(255,255,255,0.55)',
            borderRadius: 2,
          }}
        />
      </View>
    ) : null

  return (
    <GestureDetector gesture={gestures}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#0F1E26',
        }}
      >
        {satelliteSource ? (
          <Image
            source={satelliteSource}
            style={{ width: '100%', height: '100%' }}
            resizeMode='cover'
          />
        ) : null}
        {satelliteSource ? (
          <View
            pointerEvents='none'
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(8, 18, 24, 0.42)',
            }}
          />
        ) : null}
        <View
          style={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          pointerEvents='none'
        >
          <BaguaCompassOverlay
            size={size}
            rotation={ringRotation}
            showWedges={false}
            showMountains
            showCardinals
            ringColor='rgba(255,255,255,0.72)'
            labelColor='rgba(255,255,255,0.95)'
            labelMajorColor={arrowColor}
            cardinalColor='#ffffff'
          />
        </View>
        {headingIndicator}
        {showSitArrow ? (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: size,
                height: size,
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: 12,
              },
              sitArrowStyle,
            ]}
            pointerEvents='none'
          >
            <View
              style={{
                width: 6,
                height: size * 0.36,
                backgroundColor: SIT_COLOR,
                borderRadius: 3,
                opacity: 0.55,
              }}
            />
          </Animated.View>
        ) : null}
        {!editingDoor ? (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: size,
                height: size,
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: 6,
                opacity: faceOpacity,
              },
              arrowStyle,
            ]}
            pointerEvents='none'
          >
            <View
              style={{
                width: 10,
                height: size * 0.42,
                backgroundColor: arrowColor,
                borderRadius: 5,
              }}
            />
            <View
              style={{
                marginTop: -8,
                width: 0,
                height: 0,
                borderLeftWidth: 12,
                borderRightWidth: 12,
                borderBottomWidth: 18,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: arrowColor,
              }}
            />
          </Animated.View>
        ) : null}
        {showDoorArrow && !editingDoor ? (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: size,
                height: size,
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: 18,
                opacity: doorOpacity,
              },
              doorArrowStyle,
            ]}
            pointerEvents='none'
          >
            <View
              style={{
                width: 8,
                height: size * 0.32,
                backgroundColor: DOOR_COLOR,
                borderRadius: 4,
              }}
            />
          </Animated.View>
        ) : null}
        {showDoorArrow && editingDoor ? (
          <>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: size,
                  height: size,
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  paddingTop: 6,
                  opacity: faceOpacity,
                },
                arrowStyle,
              ]}
              pointerEvents='none'
            >
              <View
                style={{
                  width: 10,
                  height: size * 0.42,
                  backgroundColor: arrowColor,
                  borderRadius: 5,
                }}
              />
            </Animated.View>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: size,
                  height: size,
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  paddingTop: 18,
                  opacity: doorOpacity,
                },
                doorArrowStyle,
              ]}
              pointerEvents='none'
            >
              <View
                style={{
                  width: 8,
                  height: size * 0.32,
                  backgroundColor: DOOR_COLOR,
                  borderRadius: 4,
                }}
              />
            </Animated.View>
          </>
        ) : null}
        <View
          pointerEvents='none'
          style={{
            position: 'absolute',
            top: center - 7,
            left: center - 7,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: '#ffffff',
            borderWidth: 2,
            borderColor: 'rgba(0,0,0,0.4)',
          }}
        />
      </View>
    </GestureDetector>
  )
})
