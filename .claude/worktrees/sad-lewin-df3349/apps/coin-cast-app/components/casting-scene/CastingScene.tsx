// @ts-nocheck — R3F elements extend Three.js JSX; Metro + RN TS resolution does not merge @react-three/fiber intrinsic types in this workspace.
import { Canvas, useThree } from '@react-three/fiber'
import type { MutableRefObject } from 'react'
import { Suspense, useLayoutEffect, useMemo } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { PhysicsSettlePayload } from '@/lib/casting-types'
import { View } from 'react-native'
import * as THREE from 'three'

import type { CastCameraPhase } from './CameraRig'
import { CameraRig } from './CameraRig'
import { PhysicsCoinsScene } from './PhysicsCoinsScene'

function SceneBackground({ color }: { color: string }) {
  const { scene } = useThree()
  useLayoutEffect(() => {
    const c = new THREE.Color(color)
    scene.background = c
    scene.fog = new THREE.Fog(color, 5.4, 15)
    return () => {
      scene.background = null
      scene.fog = null
    }
  }, [color, scene])
  return null
}

export interface CastingSceneProps {
  style?: StyleProp<ViewStyle>
  tossRevision: number
  impulseSeed: number
  /** One warm tone for clear color + table + fog — avoids a “two slabs” seam. */
  sceneBg: string
  /** While true, cup walls + vessel overlay are shown (sync with active toss). */
  arenaWallsActive: boolean
  /** Camera: `ritual` = raised wide view for in-cup shake; `table` = focus on landing; `idle` = overview. */
  cameraPhase: CastCameraPhase
  onPhysicsSettled: (payload: PhysicsSettlePayload) => void
  onImpact?: () => void
  shakeDriveRef?: MutableRefObject<{ x: number; y: number; z: number; mag: number }>
}

export function CastingScene(props: CastingSceneProps) {
  const bg = useMemo(() => props.sceneBg, [props.sceneBg])

  return (
    <View style={[{ flex: 1, minHeight: 200, borderRadius: 0 }, props.style]} collapsable={false}>
      <Canvas
        camera={{ position: [0, 1.5, 2.6], fov: 46, near: 0.08, far: 120 }}
        style={{ flex: 1 }}
        gl={{
          antialias: true,
          alpha: false,
        }}
      >
        <Suspense fallback={null}>
          <SceneBackground color={bg} />
          <CameraRig phase={props.cameraPhase} />
          <PhysicsCoinsScene
            tossRevision={props.tossRevision}
            impulseSeed={props.impulseSeed}
            sceneBackdrop={props.sceneBg}
            onPhysicsSettled={props.onPhysicsSettled}
            onImpact={props.onImpact}
            shakeDriveRef={props.shakeDriveRef}
            arenaWallsActive={props.arenaWallsActive}
            vesselVisible={props.cameraPhase === 'ritual' && props.arenaWallsActive}
          />
        </Suspense>
      </Canvas>
    </View>
  )
}
