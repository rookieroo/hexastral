// @ts-nocheck — R3F + RN JSX intrinsics (see CastingScene.tsx).
import { useFrame } from '@react-three/fiber'
import { coinCastSceneColors } from '@zhop/hexastral-tokens/satellites'
import * as CANNON from 'cannon-es'
import type { MutableRefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { coinsFromSeed, mulberry32 } from '@/lib/casting-entropy'
import type { PhysicsSettlePayload, YaoResult } from '@/lib/casting-types'
import {
  type CoinSkinConfig,
  DEFAULT_COIN_SKIN,
  loadCoinSkinMaterials,
} from '@/lib/coin-skins'

import {
  COIN_RADIAL_SEGMENTS,
  COIN_RADIUS,
  COIN_THICKNESS,
  CONTAINER_SHAKE_DURATION_MS,
  CUP_ABOVE_ALTAR_GAP,
  CUP_CEILING_CLAMP_Y,
  CUP_HORIZONTAL_EMPHASIS,
  CUP_LINEAR_SPEED_CAP,
  CUP_SYNTH_SHAKE_GAIN,
  CUP_TUMBLE_GAIN,
  CUP_VERTICAL_MIX,
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
import { createProceduralAltarInkStoneTextures } from './proceduralAltarInkStone'
import { createArenaWallBodies, createCupDeckBody, useCoinPhysics } from './useCoinPhysics'

const STONE_REPEAT = 3.6

/** Scratch — avoid allocating Vec3 inside hot `useFrame` cup loop. */
const CUP_SCRATCH_IMP = new CANNON.Vec3()
const CUP_SCRATCH_PT = new CANNON.Vec3()
const CUP_SCRATCH_TAU = new CANNON.Vec3()

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

function finalizeCoinsOnTable(
  bodies: CANNON.Body[],
  result: YaoResult,
  _impulseSeed: number
): void {
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
 * Near-rim orientations use `fallback` (same seed as toss impulses — not a second RNG).
 */
function readCoinFaceFromBody(body: CANNON.Body, fallback: 2 | 3): 2 | 3 {
  body.quaternion.vmult(LOCAL_THICK, WORLD_THICK)
  const c = WORLD_THICK.y
  if (Math.abs(c) < CAP_AMBIGUOUS_ABS_Y) return fallback
  return c > 0 ? 3 : 2
}

/** True when cylinder axis is nearly horizontal ⇒ coin on rim / upright; cannot take yin–yang from mesh without “外应” rule. */
function bodyCapAmbiguous(body: CANNON.Body): boolean {
  body.quaternion.vmult(LOCAL_THICK, WORLD_THICK)
  return Math.abs(WORLD_THICK.y) < CAP_AMBIGUOUS_ABS_Y
}

function buildTossResultFromBodies(bodies: CANNON.Body[], impulseSeed: number): YaoResult {
  const fb = coinsFromSeed(impulseSeed >>> 0)
  const faces: [2 | 3, 2 | 3, 2 | 3] = [
    readCoinFaceFromBody(bodies[0], fb.coins[0]),
    readCoinFaceFromBody(bodies[1], fb.coins[1]),
    readCoinFaceFromBody(bodies[2], fb.coins[2]),
  ]
  const total = (faces[0] + faces[1] + faces[2]) as YaoResult['total']
  return { coins: faces, total }
}

/** Stack coins inside the invisible cup at floor height — no pop-from-table impulse. */
function spawnCoinsInVessel(
  bodies: CANNON.Body[],
  impulseSeed: number,
  tossRevision: number
): void {
  const rnd = mulberry32((impulseSeed ^ (tossRevision * 0xa5a51)) >>> 0)
  for (let i = 0; i < 3; i++) {
    const b = bodies[i]
    b.wakeUp()
    const [sx, sz] = VESSEL_SPAWN_XZ[i] ?? [0, 0]
    const jx = (rnd() - 0.5) * 0.026
    const jz = (rnd() - 0.5) * 0.026
    const y = VESSEL_FLOOR_Y + i * (COIN_THICKNESS + 0.003)
    b.position.set(sx + jx, y, sz + jz)
    b.velocity.setZero()
    b.angularVelocity.set((rnd() - 0.5) * 3.2, (rnd() - 0.5) * 3.2, (rnd() - 0.5) * 3.2)
    const q = new CANNON.Quaternion()
    q.setFromEuler((rnd() - 0.5) * 0.75, (rnd() - 0.5) * 1.05, (rnd() - 0.5) * 0.75)
    b.quaternion.copy(q)
  }
}

/**
 * Remove cup walls/deck, then place coins at “open hands” height with near-zero velocity — gravity-only drop.
 * Keeps quaternion from the shake so entropy stays in orientation; xz stays near end-of-shake cluster.
 */
function applyHandsOpenRelease(
  bodies: CANNON.Body[],
  impulseSeed: number,
  tossRevision: number
): void {
  const rnd = mulberry32((impulseSeed ^ (tossRevision * 0x51ece)) >>> 0)
  const limit = HANDS_OPEN_XZ_SPREAD * 0.94
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    b.wakeUp()
    let x = b.position.x + (rnd() - 0.5) * 0.026
    let z = b.position.z + (rnd() - 0.5) * 0.026
    const r = Math.sqrt(x * x + z * z)
    if (r > limit && r > 1e-8) {
      const s = limit / r
      x *= s
      z *= s
    }
    b.position.set(x, HANDS_OPEN_DROP_CENTER_Y + (rnd() - 0.5) * 0.014, z)
    b.velocity.setZero()
    b.angularVelocity.x *= HANDS_OPEN_RELEASE_ANGULAR_SCALE
    b.angularVelocity.y *= HANDS_OPEN_RELEASE_ANGULAR_SCALE
    b.angularVelocity.z *= HANDS_OPEN_RELEASE_ANGULAR_SCALE
  }
}

export interface PhysicsCoinsSceneProps {
  tossRevision: number
  impulseSeed: number
  coinSkinConfig?: CoinSkinConfig
  /** Same as scene.background — table + lighting ground tint (no second “slab” color). */
  sceneBackdrop: string
  /** Committed line, or `wa_ying` to void whole hexagram per classical Liu Yao (rim / upright). */
  onPhysicsSettled: (payload: PhysicsSettlePayload) => void
  onImpact?: () => void
  /** Accelerometer drive while tossing — parent updates each sample; small impulses follow the hand. */
  shakeDriveRef?: MutableRefObject<{ x: number; y: number; z: number; mag: number }>
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
  /** `container_shake` = closed cup; `released` = walls/deck removed, coins falling from open-hand height. */
  const tossSubPhaseRef = useRef<'idle' | 'container_shake' | 'released'>('idle')
  const containerShakeEndMsRef = useRef(0)

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

  /** Parent ended the toss (timeout / background) while Cannon is still active — snap flat without re-committing. */
  useEffect(() => {
    if (props.arenaWallsActive) return
    rimHangFrames.current = 0
    clearArenaWalls()
    if (phaseRef.current !== 'active') return
    const result = buildTossResultFromBodies(bodies, props.impulseSeed)
    finalizeCoinsOnTable(bodies, result, props.impulseSeed)
    phaseRef.current = 'idle'
    settleCount.current = 0
    const ambiguous = bodies.some((b) => bodyCapAmbiguous(b))
    const released = tossSubPhaseRef.current === 'released'
    tossSubPhaseRef.current = 'idle'
    if (released && ambiguous) {
      props.onPhysicsSettled({ kind: 'wa_ying' })
    } else {
      props.onPhysicsSettled({ kind: 'line', result })
    }
  }, [props.arenaWallsActive, props.impulseSeed, world, bodies])

  useEffect(() => {
    if (props.tossRevision <= 0 || props.tossRevision === lastRevision.current) return
    lastRevision.current = props.tossRevision
    phaseRef.current = 'active'
    settleCount.current = 0
    rimHangFrames.current = 0

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
    containerShakeEndMsRef.current = performance.now() + CONTAINER_SHAKE_DURATION_MS
    spawnCoinsInVessel(bodies, props.impulseSeed, props.tossRevision)
  }, [props.tossRevision, props.impulseSeed, bodies])

  /** Abort / reset: revision 0 — clear arena and park coins above the table. */
  useEffect(() => {
    if (props.tossRevision !== 0) return
    lastRevision.current = 0
    tossSubPhaseRef.current = 'idle'
    clearArenaWalls()
    phaseRef.current = 'idle'
    settleCount.current = 0
    rimHangFrames.current = 0
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
    world.fixedStep(WORLD_DT, delta)

    const frameT = performance.now()

    if (phaseRef.current === 'active' && bodies.length === 3) {
      if (
        tossSubPhaseRef.current === 'container_shake' &&
        frameT >= containerShakeEndMsRef.current
      ) {
        clearArenaWalls()
        applyHandsOpenRelease(bodies, props.impulseSeed, props.tossRevision)
        tossSubPhaseRef.current = 'released'
      }

      if (tossSubPhaseRef.current === 'container_shake') {
        const t = frameT / 1000
        const phase = (props.impulseSeed % 1000) * 0.001 + props.tossRevision * 0.17

        // Slow cradle on the table plane (龟壳定点水平回旋 — container centre ~ fixed on altar).
        const ω0 = Math.PI * 2 * 2.65
        const slowX = Math.cos(t * ω0 + phase)
        const slowZ = Math.sin(t * ω0 * 1.04 + phase * 1.21)

        // Mid churn — coins shear and stack inside walls.
        const m1 = Math.sin(t * 12.55 + phase * 3.1)
        const m2 = Math.cos(t * 10.18 + props.tossRevision * 0.41)

        // High-frequency chatter (指尖/甲壳内的细碎碰撞).
        const h1 = Math.sin(t * 26.5)
        const h2 = Math.cos(t * 21.3)

        const ax = slowX * 0.52 + m1 * 0.74 + h1 * 0.44
        const az = slowZ * 0.52 + m2 * 0.74 + h2 * 0.44
        const ay = Math.sin(t * ω0 * 2.08 + phase) * 0.13 + h2 * 0.055

        const pulse = 0.52 + 0.48 * Math.abs(Math.sin(t * 3.45))
        const frameScale = Math.min(delta * 90, 2.85)
        const gain = CUP_SYNTH_SHAKE_GAIN * pulse * frameScale
        const hx = CUP_HORIZONTAL_EMPHASIS
        const vy = CUP_VERTICAL_MIX
        const tauScale = gain * CUP_TUMBLE_GAIN

        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i]
          b.wakeUp()
          const split = 0.08 * Math.sin(t * 15.3 + i * 1.37 + phase)
          const dip = 0.08 * Math.cos(t * 14.1 + i * 1.09)
          CUP_SCRATCH_IMP.set((ax + split) * gain * hx, ay * gain * vy, (az + dip) * gain * hx)
          CUP_SCRATCH_PT.set(
            b.position.x + 0.028 * m2 + 0.015 * (i - 1),
            b.position.y - COIN_RADIUS * 0.35,
            b.position.z - 0.028 * m1 - 0.015 * (i - 1)
          )
          b.applyImpulse(CUP_SCRATCH_IMP, CUP_SCRATCH_PT)

          CUP_SCRATCH_TAU.set(
            (m1 + h1 * 0.35) * tauScale,
            (h2 - h1) * tauScale * 0.42,
            (m2 - h2 * 0.35) * tauScale
          )
          b.applyTorque(CUP_SCRATCH_TAU)
        }

        const cap2 = CUP_LINEAR_SPEED_CAP * CUP_LINEAR_SPEED_CAP
        for (const b of bodies) {
          const v = b.velocity
          const sp2 = v.lengthSquared()
          if (sp2 > cap2) {
            v.scale(CUP_LINEAR_SPEED_CAP / Math.sqrt(sp2), v)
          }
          if (b.position.y > CUP_CEILING_CLAMP_Y) {
            b.position.y = CUP_CEILING_CLAMP_Y
            if (v.y > 0) v.y *= -0.18
          }
        }
      }
    }

    if (
      phaseRef.current === 'active' &&
      tossSubPhaseRef.current === 'released' &&
      bodies.length === 3
    ) {
      const linearCalm = bodies.every((b) => b.velocity.lengthSquared() < RIM_STUCK_LINEAR_SQ)
      const anyRimLow = bodies.some((b) => bodyOnRim(b) && b.position.y < COIN_RADIUS + 0.055)
      if (linearCalm && anyRimLow) {
        rimHangFrames.current += 1
      } else {
        rimHangFrames.current = 0
      }

      if (rimHangFrames.current >= RIM_FORCE_SNAP_FRAMES) {
        const result = buildTossResultFromBodies(bodies, props.impulseSeed)
        clearArenaWalls()
        finalizeCoinsOnTable(bodies, result, props.impulseSeed)
        phaseRef.current = 'idle'
        tossSubPhaseRef.current = 'idle'
        settleCount.current = 0
        rimHangFrames.current = 0
        /** Classical rule: rim / upright hang voids the whole hexagram (not a seed fallback line). */
        props.onPhysicsSettled({ kind: 'wa_ying' })
      }
    }

    const drive = props.shakeDriveRef?.current
    if (phaseRef.current === 'active' && drive && drive.mag > 1.05) {
      const cupBoost = tossSubPhaseRef.current === 'container_shake' ? 1.26 : 1
      const s = Math.min(0.021, 0.0064 * (drive.mag - 1.05)) * cupBoost * Math.min(delta * 90, 2.2)
      for (const b of bodies) {
        b.wakeUp()
        b.applyImpulse(new CANNON.Vec3(drive.x * s, drive.y * s * 0.22, drive.z * s), b.position)
      }
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

    const allSlow = bodies.every(
      (b) =>
        b.velocity.lengthSquared() < SETTLE_LINEAR_EPS * SETTLE_LINEAR_EPS &&
        b.angularVelocity.lengthSquared() < SETTLE_ANGULAR_EPS * SETTLE_ANGULAR_EPS
    )
    settleCount.current = allSlow ? settleCount.current + 1 : 0

    if (settleCount.current >= SETTLE_FRAMES_NEEDED) {
      clearArenaWalls()

      if (bodies.some((b) => bodyCapAmbiguous(b))) {
        const result = buildTossResultFromBodies(bodies, props.impulseSeed)
        finalizeCoinsOnTable(bodies, result, props.impulseSeed)
        phaseRef.current = 'idle'
        tossSubPhaseRef.current = 'idle'
        settleCount.current = 0
        rimHangFrames.current = 0
        props.onPhysicsSettled({ kind: 'wa_ying' })
        return
      }

      const result = buildTossResultFromBodies(bodies, props.impulseSeed)
      finalizeCoinsOnTable(bodies, result, props.impulseSeed)
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
