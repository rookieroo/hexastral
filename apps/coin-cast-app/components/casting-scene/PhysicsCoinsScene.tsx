// @ts-nocheck — R3F + RN JSX intrinsics (see CastingScene.tsx).
import { useFrame } from '@react-three/fiber'
import { coinCastSceneColors } from '@zhop/hexastral-tokens/satellites'
import * as CANNON from 'cannon-es'
import type { MutableRefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import type { PhysicsSettlePayload, YaoResult } from '@/lib/casting-types'
import { type CoinSkinConfig, DEFAULT_COIN_SKIN, loadCoinSkinMaterials } from '@/lib/coin-skins'
import type { MotionFrame } from '@/lib/motion-cast'

import {
  COIN_RADIAL_SEGMENTS,
  COIN_RADIUS,
  COIN_THICKNESS,
  CONTAINER_SHAKE_DURATION_MS,
  CUP_ABOVE_ALTAR_GAP,
  CUP_CEILING_CLAMP_Y,
  CUP_LINEAR_SPEED_CAP,
  GRAVITY_Y,
  HANDS_OPEN_DROP_CENTER_Y,
  HANDS_OPEN_RELEASE_ANGULAR_SCALE,
  HANDS_OPEN_XZ_SPREAD,
  IDLE_COIN_TABLE_XZ,
  IDLE_COIN_TABLE_Y,
  RIM_FORCE_SNAP_FRAMES,
  RIM_STUCK_LINEAR_SQ,
  SETTLE_ANGULAR_EPS,
  SETTLE_FRAMES_NEEDED,
  SETTLE_LINEAR_EPS,
  SETTLE_ROW_CENTER_SPACING,
  VESSEL_FLOOR_Y,
  VESSEL_SPAWN_XZ,
  WORLD_DT,
} from './constants'
import { drainMotionFramesThrough, motionFrameToPhysicsDrive } from './motionPhysics'
import { createProceduralAltarInkStoneTextures } from './proceduralAltarInkStone'
import { createArenaWallBodies, createCupDeckBody, useCoinPhysics } from './useCoinPhysics'

const STONE_REPEAT = 3.6

/** Scratch — avoid allocating vectors inside the fixed-step motion loop. */
const MOTION_IMPULSE = new CANNON.Vec3()

function removeBodiesFromWorld(world: CANNON.World, bodies: CANNON.Body[]): void {
  for (const b of bodies) {
    try {
      world.removeBody(b)
    } catch (err) {
      console.warn('[CoinCast] removeBody skipped', err)
    }
  }
}

const AXIS_X = new CANNON.Vec3(1, 0, 0)
const AXIS_Y = new CANNON.Vec3(0, 1, 0)

/**
 * Snap coin flat with correct yin/yang cap up, laid in a centered row along world +X (一字排开).
 * XZ are not taken from physics — avoids post-settle mesh overlap; faces match `result`.
 */
function settleCoinOnTableRow(body: CANNON.Body, targetFace: 2 | 3, coinIndex: number): void {
  const qYaw = new CANNON.Quaternion()
  qYaw.setFromAxisAngle(AXIS_Y, 0)

  const q = new CANNON.Quaternion()
  if (targetFace === 3) {
    q.copy(qYaw)
  } else {
    const qFlip = new CANNON.Quaternion()
    qFlip.setFromAxisAngle(AXIS_X, Math.PI)
    qFlip.mult(qYaw, q)
  }
  body.quaternion.copy(q)

  const halfT = COIN_THICKNESS / 2
  const x = (coinIndex - 1) * SETTLE_ROW_CENTER_SPACING
  body.position.set(x, halfT, 0)
}

function finalizeCoinsOnTable(bodies: CANNON.Body[], result: YaoResult): void {
  for (let i = 0; i < 3; i++) {
    settleCoinOnTableRow(bodies[i]!, result.coins[i]!, i)
  }
  for (const b of bodies) {
    b.velocity.setZero()
    b.angularVelocity.setZero()
    b.sleep()
  }
}

/** Cylinder axis (local Y): if nearly horizontal in world space, the coin is standing on its rim. */
const LOCAL_THICK = new CANNON.Vec3(0, 1, 0)
const WORLD_THICK = new CANNON.Vec3()

/** Cylinder axis nearly horizontal → coin on rim (metastable). */
function bodyOnRim(body: CANNON.Body): boolean {
  body.quaternion.vmult(LOCAL_THICK, WORLD_THICK)
  return Math.abs(WORLD_THICK.y) < 0.3
}

/** |dot(local+Y → world)| below this ⇒ cap not reliably up/down (rim / “standing” zone) — rare at full settle. */
const CAP_AMBIGUOUS_ABS_Y = 0.3

/**
 * Read which cap faces +world Y (table up / camera top). Yang cap is local +Y.
 * Ambiguous rim orientations are rejected before this is called.
 */
function readCoinFaceFromBody(body: CANNON.Body): 2 | 3 {
  body.quaternion.vmult(LOCAL_THICK, WORLD_THICK)
  return WORLD_THICK.y > 0 ? 3 : 2
}

/** True when cylinder axis is nearly horizontal ⇒ coin on rim / upright; cannot take yin–yang from mesh without “外应” rule. */
function bodyCapAmbiguous(body: CANNON.Body): boolean {
  body.quaternion.vmult(LOCAL_THICK, WORLD_THICK)
  return Math.abs(WORLD_THICK.y) < CAP_AMBIGUOUS_ABS_Y
}

function buildTossResultFromBodies(bodies: CANNON.Body[]): YaoResult {
  const faces: [2 | 3, 2 | 3, 2 | 3] = [
    readCoinFaceFromBody(bodies[0]),
    readCoinFaceFromBody(bodies[1]),
    readCoinFaceFromBody(bodies[2]),
  ]
  const sum = faces[0] + faces[1] + faces[2]
  if (sum !== 6 && sum !== 7 && sum !== 8 && sum !== 9) {
    throw new Error(`Invalid physical coin total: ${sum}`)
  }
  const total: YaoResult['total'] = sum
  return { coins: faces, total }
}

/** Canonical non-random initial state; only measured motion differentiates a cast. */
function spawnCoinsInVessel(bodies: CANNON.Body[]): void {
  for (let i = 0; i < 3; i++) {
    const b = bodies[i]
    b.wakeUp()
    const [sx, sz] = VESSEL_SPAWN_XZ[i] ?? [0, 0]
    const y = VESSEL_FLOOR_Y + i * (COIN_THICKNESS + 0.003)
    b.position.set(sx, y, sz)
    b.velocity.setZero()
    b.angularVelocity.setZero()
    const q = new CANNON.Quaternion()
    q.setFromEuler((i - 1) * 0.08, i * 0.13, (1 - i) * 0.06)
    b.quaternion.copy(q)
  }
}

/**
 * Remove cup walls/deck, then place coins at “open hands” height with near-zero velocity — gravity-only drop.
 * Keeps quaternion from the shake so entropy stays in orientation; xz stays near end-of-shake cluster.
 */
function applyHandsOpenRelease(bodies: CANNON.Body[]): void {
  const limit = HANDS_OPEN_XZ_SPREAD * 0.94
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    b.wakeUp()
    let x = b.position.x
    let z = b.position.z
    const r = Math.sqrt(x * x + z * z)
    if (r > limit && r > 1e-8) {
      const s = limit / r
      x *= s
      z *= s
    }
    b.position.set(x, HANDS_OPEN_DROP_CENTER_Y, z)
    b.velocity.setZero()
    b.angularVelocity.x *= HANDS_OPEN_RELEASE_ANGULAR_SCALE
    b.angularVelocity.y *= HANDS_OPEN_RELEASE_ANGULAR_SCALE
    b.angularVelocity.z *= HANDS_OPEN_RELEASE_ANGULAR_SCALE
  }
}

function applyMeasuredMotion(
  world: CANNON.World,
  bodies: CANNON.Body[],
  frame: MotionFrame,
  dtSeconds: number
): void {
  const drive = motionFrameToPhysicsDrive(frame, dtSeconds)
  if (drive.inertialAcceleration) {
    for (const body of bodies) {
      body.wakeUp()
      MOTION_IMPULSE.set(
        drive.inertialAcceleration.x * body.mass * dtSeconds,
        drive.inertialAcceleration.y * body.mass * dtSeconds,
        drive.inertialAcceleration.z * body.mass * dtSeconds
      )
      body.applyImpulse(MOTION_IMPULSE, body.position)
    }
  }

  if (drive.gravity) world.gravity.set(drive.gravity.x, drive.gravity.y, drive.gravity.z)

  if (!drive.angularVelocityDelta) return
  for (const body of bodies) {
    body.angularVelocity.x += drive.angularVelocityDelta.x
    body.angularVelocity.y += drive.angularVelocityDelta.y
    body.angularVelocity.z += drive.angularVelocityDelta.z
  }
}

export interface PhysicsCoinsSceneProps {
  tossRevision: number
  coinSkinConfig?: CoinSkinConfig
  /** Same as scene.background — table + lighting ground tint (no second “slab” color). */
  sceneBackdrop: string
  /** Committed line, or `wa_ying` to void whole hexagram per classical Liu Yao (rim / upright). */
  onPhysicsSettled: (payload: PhysicsSettlePayload) => void
  onImpact?: () => void
  /** Per-cast DeviceMotion frames, consumed exactly once by fixed physics ticks. */
  motionFrameQueueRef: MutableRefObject<MotionFrame[]>
  /** Invisible arena walls exist only while this is true (active toss / shake). */
  arenaWallsActive: boolean
  /**
   * Translucent cup shell: only while the parent camera is in `ritual` (in-cup shake).
   * When the camera moves to `table` (pour / line commit), the shell hides or plays a short
   * retreat so the scene does not read as a dice cup still covering the line.
   */
  vesselVisible: boolean
}

function coinSkinCacheKey(config: CoinSkinConfig): string {
  if (config.mode === 'logo') return 'logo'
  return `custom:${config.customObverseUri ?? ''}`
}

function useCastingTextures(coinSkinConfig: CoinSkinConfig): {
  floorMaterial: THREE.MeshStandardMaterial | null
  coinMaterials: THREE.MeshStandardMaterial[] | null
} {
  const [floorMaterial, setFloorMaterial] = useState<THREE.MeshStandardMaterial | null>(null)
  const [coinMaterials, setCoinMaterials] = useState<THREE.MeshStandardMaterial[] | null>(null)
  const skinKey = coinSkinCacheKey(coinSkinConfig)

  useEffect(() => {
    let cancelled = false
    void loadCoinSkinMaterials(coinSkinConfig)
      .then((materials) => {
        if (!cancelled) setCoinMaterials(materials)
      })
      .catch((err: unknown) => {
        console.warn('[PhysicsCoinsScene] coin skin load failed', err)
      })
    return () => {
      cancelled = true
    }
  }, [skinKey, coinSkinConfig])

  useEffect(() => {
    const { albedo, normal } = createProceduralAltarInkStoneTextures()
    albedo.repeat.set(STONE_REPEAT, STONE_REPEAT)
    normal.repeat.set(STONE_REPEAT, STONE_REPEAT)

    const floor = new THREE.MeshStandardMaterial({
      map: albedo,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.48, 0.48),
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.02,
    })

    setFloorMaterial(floor)

    return () => {
      albedo.dispose()
      normal.dispose()
      floor.dispose()
    }
  }, [])

  return { floorMaterial, coinMaterials }
}

const VESSEL_RETREAT_DURATION_SEC = 0.42

export function PhysicsCoinsScene(props: PhysicsCoinsSceneProps) {
  const coinSkinConfig = props.coinSkinConfig ?? DEFAULT_COIN_SKIN
  const { world, coinBodies: bodies } = useCoinPhysics()
  const { floorMaterial, coinMaterials } = useCastingTextures(coinSkinConfig)

  const vesselMeshRef = useRef<THREE.Mesh | null>(null)
  const prevVesselVisible = useRef(props.vesselVisible)
  const [vesselRetreating, setVesselRetreating] = useState(false)
  const vesselRetreatT = useRef(0)

  const arenaWallsRef = useRef<CANNON.Body[]>([])
  const cupDeckBodyRef = useRef<CANNON.Body | null>(null)

  const settleCount = useRef(0)
  const phaseRef = useRef<'idle' | 'active'>('idle')
  const lastRevision = useRef(0)
  const prevVy = useRef([0, 0, 0])
  const impactCooldown = useRef(0)
  const rimHangFrames = useRef(0)
  const physicsAccumulator = useRef(0)
  const simulationTimeMs = useRef(0)
  const lastMotionTimeMs = useRef(0)
  /** `container_shake` = closed cup; `released` = walls/deck removed, coins falling from open-hand height. */
  const tossSubPhaseRef = useRef<'idle' | 'container_shake' | 'released'>('idle')

  const removeCupDeck = () => {
    const d = cupDeckBodyRef.current
    if (!d) return
    try {
      world.removeBody(d)
    } catch (err) {
      console.warn('[CoinCast] removeCupDeck skipped', err)
    }
    cupDeckBodyRef.current = null
  }

  const clearArenaWalls = () => {
    removeCupDeck()
    removeBodiesFromWorld(world, arenaWallsRef.current)
    arenaWallsRef.current = []
  }

  /** Parent interruption cancels physics; it must never silently commit a line. */
  useEffect(() => {
    if (props.arenaWallsActive) return
    rimHangFrames.current = 0
    clearArenaWalls()
    if (phaseRef.current !== 'active') return
    phaseRef.current = 'idle'
    tossSubPhaseRef.current = 'idle'
    settleCount.current = 0
    world.gravity.set(0, GRAVITY_Y, 0)
  }, [props.arenaWallsActive, world, bodies])

  useEffect(() => {
    if (props.tossRevision <= 0 || props.tossRevision === lastRevision.current) return
    lastRevision.current = props.tossRevision
    phaseRef.current = 'active'
    settleCount.current = 0
    rimHangFrames.current = 0
    physicsAccumulator.current = 0
    simulationTimeMs.current = 0
    lastMotionTimeMs.current = 0

    clearArenaWalls()
    const walls = createArenaWallBodies()
    for (const w of walls) {
      world.addBody(w)
    }
    arenaWallsRef.current = walls

    removeCupDeck()
    const deck = createCupDeckBody()
    world.addBody(deck)
    cupDeckBodyRef.current = deck

    tossSubPhaseRef.current = 'container_shake'
    spawnCoinsInVessel(bodies)
  }, [props.tossRevision, bodies])

  /** Abort / reset: revision 0 — park a non-overlapping row and sleep it deterministically. */
  useEffect(() => {
    if (props.tossRevision !== 0) return
    lastRevision.current = 0
    tossSubPhaseRef.current = 'idle'
    clearArenaWalls()
    phaseRef.current = 'idle'
    settleCount.current = 0
    rimHangFrames.current = 0
    physicsAccumulator.current = 0
    simulationTimeMs.current = 0
    lastMotionTimeMs.current = 0
    props.motionFrameQueueRef.current = []
    world.gravity.set(0, GRAVITY_Y, 0)
    bodies.forEach((body, i) => {
      body.wakeUp()
      body.velocity.setZero()
      body.angularVelocity.setZero()
      const [bx, bz] = IDLE_COIN_TABLE_XZ[i] ?? [0, 0]
      body.position.set(bx, IDLE_COIN_TABLE_Y, bz)
      // Rest showing 字面 (obverse) — bottom cap up, matching a committed face-2 settle.
      const qYaw = new CANNON.Quaternion()
      qYaw.setFromAxisAngle(AXIS_Y, (i - 1) * 0.22)
      const qFlip = new CANNON.Quaternion()
      qFlip.setFromAxisAngle(AXIS_X, Math.PI)
      const q = new CANNON.Quaternion()
      qFlip.mult(qYaw, q)
      body.quaternion.copy(q)
      body.sleep()
    })
  }, [props.tossRevision, bodies, world])

  const groupRefs = useRef<(THREE.Group | null)[]>([null, null, null])

  useEffect(() => {
    if (prevVesselVisible.current && !props.vesselVisible) {
      vesselRetreatT.current = 0
      setVesselRetreating(true)
    }
    prevVesselVisible.current = props.vesselVisible
    if (props.vesselVisible) {
      setVesselRetreating(false)
      vesselRetreatT.current = 0
    }
  }, [props.vesselVisible])

  useFrame((_, delta) => {
    physicsAccumulator.current = Math.min(physicsAccumulator.current + Math.min(delta, 0.1), 0.25)
    let physicsSteps = 0
    while (physicsAccumulator.current >= WORLD_DT && physicsSteps < 12) {
      physicsAccumulator.current -= WORLD_DT
      physicsSteps += 1

      if (phaseRef.current === 'active') {
        simulationTimeMs.current += WORLD_DT * 1_000

        if (tossSubPhaseRef.current === 'container_shake') {
          const queue = props.motionFrameQueueRef.current
          const readyFrames = drainMotionFramesThrough(queue, simulationTimeMs.current)
          for (const frame of readyFrames) {
            const motionDt = Math.max(
              0.001,
              Math.min(0.1, (frame.t - lastMotionTimeMs.current) / 1_000)
            )
            lastMotionTimeMs.current = frame.t
            applyMeasuredMotion(world, bodies, frame, motionDt)
          }

          const speedCapSquared = CUP_LINEAR_SPEED_CAP * CUP_LINEAR_SPEED_CAP
          for (const body of bodies) {
            const speedSquared = body.velocity.lengthSquared()
            if (speedSquared > speedCapSquared) {
              body.velocity.scale(CUP_LINEAR_SPEED_CAP / Math.sqrt(speedSquared), body.velocity)
            }
            if (body.position.y > CUP_CEILING_CLAMP_Y) {
              body.position.y = CUP_CEILING_CLAMP_Y
              if (body.velocity.y > 0) body.velocity.y *= -0.18
            }
          }

          if (simulationTimeMs.current >= CONTAINER_SHAKE_DURATION_MS) {
            clearArenaWalls()
            world.gravity.set(0, GRAVITY_Y, 0)
            applyHandsOpenRelease(bodies)
            tossSubPhaseRef.current = 'released'
          }
        }
      }

      world.step(WORLD_DT)
    }

    const now = performance.now()

    for (let i = 0; i < 3; i++) {
      const mesh = groupRefs.current[i]
      const body = bodies[i]
      if (!mesh || !body) continue
      mesh.position.set(body.position.x, body.position.y, body.position.z)
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w
      )

      const vy = body.velocity.y
      const py = prevVy.current[i]
      if (
        body.position.y < COIN_THICKNESS * 2.5 &&
        py < -0.55 &&
        vy > -0.35 &&
        now - impactCooldown.current > 140
      ) {
        impactCooldown.current = now
        props.onImpact?.()
      }
      prevVy.current[i] = vy
    }

    if (phaseRef.current !== 'active') return

    if (tossSubPhaseRef.current !== 'released') {
      settleCount.current = 0
      return
    }

    const linearCalm = bodies.every((body) => body.velocity.lengthSquared() < RIM_STUCK_LINEAR_SQ)
    const anyRimLow = bodies.some(
      (body) => bodyOnRim(body) && body.position.y < COIN_RADIUS + 0.055
    )
    rimHangFrames.current = linearCalm && anyRimLow ? rimHangFrames.current + physicsSteps : 0

    if (rimHangFrames.current >= RIM_FORCE_SNAP_FRAMES) {
      clearArenaWalls()
      phaseRef.current = 'idle'
      tossSubPhaseRef.current = 'idle'
      settleCount.current = 0
      rimHangFrames.current = 0
      props.onPhysicsSettled({ kind: 'wa_ying' })
      return
    }

    const allSlow = bodies.every(
      (b) =>
        b.velocity.lengthSquared() < SETTLE_LINEAR_EPS * SETTLE_LINEAR_EPS &&
        b.angularVelocity.lengthSquared() < SETTLE_ANGULAR_EPS * SETTLE_ANGULAR_EPS
    )
    settleCount.current = allSlow ? settleCount.current + physicsSteps : 0

    if (settleCount.current >= SETTLE_FRAMES_NEEDED) {
      clearArenaWalls()

      if (bodies.some((b) => bodyCapAmbiguous(b))) {
        phaseRef.current = 'idle'
        tossSubPhaseRef.current = 'idle'
        settleCount.current = 0
        rimHangFrames.current = 0
        props.onPhysicsSettled({ kind: 'wa_ying' })
        return
      }

      const result = buildTossResultFromBodies(bodies)
      finalizeCoinsOnTable(bodies, result)
      phaseRef.current = 'idle'
      tossSubPhaseRef.current = 'idle'
      settleCount.current = 0
      rimHangFrames.current = 0
      props.onPhysicsSettled({ kind: 'line', result })
    }
  })

  useFrame((_, dt) => {
    const mesh = vesselMeshRef.current
    if (!mesh) return
    const raw = mesh.material
    const mat = Array.isArray(raw) ? raw[0] : raw
    if (!mat || !('opacity' in mat)) return
    const std = mat
    const baseY = 0.62 + CUP_ABOVE_ALTAR_GAP

    if (props.vesselVisible) {
      mesh.position.set(0, baseY, 0)
      std.opacity = 0.09
      return
    }

    if (!vesselRetreating) return

    vesselRetreatT.current += dt / VESSEL_RETREAT_DURATION_SEC
    const t = Math.min(1, vesselRetreatT.current)
    const e = t * t * (3 - 2 * t)
    mesh.position.y = THREE.MathUtils.lerp(baseY, baseY + 0.14, e)
    mesh.position.z = THREE.MathUtils.lerp(0, -0.58, e)
    mesh.position.x = 0
    std.opacity = 0.09 * (1 - e)

    if (t >= 1) {
      setVesselRetreating(false)
    }
  })

  const backdrop = props.sceneBackdrop

  return (
    <>
      <ambientLight intensity={0.38} />
      <hemisphereLight
        args={[coinCastSceneColors.hemisphereKey, backdrop, 0.62]}
        position={[0, 8, 0]}
      />
      <directionalLight position={[2.2, 9.5, 4.2]} intensity={1.28} color='#fff6ea' />
      <directionalLight position={[-2.8, 4.5, -2.6]} intensity={0.32} color='#c8d0dc' />
      <pointLight
        position={[0, 2.2, 1.4]}
        intensity={0.22}
        color='#e8d4b0'
        distance={6}
        decay={2}
      />

      {floorMaterial ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={floorMaterial}>
          <planeGeometry args={[8, 8]} />
        </mesh>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[8, 8]} />
          <meshStandardMaterial color={backdrop} roughness={0.93} metalness={0.02} />
        </mesh>
      )}

      {/* Altar rim — four beveled edges give the stone slab depth */}
      <mesh position={[0, -0.018, -4]}>
        <boxGeometry args={[8.08, 0.04, 0.1]} />
        <meshStandardMaterial color={backdrop} roughness={0.82} metalness={0.04} />
      </mesh>
      <mesh position={[0, -0.018, 4]}>
        <boxGeometry args={[8.08, 0.04, 0.1]} />
        <meshStandardMaterial color={backdrop} roughness={0.82} metalness={0.04} />
      </mesh>
      <mesh position={[-4, -0.018, 0]}>
        <boxGeometry args={[0.1, 0.04, 8.08]} />
        <meshStandardMaterial color={backdrop} roughness={0.82} metalness={0.04} />
      </mesh>
      <mesh position={[4, -0.018, 0]}>
        <boxGeometry args={[0.1, 0.04, 8.08]} />
        <meshStandardMaterial color={backdrop} roughness={0.82} metalness={0.04} />
      </mesh>

      {(props.vesselVisible || vesselRetreating) && props.tossRevision > 0 ? (
        <mesh ref={vesselMeshRef}>
          <cylinderGeometry args={[0.8, 0.75, 1.22, 40, 1, true]} />
          <meshStandardMaterial
            color={backdrop}
            transparent
            opacity={0.09}
            roughness={0.32}
            metalness={0.08}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      {coinMaterials
        ? [0, 1, 2].map((i) => (
            <group
              key={i}
              ref={(el) => {
                groupRefs.current[i] = el
              }}
            >
              <mesh material={coinMaterials}>
                <cylinderGeometry
                  args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, COIN_RADIAL_SEGMENTS]}
                />
              </mesh>
            </group>
          ))
        : null}
    </>
  )
}
