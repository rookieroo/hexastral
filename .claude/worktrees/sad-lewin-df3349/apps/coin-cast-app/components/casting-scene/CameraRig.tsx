// @ts-nocheck — R3F + RN JSX intrinsics (see CastingScene.tsx).
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/** Idle / overview — full altar read. */
const POS_IDLE = new THREE.Vector3(0, 1.52, 2.62)
/** Cup shake — vessel held above altar (~CUP_ABOVE_ALTAR_GAP); framing slightly higher. */
const POS_RITUAL = new THREE.Vector3(0, 2.12, 3.08)
/** Coins on table — closer, slightly lower for legibility of faces. */
const POS_TABLE = new THREE.Vector3(0, 0.9, 1.74)

const LOOK_IDLE = new THREE.Vector3(0, 0.14, 0)
const LOOK_RITUAL = new THREE.Vector3(0, 0.36, 0)
const LOOK_TABLE = new THREE.Vector3(0, 0.1, 0)

const FOV_IDLE = 46
const FOV_RITUAL = 56
const FOV_TABLE = 43

export type CastCameraPhase = 'idle' | 'ritual' | 'table'

export function CameraRig({ phase }: { phase: CastCameraPhase }) {
  const { camera } = useThree()
  const posDesired = useMemo(() => new THREE.Vector3(), [])
  const lookSmoothed = useRef(new THREE.Vector3(0, 0.14, 0)).current

  useFrame(() => {
    if (phase === 'idle') {
      posDesired.copy(POS_IDLE)
    } else if (phase === 'ritual') {
      posDesired.copy(POS_RITUAL)
    } else {
      posDesired.copy(POS_TABLE)
    }

    camera.position.lerp(posDesired, 0.062)

    const lookWant =
      phase === 'idle' ? LOOK_IDLE : phase === 'ritual' ? LOOK_RITUAL : LOOK_TABLE
    lookSmoothed.lerp(lookWant, 0.088)
    camera.lookAt(lookSmoothed)

    if (camera instanceof THREE.PerspectiveCamera) {
      const wantFov = phase === 'idle' ? FOV_IDLE : phase === 'ritual' ? FOV_RITUAL : FOV_TABLE
      camera.fov = THREE.MathUtils.lerp(camera.fov, wantFov, 0.072)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
