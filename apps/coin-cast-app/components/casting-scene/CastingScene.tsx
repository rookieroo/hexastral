// @ts-nocheck — R3F elements extend Three.js JSX; Metro + RN TS resolution does not merge @react-three/fiber intrinsic types in this workspace.
import { Canvas, useThree } from '@react-three/fiber'
import type { MutableRefObject } from 'react'
import { Suspense, useLayoutEffect, useMemo } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'
import * as THREE from 'three'
import type { PhysicsSettlePayload } from '@/lib/casting-types'
import type { CoinSkinConfig } from '@/lib/coin-skins'
import type { MotionFrame } from '@/lib/motion-cast'

import type { CastCameraPhase } from './CameraRig'
import { CameraRig } from './CameraRig'
import { PhysicsCoinsScene } from './PhysicsCoinsScene'

function SceneBackground({ color }: { color: string }) {
  const { scene } = useThree()
  useLayoutEffect(() => {
    const c = new THREE.Color(color)
    scene.background = c
    scene.fog = new THREE.Fog(color, 4.1, 11.5)
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
  coinSkinConfig?: CoinSkinConfig
  /** One warm tone for clear color + table + fog — avoids a “two slabs” seam. */
  sceneBg: string
  /** While true, cup walls + vessel overlay are shown (sync with active toss). */
  arenaWallsActive: boolean
  /** Camera: `ritual` = raised wide view for in-cup shake; `table` = focus on landing; `idle` = overview. */
  cameraPhase: CastCameraPhase
  onPhysicsSettled: (payload: PhysicsSettlePayload) => void
  onImpact?: () => void
  motionFrameQueueRef: MutableRefObject<MotionFrame[]>
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
            coinSkinConfig={props.coinSkinConfig}
            sceneBackdrop={props.sceneBg}
            onPhysicsSettled={props.onPhysicsSettled}
            onImpact={props.onImpact}
            motionFrameQueueRef={props.motionFrameQueueRef}
            arenaWallsActive={props.arenaWallsActive}
            vesselVisible={props.cameraPhase === 'ritual' && props.arenaWallsActive}
          />
        </Suspense>
      </Canvas>
    </View>
  )
}
