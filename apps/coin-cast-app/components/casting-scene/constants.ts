/** Physics / scene tuning — CoinCast 3D casting. */

export const COIN_RADIUS = 0.2

/** Thicker disk = far fewer “standing on edge” outcomes in Cannon. */
export const COIN_THICKNESS = 0.058

/** Extra edge gap when snapping the three coins to a straight commit row (world +X). */
export const SETTLE_ROW_GAP = 0.028

/** Center-to-center spacing on that row — ≥ 2×radius + gap so meshes do not interpenetrate. */
export const SETTLE_ROW_CENTER_SPACING = COIN_RADIUS * 2 + SETTLE_ROW_GAP

export const COIN_MASS = 0.08

export const GRAVITY_Y = -12

/** Time inside cup — deliberate 龟壳/合手摇卦 rhythm (short enough that post-pour settle still feels responsive). */
export const CONTAINER_SHAKE_DURATION_MS = 6000

/**
 * Closed-shake prism: more segments + wider overlap strips so coins rarely slip through gaps
 * (simulates 合十夹拢、密闭摇卦 rather than an open dice tube).
 */
export const ARENA_WALL_SEGMENTS = 24
export const ARENA_WALL_RADIUS = 0.64
export const ARENA_WALL_THICKNESS = 0.06
/** Added to each segment half-width so neighbouring slabs overlap at corners. */
export const ARENA_SEG_WIDTH_EXTRA = 0.045
export const ARENA_WALL_HALF_HEIGHT = 1.06
export const ARENA_CEILING_HALF_HEIGHT = 0.035

/**
 * “张开双手”松手高度：硬币中心 Y（桌面为 0）。适中落差 — 太低像帖桌甩出，太高易立边。
 */
export const HANDS_OPEN_DROP_CENTER_Y = 1.5

/** Palm-sized cluster: clamp |xz| so three coins stay under one open-hand spread. */
export const HANDS_OPEN_XZ_SPREAD = 0.056

/** After shake, scale angular velocity before free fall — lower ⇒ flatter landing, fewer rim stands. */
export const HANDS_OPEN_RELEASE_ANGULAR_SCALE = 0.26

/** Max |v| in cup — lively but capped before roof / gap escape. */
export const CUP_LINEAR_SPEED_CAP = 2.55

/** Highest coin centre Y during shake — soft clamp under physics roof (raised tray). */
export const CUP_CEILING_CLAMP_Y = 1.92

/** Device linear acceleration → non-inertial coin impulse gain. */
export const MOTION_LINEAR_GAIN = 1.05

/** Device angular velocity → coin angular velocity gain. */
export const MOTION_ANGULAR_GAIN = 0.82

/** WebGL watchdog — must cover shake + spill + settle. */
export const PHYSICS_COMMIT_FALLBACK_MS = CONTAINER_SHAKE_DURATION_MS + 13_000

/** Velocity tolerance for “still enough” — looser ⇒ faster commit without endless micro-wobble. */
export const SETTLE_LINEAR_EPS = 0.26

export const SETTLE_ANGULAR_EPS = 0.42

/** Consecutive frames at rest before accepting settle (≈8 @60fps ≈ 0.13s once calm). */
export const SETTLE_FRAMES_NEEDED = 8

/** Rim / edge escape: linear speed² below this counts as “stuck” on the table. */
export const RIM_STUCK_LINEAR_SQ = 0.14 * 0.14

/** After this many frames still calm on rim → wa_ying snap (metastable balance). */
export const RIM_FORCE_SNAP_FRAMES = 96

export const WORLD_DT = 1 / 60

/**
 * Held cup / tortoise shell is slightly above the altar — clearance from tabletop (world units).
 */
export const CUP_ABOVE_ALTAR_GAP = 0.11

/** Thin interior tray resting under coins during shake only; removed before pour onto altar. */
export const CUP_DECK_THICKNESS = 0.024

/** Coin stack centre-Y for lowest piece (rests on deck top ≈ gap + deck). */
export const VESSEL_FLOOR_Y = CUP_ABOVE_ALTAR_GAP + CUP_DECK_THICKNESS + COIN_THICKNESS / 2 + 0.004

/**
 * XZ slots inside cup — small triangle; slightly wider than touching helps avoid pre-pour penetration.
 */
export const VESSEL_SPAWN_XZ: ReadonlyArray<readonly [number, number]> = [
  [-0.064, 0.048],
  [0.064, 0.048],
  [0, -0.056],
]

/** Homepage idle — non-overlapping row; sharing space wakes sleeping bodies and causes jitter. */
export const IDLE_COIN_TABLE_XZ: ReadonlyArray<readonly [number, number]> = [
  [-SETTLE_ROW_CENTER_SPACING, 0],
  [0, 0],
  [SETTLE_ROW_CENTER_SPACING, 0],
]

export const IDLE_COIN_TABLE_Y = COIN_THICKNESS / 2 + 0.001

export const VESSEL_RADIUS = 0.62

export const COIN_RADIAL_SEGMENTS = 32

export const COIN_PHYS_SEGMENTS = 12
