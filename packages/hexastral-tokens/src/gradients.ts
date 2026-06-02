/**
 * Report background gradient definitions — pure data.
 *
 * Each report type defines its gradient stops and optional overlay
 * pattern reference. Platform renderers (iOS / web) consume these
 * to build LinearGradient, SVG filter, or CSS gradient equivalents.
 */

import { cinnabar, ink, rubbing } from './palette'

// ── Gradient stop ────────────────────────────────────────────────────────────

export interface GradientStop {
  offset: number // 0–1
  color: string
}

export interface ReportGradient {
  /** CSS angle (deg) — 0 = top→bottom, 135 = diagonal NW→SE */
  angle: number
  stops: GradientStop[]
  /** Optional SVG pattern overlay key (maps to paths.ts) */
  overlayPattern?: string
  /** Optional overlay opacity (0–1) */
  overlayOpacity?: number
}

// ── Report gradients ─────────────────────────────────────────────────────────

/**
 * 大运报告 — 10-Year Auspice (The Macro Shift)
 * Imagery: concentric tree rings / layered stele inscriptions.
 * Deep void base with faint warm undertone at the edges.
 */
export const decadalGradient: ReportGradient = {
  angle: 180,
  stops: [
    { offset: 0, color: rubbing.void },
    { offset: 0.6, color: rubbing.stone },
    { offset: 1, color: '#0E0D0F' },
  ],
  overlayPattern: 'concentricRings',
  overlayOpacity: 0.04,
}

/**
 * 流年报告 — Annual Transit (The Micro Current)
 * Imagery: ink wash slice — diffused sumi splash at corner.
 * Asymmetric 135° diagonal with ink-wash bloom at lower-right.
 */
export const annualGradient: ReportGradient = {
  angle: 135,
  stops: [
    { offset: 0, color: rubbing.void },
    { offset: 0.7, color: rubbing.stone },
    { offset: 1, color: '#12100E' },
  ],
  overlayPattern: 'inkWash',
  overlayOpacity: 0.05,
}

/**
 * 爱情/合盘报告 — Synastry / Love
 * Imagery: entwined threads (red + white) — karma entanglement.
 * Subtle warm bleed from cinnabar at edges.
 */
export const synastryGradient: ReportGradient = {
  angle: 160,
  stops: [
    { offset: 0, color: rubbing.void },
    { offset: 0.5, color: rubbing.stone },
    { offset: 1, color: '#100C0D' },
  ],
  overlayPattern: 'entwinedThreads',
  overlayOpacity: 0.06,
}

/**
 * 财运报告 — Wealth & Assets
 * Imagery: water gathering at heaven's heart / topographic contours.
 * Faint gold undertone suggesting prosperity without vulgarity.
 */
export const wealthGradient: ReportGradient = {
  angle: 180,
  stops: [
    { offset: 0, color: rubbing.void },
    { offset: 0.5, color: rubbing.stone },
    { offset: 1, color: '#0E0D08' },
  ],
  overlayPattern: 'topoContours',
  overlayOpacity: 0.04,
}

/**
 * 事业/仕途报告 — Career & Power
 * Imagery: mountain ridges + orthogonal grid (jade seal authority).
 * Cold, stable gradient — no warm bleed.
 */
export const careerGradient: ReportGradient = {
  angle: 0,
  stops: [
    { offset: 0, color: rubbing.void },
    { offset: 0.4, color: rubbing.stone },
    { offset: 1, color: rubbing.weathered },
  ],
  overlayPattern: 'mountainGrid',
  overlayOpacity: 0.035,
}

/**
 * 每日推送 — Daily Fortune Push Card
 * Lighter, more alive — daily energy rather than carved-in-stone permanence.
 */
export const dailyFortuneGradient: ReportGradient = {
  angle: 150,
  stops: [
    { offset: 0, color: rubbing.void },
    { offset: 0.8, color: rubbing.stone },
    { offset: 1, color: '#0F0E10' },
  ],
  overlayPattern: 'scatterDots',
  overlayOpacity: 0.05,
}

/**
 * 关系图谱 — Bonds constellation / relationship graph
 * Radiating from center — cosmic web feeling.
 */
export const constellationGradient: ReportGradient = {
  angle: 180,
  stops: [
    { offset: 0, color: rubbing.void },
    { offset: 0.5, color: '#0D0C10' },
    { offset: 1, color: rubbing.stone },
  ],
  overlayPattern: 'scatterDots',
  overlayOpacity: 0.03,
}

/**
 * 公开命盘卡 — Chart public card (shareable)
 * The "business card" format — most branded.
 */
export const chartCardGradient: ReportGradient = {
  angle: 135,
  stops: [
    { offset: 0, color: rubbing.void },
    { offset: 0.6, color: rubbing.stone },
    { offset: 1, color: '#100E0C' },
  ],
  overlayPattern: 'trigramMatrix',
  overlayOpacity: 0.04,
}

/**
 * 天命解读 — Fate / Personal Dual-Chart Reading
 * Imagery: astrolabe layers — two overlapping circular charts (命格 + 星宫).
 * Void base with faint ink-violet undertone; the deepest, most personal gradient.
 */
export const fateGradient: ReportGradient = {
  angle: 210,
  stops: [
    { offset: 0, color: rubbing.void },
    { offset: 0.55, color: rubbing.stone },
    { offset: 1, color: '#0C0B10' },
  ],
  overlayPattern: 'concentricRings',
  overlayOpacity: 0.05,
}

// ── Seal accent position helper ──────────────────────────────────────────────

export interface SealPlacement {
  /** Fractional position from left edge (0–1) */
  x: number
  /** Fractional position from top edge (0–1) */
  y: number
  /** Size as fraction of card short edge */
  sizeFrac: number
  /** Rotation in degrees */
  rotation: number
  color: string
  opacity: number
}

/** Small cinnabar seal at upper-right corner — used on most report cards. */
export const defaultSealPlacement: SealPlacement = {
  x: 0.88,
  y: 0.06,
  sizeFrac: 0.08,
  rotation: -5,
  color: cinnabar.seal,
  opacity: 0.7,
}

// ── Utility: gradient → CSS string ───────────────────────────────────────────

export function gradientToCSS(g: ReportGradient): string {
  const stops = g.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')
  return `linear-gradient(${g.angle}deg, ${stops})`
}
