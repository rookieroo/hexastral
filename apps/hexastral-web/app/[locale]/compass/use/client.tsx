'use client'

/**
 * Browser-side compass tool.
 *
 * Reads the DeviceOrientation API (mobile only) to display:
 *   - Magnetic heading in degrees
 *   - The 24-Mountain that the phone is currently pointing at
 *   - The bagua trigram (八卦) palace
 *
 * Limitations vs. native app:
 *   - Web only provides MAGNETIC heading (no true-north correction without
 *     navigator.geolocation + a WMM table; we keep it simple)
 *   - iOS Safari requires explicit permission grant via tap (one-time)
 *   - Desktop browsers show a "use your phone" fallback
 *
 * The tool is intentionally a teaser — for true-north accuracy and offline
 * use, the CTA pushes installs of the native Compass app.
 */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { CompassUseCopy } from './page'

interface DeviceOrientationEventConstructorWithPermission extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>
}

type WebkitOrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number }

// 24-mountain table — duplicated from @zhop/astro-core so this client bundle
// stays tiny. Keep in sync with packages/astro-core/src/feng/twenty-four-mountains.ts.
const MOUNTAINS: ReadonlyArray<{ name: string; palace: string; centerDeg: number }> = [
  { name: '子', palace: '坎', centerDeg: 0 },
  { name: '癸', palace: '坎', centerDeg: 15 },
  { name: '丑', palace: '艮', centerDeg: 30 },
  { name: '艮', palace: '艮', centerDeg: 45 },
  { name: '寅', palace: '艮', centerDeg: 60 },
  { name: '甲', palace: '震', centerDeg: 75 },
  { name: '卯', palace: '震', centerDeg: 90 },
  { name: '乙', palace: '震', centerDeg: 105 },
  { name: '辰', palace: '巽', centerDeg: 120 },
  { name: '巽', palace: '巽', centerDeg: 135 },
  { name: '巳', palace: '巽', centerDeg: 150 },
  { name: '丙', palace: '离', centerDeg: 165 },
  { name: '午', palace: '离', centerDeg: 180 },
  { name: '丁', palace: '离', centerDeg: 195 },
  { name: '未', palace: '坤', centerDeg: 210 },
  { name: '坤', palace: '坤', centerDeg: 225 },
  { name: '申', palace: '坤', centerDeg: 240 },
  { name: '庚', palace: '兑', centerDeg: 255 },
  { name: '酉', palace: '兑', centerDeg: 270 },
  { name: '辛', palace: '兑', centerDeg: 285 },
  { name: '戌', palace: '乾', centerDeg: 300 },
  { name: '乾', palace: '乾', centerDeg: 315 },
  { name: '亥', palace: '乾', centerDeg: 330 },
  { name: '壬', palace: '坎', centerDeg: 345 },
]

function mountainAtDeg(deg: number) {
  const d = ((deg % 360) + 360) % 360
  const idx = Math.floor((d + 7.5) / 15) % 24
  return MOUNTAINS[idx] as (typeof MOUNTAINS)[number]
}

type Status = 'desktop' | 'awaiting_permission' | 'denied' | 'active'

export function CompassUseClient({ copy, locale }: { copy: CompassUseCopy; locale: string }) {
  const [status, setStatus] = useState<Status>('desktop')
  const [heading, setHeading] = useState<number | null>(null)

  // Probe support on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const ua = navigator.userAgent.toLowerCase()
    const isMobile = /android|iphone|ipad|ipod|mobile/.test(ua)
    if (!isMobile) {
      setStatus('desktop')
      return
    }
    // iOS Safari requires a tap-triggered requestPermission.
    const Ctor = (
      window as unknown as {
        DeviceOrientationEvent?: DeviceOrientationEventConstructorWithPermission
      }
    ).DeviceOrientationEvent
    if (typeof Ctor?.requestPermission === 'function') {
      setStatus('awaiting_permission')
    } else if ('DeviceOrientationEvent' in window) {
      // Android / non-Safari iOS — start listening directly.
      attachListener()
      setStatus('active')
    } else {
      setStatus('desktop')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const attachListener = useCallback(() => {
    const handler = (event: DeviceOrientationEvent) => {
      const e = event as WebkitOrientationEvent
      // iOS provides webkitCompassHeading (calibrated against magnetic N).
      // Others use alpha (raw orientation, needs negation for compass-like reading).
      const h =
        typeof e.webkitCompassHeading === 'number'
          ? e.webkitCompassHeading
          : typeof event.alpha === 'number'
            ? (360 - event.alpha) % 360
            : null
      if (h !== null) setHeading(h)
    }
    // Prefer absolute (true compass) when supported, else fall back.
    const hasAbsolute = Object.hasOwn(window, 'ondeviceorientationabsolute')
    const eventName = hasAbsolute ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(eventName as 'deviceorientation', handler)
    return () => {
      window.removeEventListener(eventName as 'deviceorientation', handler)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    const Ctor = (
      window as unknown as {
        DeviceOrientationEvent?: DeviceOrientationEventConstructorWithPermission
      }
    ).DeviceOrientationEvent
    if (typeof Ctor?.requestPermission !== 'function') {
      attachListener()
      setStatus('active')
      return
    }
    const r = await Ctor.requestPermission().catch(() => 'denied' as const)
    if (r === 'granted') {
      attachListener()
      setStatus('active')
    } else {
      setStatus('denied')
    }
  }, [attachListener])

  const m = heading !== null ? mountainAtDeg(heading) : null
  const headingText = heading === null ? '---' : Math.round(heading).toString().padStart(3, '0')

  const fengHref = `/${locale === 'en' ? '' : `${locale}/`}feng?via=compass${
    heading !== null ? `&facing=${heading.toFixed(1)}` : ''
  }`
  const learnHref = `/${locale === 'en' ? '' : `${locale}/`}compass/learn`

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0F1E26',
        color: '#F5EFE3',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '48px 24px',
      }}
    >
      {/* Top: heading */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <div
          style={{
            fontSize: 80,
            fontWeight: 200,
            letterSpacing: 2,
            fontVariantNumeric: 'tabular-nums',
            color: '#F5EFE3',
          }}
        >
          {headingText}°
        </div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: '#A89F8E',
            marginTop: 4,
          }}
        >
          {copy.heading}
        </div>
      </div>

      {/* Middle: dial / status */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'awaiting_permission' && (
          <button
            type='button'
            onClick={requestPermission}
            style={{
              padding: '14px 24px',
              background: '#B08D5B',
              color: '#0F1E26',
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Allow compass access
          </button>
        )}
        {status === 'denied' && (
          <p style={{ maxWidth: 320, textAlign: 'center', fontSize: 13, color: '#A89F8E' }}>
            {copy.permissionDenied}
          </p>
        )}
        {status === 'desktop' && (
          <p style={{ maxWidth: 360, textAlign: 'center', fontSize: 13, color: '#A89F8E' }}>
            {copy.desktopMsg}
          </p>
        )}
        {status === 'active' && <CompassSvg headingDeg={heading ?? 0} />}
      </div>

      {/* Mountain + Palace pills */}
      {m && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <Pill label={copy.mountain} value={m.name} />
          <Pill label={copy.palace} value={m.palace} />
        </div>
      )}

      {/* Footer CTAs */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          width: '100%',
        }}
      >
        <Link
          href={fengHref}
          style={{
            color: '#B08D5B',
            fontSize: 14,
            textDecoration: 'none',
            letterSpacing: 0.5,
          }}
        >
          {copy.fengCta}
        </Link>

        <a
          href='https://apps.apple.com/app/compass/id000000000'
          style={{
            color: '#F5EFE3',
            fontSize: 12,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            fontWeight: 500,
            textDecoration: 'none',
            borderTop: '1px solid rgba(245,239,227,0.18)',
            paddingTop: 14,
            width: '100%',
            textAlign: 'center',
          }}
        >
          {copy.appCta}
        </a>

        <Link
          href={learnHref}
          style={{
            color: '#A89F8E',
            fontSize: 11,
            textDecoration: 'underline',
            letterSpacing: 0.4,
          }}
        >
          {copy.learnLink}
        </Link>
      </div>
    </main>
  )
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        border: '1px solid #7A6240',
        borderRadius: 999,
      }}
    >
      <span style={{ color: '#A89F8E', fontSize: 10, letterSpacing: 1 }}>{label}</span>
      <span style={{ color: '#F5EFE3', fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function CompassSvg({ headingDeg }: { headingDeg: number }) {
  const size = 280
  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2 - 4
  const rTickInner = rOuter - 8
  const rLabel = rOuter - 22

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={rOuter} stroke='#7A6240' strokeWidth={1} fill='none' />
      <g transform={`rotate(${-headingDeg} ${cx} ${cy})`}>
        {MOUNTAINS.map((m) => {
          const a = ((m.centerDeg - 90) * Math.PI) / 180
          const isMajor = m.centerDeg % 90 === 0
          return (
            <g key={m.name}>
              <line
                x1={cx + Math.cos(a) * rOuter}
                y1={cy + Math.sin(a) * rOuter}
                x2={cx + Math.cos(a) * rTickInner}
                y2={cy + Math.sin(a) * rTickInner}
                stroke={isMajor ? '#B08D5B' : '#7A6240'}
                strokeWidth={isMajor ? 1.5 : 0.8}
              />
              <text
                x={cx + Math.cos(a) * rLabel}
                y={cy + Math.sin(a) * rLabel}
                fontSize={isMajor ? 12 : 9}
                fill={isMajor ? '#B08D5B' : '#A89F8E'}
                textAnchor='middle'
                alignmentBaseline='central'
                transform={`rotate(${headingDeg + m.centerDeg} ${cx + Math.cos(a) * rLabel} ${cy + Math.sin(a) * rLabel})`}
              >
                {m.name}
              </text>
            </g>
          )
        })}
      </g>
      <path
        d={`M ${cx} ${cy - rOuter + 12} L ${cx - 5} ${cy} L ${cx} ${cy + 12} L ${cx + 5} ${cy} Z`}
        fill='#B08D5B'
        opacity={0.95}
      />
      <circle cx={cx} cy={cy} r={2.5} fill='#B08D5B' />
    </svg>
  )
}
