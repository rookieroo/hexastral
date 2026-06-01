/**
 * Shared data, types, and layout engine for BondsConstellation + BondsStarfield.
 */

import type { BondData } from '@/lib/domain/bonds'
import type { TranslationKeys } from '@/lib/i18n'

// ── Types ────────────────────────────────────────────────────────────────────

export type ZoomLevel = 1 | 2 | 3

export interface ZoomConfig {
  nodeR: number
  orbitScale: number
  fontSize: number
  showName: boolean
  showScore: boolean
  labelOffset: number
  selfR: number
  auraR: number
}

export interface LayoutNode {
  bond: BondData
  x: number
  y: number
  r: number
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Self center position as fraction of container */
export const BOND_SELF = { x: 0.48, y: 0.44 }

export const ZOOM_CONFIG: Record<ZoomLevel, ZoomConfig> = {
  1: {
    nodeR: 20,
    orbitScale: 0.36,
    fontSize: 9,
    showName: false,
    showScore: false,
    labelOffset: 12,
    selfR: 12,
    auraR: 28,
  },
  2: {
    nodeR: 30,
    orbitScale: 0.4,
    fontSize: 12,
    showName: true,
    showScore: false,
    labelOffset: 14,
    selfR: 16,
    auraR: 38,
  },
  3: {
    nodeR: 36,
    orbitScale: 0.44,
    fontSize: 13,
    showName: true,
    showScore: true,
    labelOffset: 18,
    selfR: 18,
    auraR: 44,
  },
}

// ── Continuous interpolation for smooth zoom ─────────────────────────────────

function lerpCfg(a: ZoomConfig, b: ZoomConfig, t: number): ZoomConfig {
  return {
    nodeR: a.nodeR + (b.nodeR - a.nodeR) * t,
    orbitScale: a.orbitScale + (b.orbitScale - a.orbitScale) * t,
    fontSize: a.fontSize + (b.fontSize - a.fontSize) * t,
    showName: t >= 0.5 ? b.showName : a.showName,
    showScore: t >= 0.5 ? b.showScore : a.showScore,
    labelOffset: a.labelOffset + (b.labelOffset - a.labelOffset) * t,
    selfR: a.selfR + (b.selfR - a.selfR) * t,
    auraR: a.auraR + (b.auraR - a.auraR) * t,
  }
}

/** Lerp between the 3 discrete configs for any scale in [1.0, 3.0]. */
export function interpolateZoom(scale: number): ZoomConfig {
  const s = Math.max(1, Math.min(3, scale))
  if (s <= 2) return lerpCfg(ZOOM_CONFIG[1], ZOOM_CONFIG[2], s - 1)
  return lerpCfg(ZOOM_CONFIG[2], ZOOM_CONFIG[3], s - 2)
}

// ── Relationship label key map ───────────────────────────────────────────────

export const LABEL_KEY_MAP: Record<string, TranslationKeys> = {
  spouse: 'bond_label_spouse',
  partner: 'bond_label_partner',
  parent: 'bond_label_parent',
  child: 'bond_label_child',
  sibling: 'bond_label_sibling',
  friend: 'bond_label_friend',
  colleague: 'bond_label_colleague',
  boss: 'bond_label_boss',
}

// ── Demo bonds ───────────────────────────────────────────────────────────────

export function buildDemoBonds(t: (key: TranslationKeys) => string): BondData[] {
  return [
    {
      id: 'demo-parent',
      ownerId: 'demo',
      targetUserId: null,
      targetName: t('bond_demo_fate'),
      relationshipLabel: t('bond_demo_fate'),
      mode: 'solo',
      hehunReadingId: null,
      mirrorBondId: null,
      status: 'active',
      createdAt: '2025-01-01T00:00:00Z',
      score: 82,
      archetypeName: null,
      grade: 'A',
      archetypeTagline: null,
      archetypeCategory: null,
      hookDimension: null,
      unlockedDimensions: null,
      sharedByOwner: false,
      todaySynastry: null,
      targetUser: null,
      relationshipStage: null,
      invitation: null,
    },
    {
      id: 'demo-friend',
      ownerId: 'demo',
      targetUserId: null,
      targetName: t('bond_demo_bestie'),
      relationshipLabel: t('bond_demo_bestie'),
      mode: 'resonance',
      hehunReadingId: null,
      mirrorBondId: null,
      status: 'active',
      createdAt: '2025-02-01T00:00:00Z',
      score: 76,
      grade: 'B+',
      archetypeName: null,
      archetypeTagline: null,
      archetypeCategory: null,
      hookDimension: null,
      unlockedDimensions: null,
      sharedByOwner: false,
      todaySynastry: null,
      targetUser: null,
      relationshipStage: null,
      invitation: null,
    },
    {
      id: 'demo-partner',
      ownerId: 'demo',
      targetUserId: null,
      targetName: t('bond_demo_vibe'),
      relationshipLabel: t('bond_demo_vibe'),
      mode: 'solo',
      hehunReadingId: null,
      mirrorBondId: null,
      status: 'active',
      createdAt: '2025-03-01T00:00:00Z',
      score: 91,
      grade: 'S',
      archetypeName: null,
      archetypeTagline: null,
      archetypeCategory: null,
      hookDimension: null,
      unlockedDimensions: null,
      sharedByOwner: false,
      todaySynastry: null,
      targetUser: null,
      relationshipStage: null,
      invitation: null,
    },
    {
      id: 'demo-colleague',
      ownerId: 'demo',
      targetUserId: null,
      targetName: t('bond_demo_duo'),
      relationshipLabel: t('bond_demo_duo'),
      mode: 'solo',
      hehunReadingId: null,
      mirrorBondId: null,
      status: 'active',
      createdAt: '2025-04-01T00:00:00Z',
      score: 68,
      grade: 'B',
      archetypeName: null,
      archetypeTagline: null,
      archetypeCategory: null,
      hookDimension: null,
      unlockedDimensions: null,
      sharedByOwner: false,
      todaySynastry: null,
      targetUser: null,
      relationshipStage: null,
      invitation: null,
    },
    {
      id: 'demo-boss',
      ownerId: 'demo',
      targetUserId: null,
      targetName: t('bond_demo_mentor'),
      relationshipLabel: t('bond_demo_mentor'),
      mode: 'solo',
      hehunReadingId: null,
      mirrorBondId: null,
      status: 'active',
      createdAt: '2025-05-01T00:00:00Z',
      score: 73,
      grade: 'B+',
      archetypeName: null,
      archetypeTagline: null,
      archetypeCategory: null,
      hookDimension: null,
      unlockedDimensions: null,
      sharedByOwner: false,
      todaySynastry: null,
      targetUser: null,
      relationshipStage: null,
      invitation: null,
    },
    {
      id: 'demo-sibling',
      ownerId: 'demo',
      targetUserId: null,
      targetName: t('bond_demo_bond'),
      relationshipLabel: t('bond_demo_bond'),
      mode: 'resonance',
      hehunReadingId: null,
      mirrorBondId: null,
      status: 'pending_invite',
      createdAt: '2025-06-01T00:00:00Z',
      score: null,
      archetypeName: null,
      grade: null,
      archetypeTagline: null,
      archetypeCategory: null,
      hookDimension: null,
      unlockedDimensions: null,
      sharedByOwner: false,
      todaySynastry: null,
      targetUser: null,
      relationshipStage: null,
      invitation: null,
    },
  ]
}

// ── Layout engine ────────────────────────────────────────────────────────────

/**
 * Hand-crafted slot positions (as fractions of container width × height).
 * Ordered so that picking the first N slots always produces a balanced layout:
 *   1 = top, 2 = top + bottom-left, 3 = triangle, etc.
 * Verified overlap-free for card (~340×374) and full-screen (~393×852).
 */
const FIXED_SLOTS: { x: number; y: number }[] = [
  { x: 0.62, y: 0.14 }, // 0: upper-right
  { x: 0.85, y: 0.44 }, // 1: right
  { x: 0.72, y: 0.72 }, // 2: lower-right
  { x: 0.35, y: 0.84 }, // 3: bottom-left
  { x: 0.1, y: 0.62 }, // 4: lower-left
  { x: 0.12, y: 0.32 }, // 5: upper-left
  { x: 0.32, y: 0.1 }, // 6: top-center-left
  { x: 0.82, y: 0.6 }, // 7: mid-right (extra)
]

export function layoutNodes(
  bonds: BondData[],
  width: number,
  height: number,
  showAdd: boolean,
  zoomLevel: ZoomLevel
): { bondNodes: LayoutNode[]; addNode: { x: number; y: number; r: number } | null } {
  const cfg = ZOOM_CONFIG[zoomLevel]
  const total = bonds.length + (showAdd ? 1 : 0)
  if (total === 0) return { bondNodes: [], addNode: null }

  // For ≤ 8 items: use hand-crafted fixed slots (no overlap guaranteed).
  // For > 8: fall back to evenly-spaced angular distribution.
  const useFixed = total <= FIXED_SLOTS.length

  const bondNodes: LayoutNode[] = bonds.map((bond, i) => {
    let x: number
    let y: number
    if (useFixed) {
      const slot = FIXED_SLOTS[i % FIXED_SLOTS.length]!
      x = slot.x * width
      y = slot.y * height
    } else {
      const cx = BOND_SELF.x * width
      const cy = BOND_SELF.y * height
      const orbitRx = width * cfg.orbitScale
      const orbitRy = height * cfg.orbitScale * 0.75
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / total
      x = cx + orbitRx * Math.cos(angle)
      y = cy + orbitRy * Math.sin(angle)
    }
    return {
      bond,
      x,
      y,
      r: bond.status === 'active' ? cfg.nodeR : cfg.nodeR * 0.85,
    }
  })

  let addNode: { x: number; y: number; r: number } | null = null
  if (showAdd) {
    const idx = bonds.length
    if (useFixed) {
      const slot = FIXED_SLOTS[idx % FIXED_SLOTS.length]!
      addNode = { x: slot.x * width, y: slot.y * height, r: cfg.nodeR * 0.68 }
    } else {
      const cx = BOND_SELF.x * width
      const cy = BOND_SELF.y * height
      const orbitRx = width * cfg.orbitScale
      const orbitRy = height * cfg.orbitScale * 0.75
      const angle = -Math.PI / 2 + (2 * Math.PI * idx) / total
      addNode = {
        x: cx + orbitRx * Math.cos(angle),
        y: cy + orbitRy * Math.sin(angle),
        r: cfg.nodeR * 0.68,
      }
    }
  }

  return { bondNodes, addNode }
}
