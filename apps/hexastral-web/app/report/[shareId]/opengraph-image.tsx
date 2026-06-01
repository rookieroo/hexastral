import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'HexAstral Report'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

interface ReportContent {
  type: 'stellar' | 'natal' | 'yiching' | 'fate' | 'physiognomy' | 'hehun'
  titleHint: string | null
  contentJson: string
}

const TYPE_META: Record<
  ReportContent['type'],
  { en: string; zh: string; icon: string; color: string }
> = {
  stellar: { en: 'ZiWei Chart', zh: '紫微斗数命盘', icon: '☆', color: '#7b5ea7' },
  natal: { en: 'BaZi Chart', zh: '八字命盘', icon: '乾', color: '#c4a862' },
  yiching: { en: 'I Ching Hexagram', zh: '易经卦学', icon: '兑', color: '#C4A862' },
  fate: { en: 'Full Chart Report', zh: '综合命书', icon: '命', color: '#7b5ea7' },
  physiognomy: { en: 'Face Reading', zh: '面相解读', icon: '相', color: '#A0845C' },
  hehun: { en: 'Compatibility', zh: '合婚', icon: '缘', color: '#C4A882' },
}

function extractSnippet(contentJson: string): string {
  try {
    const parsed = JSON.parse(contentJson) as unknown
    if (typeof parsed === 'string') return parsed.slice(0, 100)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>
      // Prefer punchy social hooks for fate readings (P1 dual-call output)
      const hooks = obj.hooks as { socialHooks?: unknown[] } | undefined
      if (hooks && Array.isArray(hooks.socialHooks) && hooks.socialHooks.length > 0) {
        const first = hooks.socialHooks[0]
        if (typeof first === 'string' && first.trim()) return first.slice(0, 100)
      }
      const keys = ['fullInterpretation', 'interpretation', 'analysis', 'content', 'text']
      for (const k of keys) {
        if (typeof obj[k] === 'string') return (obj[k] as string).slice(0, 100)
      }
    }
  } catch {
    // ignore
  }
  return ''
}

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params

  let type: ReportContent['type'] = 'stellar'
  let titleHint: string | null = null
  let snippet = ''

  try {
    const res = await fetch(`${API_URL}/api/share/${shareId}`)
    if (res.ok) {
      const json = (await res.json()) as { data: ReportContent }
      type = json.data.type
      titleHint = json.data.titleHint
      snippet = extractSnippet(json.data.contentJson)
    }
  } catch {
    // fallback to defaults
  }

  const meta = TYPE_META[type]

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
          marginBottom: '36px',
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

      {/* Report type icon */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: `${meta.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          color: meta.color,
          marginBottom: '20px',
        }}
      >
        {meta.icon}
      </div>

      {/* Type label */}
      <div
        style={{
          fontSize: 16,
          letterSpacing: '0.25em',
          color: meta.color,
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}
      >
        {meta.zh} · {meta.en}
      </div>

      {/* Title */}
      {titleHint && (
        <div
          style={{
            fontSize: 40,
            fontWeight: 300,
            color: '#FAFAFA',
            marginBottom: '16px',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          {titleHint}
        </div>
      )}

      {/* Snippet */}
      {snippet && (
        <div
          style={{
            fontSize: 18,
            fontWeight: 300,
            color: '#A1A1AA',
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.6,
          }}
        >
          {snippet}...
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
