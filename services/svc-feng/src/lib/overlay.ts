/**
 * SVG-overlay composition for /annotate.
 *
 * Strategy: build a single SVG that
 *   1. embeds the base map PNG as a data URI <image>,
 *   2. draws the 24山 ring and 8 bagua wedges semi-transparent,
 *   3. draws sit/face/door arrows at the building center.
 *
 * Then we rasterize the whole SVG via @resvg/resvg-wasm. This avoids needing
 * a separate PNG compositor — resvg already handles raster + vector layering
 * inside an SVG.
 *
 * Wasm init is amortized across requests: the binary is fetched once per
 * isolate, cached in a module-level promise, and reused. Cold-start cost is
 * ~120ms on Workers; subsequent calls compose a 1200×1200 PNG in <50ms.
 *
 * The 24山 typography comes from the canonical sequence in astro-core/feng;
 * we don't load that here (would add ~2KB of imports) — instead the labels
 * are hard-coded in canonical order to keep the worker bundle small.
 */

import { initWasm, Resvg } from '@resvg/resvg-wasm'
// Static import — wrangler bundles `.wasm` as a CompiledWasmModule and
// `initWasm` accepts WebAssembly.Module directly. Dynamic imports of wasm
// are unreliable in the Workers runtime; static is the documented path.
import resvgWasmModule from '@resvg/resvg-wasm/index_bg.wasm'

// First-render init is amortized; subsequent renders skip the await.
let wasmReady: Promise<void> | null = null

async function ensureWasmReady(): Promise<void> {
  if (!wasmReady) {
    wasmReady = initWasm(resvgWasmModule as unknown as WebAssembly.Module)
  }
  return wasmReady
}

const TWENTY_FOUR_MOUNTAIN_LABELS: readonly string[] = [
  // Starts at 7.5° (壬) and proceeds clockwise. 15° per slot, 24 total.
  '壬',
  '子',
  '癸',
  '丑',
  '艮',
  '寅',
  '甲',
  '卯',
  '乙',
  '辰',
  '巽',
  '巳',
  '丙',
  '午',
  '丁',
  '未',
  '坤',
  '申',
  '庚',
  '酉',
  '辛',
  '戌',
  '乾',
  '亥',
]

const BAGUA_WEDGES: ReadonlyArray<{
  name: string
  startDeg: number
  endDeg: number
  fill: string
}> = [
  // 8 wedges each 45° wide; outer border at 24山 inner edge.
  { name: '坎', startDeg: 337.5, endDeg: 22.5, fill: 'rgba(20,40,90,0.10)' }, // N
  { name: '艮', startDeg: 22.5, endDeg: 67.5, fill: 'rgba(120,80,40,0.10)' }, // NE
  { name: '震', startDeg: 67.5, endDeg: 112.5, fill: 'rgba(30,120,50,0.10)' }, // E
  { name: '巽', startDeg: 112.5, endDeg: 157.5, fill: 'rgba(70,140,40,0.10)' }, // SE
  { name: '离', startDeg: 157.5, endDeg: 202.5, fill: 'rgba(190,40,30,0.10)' }, // S
  { name: '坤', startDeg: 202.5, endDeg: 247.5, fill: 'rgba(150,100,40,0.10)' }, // SW
  { name: '兑', startDeg: 247.5, endDeg: 292.5, fill: 'rgba(190,170,40,0.10)' }, // W
  { name: '乾', startDeg: 292.5, endDeg: 337.5, fill: 'rgba(150,150,170,0.10)' }, // NW
]

export interface OverlayArrow {
  kind: 'sit' | 'face' | 'door'
  /** 0-360 true north degrees. */
  degTrue: number
  label: string
}

export interface CompositionInput {
  /** Raw base PNG (Mapbox satellite tile). */
  baseBytes: ArrayBuffer
  width: number
  height: number
  arrows: OverlayArrow[]
  drawMountainRing: boolean
  drawBaguaWedges: boolean
}

/** Convert ArrayBuffer → base64 (sync, no Buffer dep). */
function toBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes)
  // Chunked for large images to avoid argument-limit blow-ups.
  const CHUNK = 0x8000
  let result = ''
  for (let i = 0; i < u8.length; i += CHUNK) {
    result += String.fromCharCode(...u8.subarray(i, i + CHUNK))
  }
  return btoa(result)
}

/** SVG-coord conversion: degrees in feng-shui (0° = N, clockwise) → SVG (0° = East, counterclockwise). */
function compassToSvg(deg: number): number {
  // SVG cos/sin convention is 0° = E (+x), 90° = S (+y) when y increases downward.
  // Feng-shui convention is 0° = N (-y), clockwise. So angle_svg = deg - 90.
  return deg - 90
}

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (compassToSvg(deg) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function annularSectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  // Handle wedges crossing 0°.
  let sweep = endDeg - startDeg
  if (sweep < 0) sweep += 360
  const largeArc = sweep > 180 ? 1 : 0

  const startOuter = polar(cx, cy, rOuter, startDeg)
  const endOuter = polar(cx, cy, rOuter, endDeg)
  const startInner = polar(cx, cy, rInner, endDeg)
  const endInner = polar(cx, cy, rInner, startDeg)

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ')
}

const ARROW_STYLE: Record<OverlayArrow['kind'], { color: string; strokeWidth: number }> = {
  sit: { color: '#9B2226', strokeWidth: 6 }, // 朱砂 cinnabar — back
  face: { color: '#E6B450', strokeWidth: 6 }, // 铜金 — front
  door: { color: '#3A86FF', strokeWidth: 4 }, // 青 — door
}

function arrowPath(cx: number, cy: number, len: number, deg: number): string {
  const tip = polar(cx, cy, len, deg)
  const rad = (compassToSvg(deg) * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const back = { x: tip.x - dx * 18, y: tip.y - dy * 18 }
  const perpx = -dy * 10
  const perpy = dx * 10
  const headL = { x: back.x + perpx, y: back.y + perpy }
  const headR = { x: back.x - perpx, y: back.y - perpy }
  return [
    `M ${cx} ${cy} L ${tip.x} ${tip.y}`,
    `M ${tip.x} ${tip.y} L ${headL.x} ${headL.y}`,
    `M ${tip.x} ${tip.y} L ${headR.x} ${headR.y}`,
  ].join(' ')
}

function buildSvg(input: CompositionInput): string {
  const { width: w, height: h, baseBytes, arrows, drawMountainRing, drawBaguaWedges } = input
  // Mapbox @2x retina doubles the rendered pixel count; we treat width/height
  // as the logical viewport and let resvg upscale. Arrow geometry is in
  // logical coords too.
  const cx = w / 2
  const cy = h / 2
  // Concentric radii — visual layout from outside in:
  //   r24Outer .... outer edge of 24山 ring
  //   r24Inner .... 24山 ring inner edge
  //   rBaguaOuter . bagua wedge outer = r24Inner
  //   rBaguaInner . bagua wedge inner
  //   rArrow ...... longest arrow length
  const minDim = Math.min(w, h)
  const r24Outer = minDim * 0.46
  const r24Inner = minDim * 0.41
  const rBaguaInner = minDim * 0.22
  const rArrow = minDim * 0.36

  const baseDataUri = `data:image/png;base64,${toBase64(baseBytes)}`

  const parts: string[] = []

  // Embedded base image.
  parts.push(
    `<image href="${baseDataUri}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`
  )

  // Bagua wedges.
  if (drawBaguaWedges) {
    parts.push('<g stroke="rgba(0,0,0,0.25)" stroke-width="1">')
    for (const wedge of BAGUA_WEDGES) {
      const d = annularSectorPath(cx, cy, rBaguaInner, r24Inner, wedge.startDeg, wedge.endDeg)
      const mid =
        ((wedge.startDeg + wedge.endDeg) / 2 + (wedge.endDeg < wedge.startDeg ? 180 : 0)) % 360
      const labelPos = polar(cx, cy, (rBaguaInner + r24Inner) / 2, mid)
      parts.push(`<path d="${d}" fill="${wedge.fill}"/>`)
      parts.push(
        `<text x="${labelPos.x}" y="${labelPos.y + 6}" text-anchor="middle" ` +
          'font-family="Songti SC, serif" font-size="20" fill="rgba(0,0,0,0.75)" ' +
          'paint-order="stroke" stroke="rgba(255,255,255,0.7)" stroke-width="3">' +
          `${wedge.name}</text>`
      )
    }
    parts.push('</g>')
  }

  // 24山 ring with labels.
  if (drawMountainRing) {
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${r24Outer}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>`
    )
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${r24Inner}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>`
    )
    parts.push('<g font-family="Songti SC, serif" font-size="14" fill="rgba(0,0,0,0.85)">')
    for (let i = 0; i < 24; i += 1) {
      const deg = i * 15 + 7.5 // mountain center
      const pos = polar(cx, cy, (r24Outer + r24Inner) / 2 + 1, deg)
      parts.push(
        `<text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" ` +
          'paint-order="stroke" stroke="rgba(255,255,255,0.85)" stroke-width="3">' +
          `${TWENTY_FOUR_MOUNTAIN_LABELS[i]}</text>`
      )
    }
    parts.push('</g>')
  }

  // Cardinal markers (N/E/S/W) just outside the ring.
  parts.push('<g font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="#ffffff">')
  for (const [label, deg] of [
    ['N', 0],
    ['E', 90],
    ['S', 180],
    ['W', 270],
  ] as const) {
    const pos = polar(cx, cy, r24Outer + 16, deg)
    parts.push(
      `<text x="${pos.x}" y="${pos.y + 6}" text-anchor="middle" ` +
        'paint-order="stroke" stroke="rgba(0,0,0,0.7)" stroke-width="3">' +
        `${label}</text>`
    )
  }
  parts.push('</g>')

  // Arrows.
  for (const arrow of arrows) {
    const style = ARROW_STYLE[arrow.kind]
    const path = arrowPath(cx, cy, rArrow, arrow.degTrue)
    parts.push(
      `<path d="${path}" fill="none" stroke="${style.color}" stroke-width="${style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    const labelPos = polar(cx, cy, rArrow + 24, arrow.degTrue)
    parts.push(
      `<text x="${labelPos.x}" y="${labelPos.y + 5}" text-anchor="middle" ` +
        `font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="${style.color}" ` +
        'paint-order="stroke" stroke="rgba(255,255,255,0.85)" stroke-width="3">' +
        `${escapeXml(arrow.label)}</text>`
    )
  }

  // Center dot.
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="4" fill="#ffffff" stroke="rgba(0,0,0,0.6)" stroke-width="1.5"/>`
  )

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    parts.join(''),
    '</svg>',
  ].join('')
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Compose annotated map. Returns PNG bytes ready to write to R2.
 */
export async function composeAnnotated(input: CompositionInput): Promise<ArrayBuffer> {
  await ensureWasmReady()
  const svg = buildSvg(input)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: input.width },
    background: 'rgba(0,0,0,0)',
    font: {
      loadSystemFonts: false,
    },
  })
  const png = resvg.render().asPng()
  // resvg returns a Uint8Array — copy into a plain ArrayBuffer slice so the
  // R2 SDK + Response constructor don't choke on SharedArrayBuffer differences.
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer
}
