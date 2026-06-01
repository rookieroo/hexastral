/**
 * Browser fingerprint collection (client-side only)
 *
 * Collects lightweight, privacy-respecting signals that can
 * re-identify the same device after App Store install.
 * No external libraries — pure browser APIs.
 */

import type { BrowserFingerprint } from './types'

/** djb2 hash → deterministic hex string (no SubtleCrypto needed) */
function djb2(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    hash = ((hash << 5) + hash) ^ ch
    hash = hash >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** Canvas 2D fingerprint — varies by GPU/font renderer */
function canvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 220
    canvas.height = 30
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(196,168,98,0.8)'
    ctx.font = '14px Arial, sans-serif'
    ctx.fillText('HexAstral \u2605 \u262d \u2609', 4, 20)
    ctx.fillStyle = 'rgba(123,94,167,0.6)'
    ctx.fillRect(160, 8, 50, 12)
    return djb2(canvas.toDataURL('image/png'))
  } catch {
    return ''
  }
}

/** WebGL renderer fingerprint — highly device-specific */
function webglFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return ''
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return djb2(String(gl.getParameter(gl.RENDERER)))
    const vendor = String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL))
    const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
    return djb2(`${vendor}|${renderer}`)
  } catch {
    return ''
  }
}

/**
 * Collect a lightweight browser fingerprint.
 * Must be called in a browser environment (window/document available).
 */
export function collectFingerprint(): BrowserFingerprint {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: screen.width,
    screenHeight: screen.height,
    pixelRatio: typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1,
    platform: navigator.platform,
    colorDepth: screen.colorDepth,
    touchPoints: navigator.maxTouchPoints,
    canvas: canvasFingerprint(),
    webgl: webglFingerprint(),
  }
}

/**
 * Build a stable string ID from a fingerprint (for logging/matching).
 * Not stored server-side — the KV key is the opaque token.
 */
export function fingerprintId(fp: BrowserFingerprint): string {
  const raw = [
    fp.canvas,
    fp.webgl,
    fp.platform,
    fp.timezone,
    fp.screenWidth,
    fp.screenHeight,
    fp.pixelRatio,
    fp.colorDepth,
  ].join('|')
  return djb2(raw)
}
