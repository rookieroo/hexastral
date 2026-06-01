import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'HexAstral Resonance Invitation'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

interface InviteInfo {
  inviterName: string
  inviterAvatarUrl: string | null
  relationshipLabel: string
  targetName: string
  message: string | null
  archetypeName: string | null
  archetypeTagline: string | null
  archetypeCategory: string | null
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; token: string }>
}) {
  const { token } = await params

  let inviterName = 'Someone'
  let relationshipLabel = ''
  let message: string | null = null
  let archetypeName: string | null = null
  let archetypeTagline: string | null = null

  try {
    const res = await fetch(`${API_URL}/api/bonds/invite/${token}/info`)
    if (res.ok) {
      const json = (await res.json()) as { data: InviteInfo }
      inviterName = json.data.inviterName
      relationshipLabel = json.data.relationshipLabel
      message = json.data.message
      archetypeName = json.data.archetypeName
      archetypeTagline = json.data.archetypeTagline
    }
  } catch {
    // fallback to defaults
  }

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

      {/* Resonance icon */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'rgba(196, 168, 130, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          color: '#C4A882',
          marginBottom: '20px',
        }}
      >
        缘
      </div>

      {/* "invites you" label */}
      <div
        style={{
          fontSize: 16,
          letterSpacing: '0.25em',
          color: '#71717A',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}
      >
        共振 · Resonance
      </div>

      {/* Inviter name */}
      <div
        style={{
          fontSize: 44,
          fontWeight: 300,
          color: '#FAFAFA',
          marginBottom: '12px',
          textAlign: 'center',
          maxWidth: 800,
        }}
      >
        {inviterName}
      </div>

      {/* Relationship label */}
      {relationshipLabel && (
        <div
          style={{
            fontSize: 18,
            color: '#C4A882',
            letterSpacing: '0.15em',
            marginBottom: '8px',
          }}
        >
          {relationshipLabel}
        </div>
      )}

      {/* Archetype — shown when available */}
      {archetypeName && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            marginTop: '16px',
            padding: '12px 24px',
            border: '0.5px solid rgba(196,168,130,0.3)',
            background: 'rgba(196,168,130,0.06)',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 300,
              color: '#C4A882',
              letterSpacing: '0.05em',
              textAlign: 'center',
            }}
          >
            {archetypeName}
          </div>
          {archetypeTagline && (
            <div
              style={{
                fontSize: 15,
                fontWeight: 300,
                color: '#A1A1AA',
                fontStyle: 'italic',
                textAlign: 'center',
                maxWidth: 560,
              }}
            >
              {archetypeTagline}
            </div>
          )}
        </div>
      )}

      {/* Invitation text — shown when no archetype */}
      {!archetypeName && (
        <div
          style={{
            fontSize: 20,
            fontWeight: 300,
            color: '#A1A1AA',
            textAlign: 'center',
            maxWidth: 600,
            lineHeight: 1.6,
            marginTop: '8px',
          }}
        >
          {message ?? 'Invites you to discover your cosmic bond'}
        </div>
      )}

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
