import * as CANNON from 'cannon-es'
import { useMemo } from 'react'

import {
  ARENA_CEILING_HALF_HEIGHT,
  ARENA_SEG_WIDTH_EXTRA,
  ARENA_WALL_HALF_HEIGHT,
  ARENA_WALL_RADIUS,
  ARENA_WALL_SEGMENTS,
  ARENA_WALL_THICKNESS,
  COIN_MASS,
  COIN_PHYS_SEGMENTS,
  COIN_RADIUS,
  COIN_THICKNESS,
  CUP_ABOVE_ALTAR_GAP,
  CUP_DECK_THICKNESS,
  GRAVITY_Y,
  VESSEL_FLOOR_Y,
  VESSEL_SPAWN_XZ,
} from './constants'

/**
 * Thin invisible walls + ceiling — only while the user is tossing.
 * Many-sided prism + overlapping slabs approximates a sealed cylinder (合十密闭摇卦).
 */
export function createArenaWallBodies(): CANNON.Body[] {
  const walls: CANNON.Body[] = []
  const N = ARENA_WALL_SEGMENTS
  const radius = ARENA_WALL_RADIUS
  const wallT = ARENA_WALL_THICKNESS
  const wallHalfH = ARENA_WALL_HALF_HEIGHT
  const segHalfW = radius * Math.sin(Math.PI / N) + ARENA_SEG_WIDTH_EXTRA

  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2
    const cx = Math.cos(angle) * (radius + wallT)
    const cz = Math.sin(angle) * (radius + wallT)
    const b = new CANNON.Body({ mass: 0 })
    b.addShape(new CANNON.Box(new CANNON.Vec3(segHalfW, wallHalfH, wallT)))
    b.position.set(cx, wallHalfH, cz)
    b.quaternion.setFromEuler(0, -angle, 0)
    walls.push(b)
  }

  const ceilHalfH = ARENA_CEILING_HALF_HEIGHT
  const ceiling = new CANNON.Body({ mass: 0 })
  ceiling.addShape(
    new CANNON.Box(new CANNON.Vec3(radius + wallT + 0.04, ceilHalfH, radius + wallT + 0.04))
  )
  ceiling.position.set(0, 2 * wallHalfH + ceilHalfH, 0)
  walls.push(ceiling)

  return walls
}

/** Interior shelf — shake phase only; simulates vessel held slightly above altar. */
export function createCupDeckBody(): CANNON.Body {
  const halfX = 0.555
  const halfZ = 0.425
  const halfT = CUP_DECK_THICKNESS / 2
  const cy = CUP_ABOVE_ALTAR_GAP + halfT
  const deck = new CANNON.Body({ mass: 0 })
  deck.addShape(new CANNON.Box(new CANNON.Vec3(halfX, halfT, halfZ)))
  deck.position.set(0, cy, 0)
  return deck
}

export function createCoinCastWorld(): CANNON.World {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY_Y, 0) })
  world.allowSleep = true
  world.defaultContactMaterial.friction = 0.38
  world.defaultContactMaterial.restitution = 0.3
  // @ts-expect-error cannon-es `Solver` typings omit `iterations`; runtime `GSSolver` exposes it.
  world.solver.iterations = 22
  return world
}

export function createGroundPlaneBody(): CANNON.Body {
  const ground = new CANNON.Body({ mass: 0 })
  ground.addShape(new CANNON.Plane())
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  return ground
}

export function createCoinRigidBody(ix: number): CANNON.Body {
  const shape = new CANNON.Cylinder(COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, COIN_PHYS_SEGMENTS)
  const body = new CANNON.Body({
    mass: COIN_MASS,
    shape,
    linearDamping: 0.22,
    angularDamping: 0.3,
    allowSleep: true,
    sleepSpeedLimit: 0.1,
    sleepTimeLimit: 0.3,
  })
  const [sx, sz] = VESSEL_SPAWN_XZ[ix] ?? [0, 0]
  body.position.set(sx, VESSEL_FLOOR_Y + ix * (COIN_THICKNESS + 0.003), sz)
  return body
}

/** cannon-es world + three coin bodies + static ground (single memoized graph per Canvas mount). */
export function useCoinPhysics(): {
  world: CANNON.World
  coinBodies: CANNON.Body[]
} {
  return useMemo(() => {
    const world = createCoinCastWorld()
    const coinBodies = [createCoinRigidBody(0), createCoinRigidBody(1), createCoinRigidBody(2)]
    for (const b of coinBodies) {
      world.addBody(b)
    }
    world.addBody(createGroundPlaneBody())
    return { world, coinBodies }
  }, [])
}
