'use client'

/**
 * ReportBackground — 金石玄学 (Epigraphy & Esoterica) report backdrop.
 *
 * Renders the gradient + decorative SVG overlay for a given report type.
 * Consumes config from @zhop/hexastral-tokens.
 */

import { useId } from 'react'
import { getReportConfig } from '@zhop/hexastral-tokens/reports'
import { gradientToCSS } from '@zhop/hexastral-tokens/gradients'
import {
  TRIGRAMS,
  trigramToPath,
  trigramMatrixPositions,
  concentricRings,
  TOPO_CONTOURS,
  THREAD_RED,
  THREAD_WHITE,
  MOUNTAIN_RIDGE_1,
  MOUNTAIN_RIDGE_2,
  orthogonalGrid,
  scatterPositions,
  INK_WASH_BLOB,
  SEAL_FRAME_PATH,
} from '@zhop/hexastral-tokens/paths'
import { cinnabar } from '@zhop/hexastral-tokens/palette'
import type { ReportType } from '@zhop/hexastral-tokens/reports'

interface ReportBackgroundProps {
  type: ReportType
  width?: number
  height?: number
  children?: React.ReactNode
  className?: string
}

function OverlayPattern({
  pattern,
  opacity,
  width,
  height,
  uid,
}: {
  pattern: string
  opacity: number
  width: number
  height: number
  uid: string
}) {
  const style: React.CSSProperties = { opacity }

  switch (pattern) {
    case 'trigramMatrix': {
      const positions = trigramMatrixPositions(8, 6, 32, 16)
      return (
        <svg width={width} height={height} style={style}>
          {positions.map((pos, i) => (
            <path
              key={`${uid}-tri-${i}`}
              d={trigramToPath(TRIGRAMS[pos.trigramIndex]!.lines)}
              transform={`translate(${pos.x}, ${pos.y})`}
              stroke='rgba(255,255,255,0.6)'
              strokeWidth={1.2}
              fill='none'
            />
          ))}
        </svg>
      )
    }

    case 'concentricRings': {
      const rings = concentricRings(width / 2, height / 2, 8, 30, Math.min(width, height) * 0.45)
      return (
        <svg width={width} height={height} style={style}>
          {rings.map((d, i) => (
            <path
              key={`${uid}-ring-${i}`}
              d={d}
              stroke='rgba(255,255,255,0.5)'
              strokeWidth={0.5}
              fill='none'
            />
          ))}
        </svg>
      )
    }

    case 'inkWash':
      return (
        <svg width={width} height={height} style={style} viewBox='0 0 200 200'>
          <defs>
            <filter id={`${uid}-blur`}>
              <feGaussianBlur stdDeviation='12' />
            </filter>
          </defs>
          <path d={INK_WASH_BLOB} fill='rgba(255,255,255,0.4)' filter={`url(#${uid}-blur)`} />
        </svg>
      )

    case 'entwinedThreads':
      return (
        <svg
          width={width}
          height={height}
          style={style}
          viewBox='0 0 400 100'
          preserveAspectRatio='none'
        >
          <path d={THREAD_RED} stroke={cinnabar.muted} strokeWidth={0.8} fill='none' />
          <path d={THREAD_WHITE} stroke='rgba(255,255,255,0.3)' strokeWidth={0.8} fill='none' />
        </svg>
      )

    case 'topoContours':
      return (
        <svg
          width={width}
          height={height}
          style={style}
          viewBox='0 0 400 100'
          preserveAspectRatio='none'
        >
          {TOPO_CONTOURS.map((d, i) => (
            <path
              key={`${uid}-topo-${i}`}
              d={d}
              stroke='rgba(196,168,130,0.4)'
              strokeWidth={0.5}
              fill='none'
            />
          ))}
        </svg>
      )

    case 'mountainGrid':
      return (
        <svg
          width={width}
          height={height}
          style={style}
          viewBox='0 0 400 160'
          preserveAspectRatio='none'
        >
          <path
            d={orthogonalGrid(400, 160, 40)}
            stroke='rgba(255,255,255,0.15)'
            strokeWidth={0.3}
            fill='none'
          />
          <path d={MOUNTAIN_RIDGE_1} fill='rgba(255,255,255,0.25)' />
          <path d={MOUNTAIN_RIDGE_2} fill='rgba(255,255,255,0.15)' />
        </svg>
      )

    case 'scatterDots': {
      const dots = scatterPositions(40)
      return (
        <svg width={width} height={height} style={style}>
          {dots.map((dot, i) => (
            <circle
              key={`${uid}-dot-${i}`}
              cx={dot.x * width}
              cy={dot.y * height}
              r={dot.r}
              fill='rgba(255,255,255,0.5)'
            />
          ))}
        </svg>
      )
    }

    default:
      return null
  }
}

export function ReportBackground({
  type,
  width = 640,
  height = 400,
  children,
  className,
}: ReportBackgroundProps) {
  const uid = useId().replace(/:/g, '')
  const config = getReportConfig(type)
  const bg = gradientToCSS(config.gradient)

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        minHeight: height,
        background: bg,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Decorative overlay */}
      {config.gradient.overlayPattern && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <OverlayPattern
            pattern={config.gradient.overlayPattern}
            opacity={config.gradient.overlayOpacity ?? 0.04}
            width={width}
            height={height}
            uid={uid}
          />
        </div>
      )}

      {/* Cinnabar seal stamp */}
      {config.seal && (
        <div
          style={{
            position: 'absolute',
            left: `${config.seal.x * 100}%`,
            top: `${config.seal.y * 100}%`,
            transform: `rotate(${config.seal.rotation}deg)`,
            opacity: config.seal.opacity,
            pointerEvents: 'none',
          }}
        >
          <svg
            width={Math.round(Math.min(width, height) * config.seal.sizeFrac)}
            height={Math.round(Math.min(width, height) * config.seal.sizeFrac)}
            viewBox='0 0 100 100'
          >
            <path d={SEAL_FRAME_PATH} fill='none' stroke={config.seal.color} strokeWidth={2.5} />
            <text
              x='50'
              y='58'
              textAnchor='middle'
              dominantBaseline='middle'
              fill={config.seal.color}
              fontSize='36'
              fontWeight='700'
              fontFamily='serif'
            >
              {config.sealText}
            </text>
          </svg>
        </div>
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
