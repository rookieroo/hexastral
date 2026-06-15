/**
 * /s/makeif/[token] — server-rendered share landing for an Auspice make-if (假如) fork.
 *
 * Token-based, no DB lookup: the share helper in auspice-app base64url-encodes a
 * compact payload ({t, l, o, lc}) of the fork title, branch label, narrative, and
 * locale. This route decodes it and renders a branded card + install CTA. The
 * companion `opengraph-image.tsx` produces the iMessage/social preview image, so
 * a forwarded link previews AS THE CARD (not a generic landing) — the fix for
 * "the share link is a 404" (it actually went to hexastral.com root before).
 *
 * Why not /api/share + DB: make-if narratives are already cached per-locale on
 * the worker, the payload is self-contained, and a tokenless URL means the
 * mobile send path has zero auth round-trips — important since Pro users are
 * the ones generating these shares and the fewer steps between "tap share" and
 * "iMessage sheet" the better.
 */

import type { Metadata } from 'next'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'

interface MakeifPayload {
  /** Fork title, e.g. "假如当年 · 25 岁". Server already localized in the app. */
  t: string
  /** Branch label, e.g. the user's event chip or custom text. */
  l: string
  /** Narrative outcome paragraph (LLM-generated). */
  o: string
  /** Optional 1-line 概要 / at-a-glance summary — the takeaway, rendered above `o`. */
  sm?: string
  /** Locale (zh-Hans | zh-Hant | ja | en) the narrative is written in. */
  lc?: string
}

function decodeToken(token: string): MakeifPayload | null {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? b64 : b64.padEnd(b64.length + (4 - (b64.length % 4)), '=')
    const json = Buffer.from(pad, 'base64').toString('utf8')
    const parsed = JSON.parse(json) as Partial<MakeifPayload>
    if (
      typeof parsed.t !== 'string' ||
      typeof parsed.l !== 'string' ||
      typeof parsed.o !== 'string'
    )
      return null
    return {
      t: parsed.t.slice(0, 80),
      l: parsed.l.slice(0, 80),
      o: parsed.o.slice(0, 1200),
      sm: typeof parsed.sm === 'string' ? parsed.sm.slice(0, 160) : undefined,
      lc: typeof parsed.lc === 'string' ? parsed.lc : 'en',
    }
  } catch {
    return null
  }
}

interface ShareCopy {
  tagline: string
  cta: string
  hero: string
  /** Footer pitch — fully localized (no Latin lead-in to avoid CN/EN mixing). */
  footer: string
  /** Shown when the token is malformed (localized — no English leak in zh/ja). */
  malformed: string
}

const EN_COPY: ShareCopy = {
  tagline: 'A "what if" branch from a bāzì life',
  cta: 'See your own',
  hero: 'YUUN · MAKE IF',
  footer: 'Yuun — explore a parallel life, drawn from your bāzì',
  malformed: 'This 假如 link is malformed or has been truncated. Open Yuun to make a new one.',
}

const COPY: Record<string, ShareCopy> = {
  'zh-Hans': {
    tagline: '一个「假如」的命运分支',
    cta: '看看你自己的',
    hero: 'YUUN 假如',
    footer: 'Yuun · 八字推演 —— 探一条平行的人生',
    malformed: '这个「假如」链接已失效或被截断。打开 Yuun 重新生成一个。',
  },
  'zh-Hant': {
    tagline: '一個「假如」的命運分支',
    cta: '看看你自己的',
    hero: 'YUUN 假如',
    footer: 'Yuun · 八字推演 —— 探一條平行的人生',
    malformed: '這個「假如」連結已失效或被截斷。打開 Yuun 重新生成一個。',
  },
  ja: {
    tagline: '「もしも」のもう一つの人生',
    cta: 'あなたのも見てみる',
    hero: 'YUUN 假如',
    footer: 'Yuun · 八字から導く、もう一つの人生',
    malformed: 'この「假如」リンクは無効か、切り詰められています。Yuun で作り直してください。',
  },
  en: EN_COPY,
}

function copyFor(lc: string | undefined): ShareCopy {
  return COPY[lc ?? 'en'] ?? EN_COPY
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const payload = decodeToken(token)
  if (!payload) {
    return { title: 'Yuun — 假如', description: 'A make-if branch from Yuun.' }
  }
  const copy = copyFor(payload.lc)
  const title = `${payload.t} · ${payload.l} — Yuun 假如`
  return {
    title,
    description: copy.tagline,
    openGraph: { title, description: copy.tagline, siteName: 'Yuun' },
  }
}

export default async function MakeifSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = decodeToken(token)
  const copy = copyFor(payload?.lc)

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(160deg, #FBF7F0 0%, #F3EADC 100%)',
        color: '#2B2118',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2.5rem 1.5rem 4rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            letterSpacing: '0.3em',
            color: '#9A6A3A',
            fontSize: '0.8rem',
          }}
        >
          {copy.hero}
        </div>

        {payload ? (
          <div
            style={{
              background: '#FFFDF8',
              border: '1px solid #E7D9C4',
              borderRadius: 18,
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem',
              boxShadow: '0 8px 30px rgba(150,110,60,0.08)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '1.55rem', fontWeight: 600, lineHeight: 1.25 }}>
                {payload.t}
              </div>
              <div
                style={{
                  fontSize: '1rem',
                  color: '#9A6A3A',
                  letterSpacing: '0.05em',
                }}
              >
                {payload.l}
              </div>
            </div>

            {payload.sm ? (
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  lineHeight: 1.5,
                  color: '#2B2118',
                  borderLeft: '3px solid #C99A5B',
                  paddingLeft: '0.85rem',
                }}
              >
                {payload.sm}
              </div>
            ) : null}

            <div
              style={{
                fontSize: '0.97rem',
                lineHeight: 1.75,
                color: '#3A2E22',
                whiteSpace: 'pre-wrap',
              }}
            >
              {payload.o}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#FFFDF8',
              border: '1px solid #E7D9C4',
              borderRadius: 18,
              padding: '2rem 1.5rem',
              textAlign: 'center',
              color: '#8A7866',
              fontSize: '0.95rem',
            }}
          >
            {copy.malformed}
          </div>
        )}

        <div
          style={{
            background: '#FFFDF8',
            border: '1px solid #E7D9C4',
            borderRadius: 16,
            padding: '1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>{copy.tagline}</p>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: '#8A7866',
              maxWidth: 320,
              lineHeight: 1.6,
            }}
          >
            {copy.footer}
          </p>
          <DDLRedirectButton
            payload={{ source: 'auspice_makeif_share' }}
            targetApp='auspice'
            appStoreUrl={resolveAppStoreUrl('auspice')}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '0.7rem 1.8rem',
                background: 'linear-gradient(135deg, #C99A5B, #9A6A3A)',
                color: '#fff',
                borderRadius: 12,
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            >
              {copy.cta}
            </span>
          </DDLRedirectButton>
        </div>
      </div>
    </main>
  )
}
