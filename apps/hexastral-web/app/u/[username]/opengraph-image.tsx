import { ImageResponse } from 'next/og'
import { derivePublicSignature } from '@/lib/publicSignature'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const alt = 'HexAstral Profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

interface PublicVisibility {
  basic: boolean
  signature: boolean
  bazi: boolean
  ziwei: boolean
}

interface PublicUser {
  username: string
  displayName: string | null
  avatarKey: string | null
  chartPublic: boolean
  visibility?: PublicVisibility
  fateSignature?: string | null
  dayMasterStem?: string | null
  dayMasterStrength?: string | null
  ziweiMingPalaceStar?: string | null
  locale?: string | null
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  let displayName = `@${username}`
  let hasChart = false
  let signatureLine: string | null = null

  try {
    const res = await fetch(`${API_URL}/api/user/by-username/${encodeURIComponent(username)}`, {
      headers: { 'x-client-platform': 'web' },
      cache: 'no-store',
    })
    if (res.ok) {
      const json = (await res.json()) as { data: PublicUser }
      const allowBasic = json.data.visibility?.basic ?? true
      displayName = allowBasic
        ? json.data.displayName?.trim() || `@${json.data.username}`
        : `@${json.data.username}`
      hasChart = json.data.chartPublic
      const allowSig = json.data.visibility?.signature ?? true
      if (allowSig) {
        const rawSig = json.data.fateSignature?.trim()
        const derived = !rawSig
          ? derivePublicSignature({
              dayMasterStem: json.data.dayMasterStem,
              dayMasterStrength: json.data.dayMasterStrength,
              ziweiMingPalaceStar: json.data.ziweiMingPalaceStar,
              locale: json.data.locale,
            })
          : null
        const line = rawSig || derived?.signature?.trim() || ''
        const singleLine = line.includes('\n') ? (line.split('\n')[0] ?? line) : line
        if (singleLine) {
          signatureLine = singleLine.length > 24 ? `${singleLine.slice(0, 23)}…` : singleLine
        }
      }
    }
  } catch {
    // fallback to defaults
  }

  const initial = (displayName[0] ?? '✦').toUpperCase()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(145deg, #0a0a0c 0%, #141418 50%, #0a0a0c 100%)',
        fontFamily: 'sans-serif',
        padding: '60px 80px',
      }}
    >
      {/* Top brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #c4a862, #7b5ea7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: '#fff',
          }}
        >
          ✦
        </div>
        <span
          style={{
            fontSize: 20,
            letterSpacing: '0.3em',
            color: '#c4a862',
            textTransform: 'uppercase',
          }}
        >
          HexAstral
        </span>
      </div>

      {/* Avatar circle */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          background: 'rgba(196, 168, 98, 0.12)',
          border: '1px solid rgba(196, 168, 98, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
          color: '#c4a862',
          fontWeight: 300,
          marginBottom: '24px',
        }}
      >
        {initial}
      </div>

      {/* Display name */}
      <div
        style={{
          fontSize: 40,
          fontWeight: 300,
          color: '#FAFAFA',
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        {displayName}
      </div>

      {/* Username */}
      <div
        style={{
          fontSize: 18,
          color: '#c4a862',
          letterSpacing: '0.1em',
          marginBottom: '16px',
        }}
      >
        @{username}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: signatureLine ? 22 : 18,
          fontWeight: 300,
          color: signatureLine ? '#c4a862' : '#A1A1AA',
          textAlign: 'center',
          maxWidth: 900,
          lineHeight: 1.35,
        }}
      >
        {signatureLine ?? (hasChart ? 'View my cosmic chart' : 'Cosmic blueprint on HexAstral')}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          fontSize: 14,
          color: '#52525B',
          letterSpacing: '0.1em',
        }}
      >
        hexastral.com
      </div>
    </div>,
    { ...size }
  )
}
