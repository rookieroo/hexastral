import { kindredPaper as P } from '@zhop/hexastral-tokens/kindred'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'HexAstral Report'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

/** Report types the generic star-theme OG renders (Kindred shares branch away). */
type OGType = 'stellar' | 'natal' | 'yiching' | 'fate' | 'physiognomy' | 'hehun'

const TYPE_META: Record<OGType, { en: string; zh: string; icon: string; color: string }> = {
  stellar: { en: 'ZiWei Chart', zh: '紫微斗数命盘', icon: '☆', color: '#7b5ea7' },
  natal: { en: 'BaZi Chart', zh: '八字命盘', icon: '乾', color: '#c4a862' },
  yiching: { en: 'I Ching Hexagram', zh: '易经卦学', icon: '兑', color: '#C4A862' },
  fate: { en: 'Full Chart Report', zh: '综合命书', icon: '命', color: '#7b5ea7' },
  physiognomy: { en: 'Face Reading', zh: '面相解读', icon: '相', color: '#A0845C' },
  hehun: { en: 'Compatibility', zh: '合婚', icon: 'Yuel', color: '#C4A882' },
}

/** harmony | tension | … → an always-renderable Latin verdict (CJK may tofu in Satori). */
const CATEGORY_WORD_EN: Record<string, string> = {
  harmony: 'IN HARMONY',
  tension: 'IN TENSION',
  growth: 'IN GROWTH',
  karmic: 'A KARMIC TIE',
  volatile: 'VOLATILE',
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

function parseContent(contentJson: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(contentJson) as unknown
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // malformed
  }
  return null
}

function extractSnippet(contentJson: string): string {
  try {
    const parsed = JSON.parse(contentJson) as unknown
    if (typeof parsed === 'string') return parsed.slice(0, 100)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>
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

/** Yuel-branded 宣纸 OG for a 合盘 (pair) or personal 命书 (fate + brand yuel). The
 *  English verdict + YUEL + url always render; the archetype is the CJK hero. */
function kindredImage(opts: {
  type: string
  content: Record<string, unknown> | null
  titleHint: string | null
}): ImageResponse {
  const { type, content, titleHint } = opts
  const isPair = type === 'pair'
  const c = content ?? {}
  const hero = str(c.archetypeName) ?? str(c.dayMaster) ?? titleHint ?? ''
  const tagline = str(c.archetypeTagline) ?? ''
  const category = str(c.archetypeCategory)
  const verdict = (category && CATEGORY_WORD_EN[category]) || (isPair ? 'A BOND' : 'A LIFE')
  const a = str(c.personAName)
  const b = str(c.personBName)

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: P.bg,
        fontFamily: 'serif',
        padding: '60px 80px',
      }}
    >
      <div
        style={{
          fontSize: 22,
          letterSpacing: '0.45em',
          color: P.cinnabar,
          marginBottom: 28,
        }}
      >
        YUEL
      </div>

      {isPair && a && b ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <span style={{ fontSize: 26, color: P.inkSoft }}>{a}</span>
          <span style={{ width: 56, height: 2, background: P.cinnabar, display: 'flex' }} />
          <span style={{ fontSize: 26, color: P.inkSoft }}>{b}</span>
        </div>
      ) : null}

      {hero ? (
        <div
          style={{
            fontSize: 76,
            fontWeight: 500,
            color: P.ink,
            textAlign: 'center',
            maxWidth: 900,
            marginBottom: 18,
          }}
        >
          {hero}
        </div>
      ) : null}

      {tagline ? (
        <div
          style={{
            fontSize: 26,
            color: P.inkSoft,
            textAlign: 'center',
            maxWidth: 760,
            lineHeight: 1.5,
            marginBottom: 22,
          }}
        >
          {tagline}
        </div>
      ) : null}

      <div style={{ fontSize: 20, letterSpacing: '0.35em', color: P.bronze }}>{verdict}</div>

      <div
        style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 16,
          color: P.muted,
          letterSpacing: '0.15em',
        }}
      >
        hexastral.com
      </div>
    </div>,
    { ...size }
  )
}

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params

  let type = 'stellar'
  let titleHint: string | null = null
  let snippet = ''
  let content: Record<string, unknown> | null = null

  try {
    const res = await fetch(`${API_URL}/api/share/${shareId}`)
    if (res.ok) {
      const json = (await res.json()) as { data: { type: string; titleHint: string | null; contentJson: string } }
      type = json.data.type
      titleHint = json.data.titleHint
      content = parseContent(json.data.contentJson)
      snippet = extractSnippet(json.data.contentJson)
    }
  } catch {
    // fallback to defaults
  }

  // Kindred shares get the Yuel-branded card; everything else the star theme.
  if (type === 'pair' || content?.brand === 'yuel') {
    return kindredImage({ type, content, titleHint })
  }

  const meta = TYPE_META[type as OGType] ?? TYPE_META.stellar

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
