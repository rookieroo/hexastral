import { kindredPaper as P } from '@zhop/hexastral-tokens/kindred'
import { DDLRedirectButton } from '@/components/DDLRedirectButton'

/**
 * KindredShareLanding — the Yuel-branded 宣纸 landing for a shared Kindred report
 * (the destination the in-app ShareableSynastryCard / ShareableReadingCard QR +
 * url point to). Rendered by /report/[shareId] when the share is a 合盘 (`pair`)
 * or a brand-marked personal 命书 (`fate` + `brand: 'yuel'`); every other report
 * type keeps the generic star-theme page.
 *
 * Two variants from one rice-paper frame:
 *   pair  — the archetype is the hero (你 —红线— TA), a verdict WORD not a score,
 *           the six 合盘 chapters teased, then the download CTA + the per-reader
 *           locale hook.
 *   solo  — the 日主 印章 + essence, the 格局 word, a blurred teaser of the reading.
 */

interface KindredShareLandingProps {
  type: string
  content: Record<string, unknown> | null
  titleHint: string | null
  shareId: string
}

const CATEGORY_WORD: Record<string, string> = {
  harmony: '相生',
  tension: '相激',
  growth: '相成',
  karmic: '宿缘',
  volatile: '相荡',
}

/** The six 合盘 chapters — the first two read as a taste, the rest sit locked. */
const PAIR_CHAPTERS = ['第一印象', '沟通方式', '冲突源头', '互补之处', '本月相处参考', '长期建议']

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

export function KindredShareLanding({
  type,
  content,
  titleHint,
  shareId,
}: KindredShareLandingProps) {
  const isPair = type === 'pair'
  const c = content ?? {}

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: P.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3rem 1.5rem 4rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column' }}>
        {/* Brand eyebrow */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.78rem',
            letterSpacing: '0.4em',
            color: P.cinnabar,
            marginBottom: '1.75rem',
          }}
        >
          {isPair ? '缘 · YUEL' : '命 · YUEL'}
        </div>

        {isPair ? <PairHero content={c} /> : <SoloHero content={c} titleHint={titleHint} />}

        {/* Teaser */}
        {isPair ? <PairTeaser /> : <SoloTeaser content={c} />}

        {/* Download CTA */}
        <div
          style={{ marginTop: '2.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          <DDLRedirectButton
            payload={{ source: isPair ? 'yuel_pair_share' : 'yuel_reading_share', shareId }}
          >
            <span
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '0.95rem 1rem',
                background: P.cinnabar,
                color: P.ctaText,
                borderRadius: 12,
                fontSize: '1rem',
                letterSpacing: '0.15em',
              }}
            >
              {isPair ? '下载 Yuel · 解锁完整合盘' : '下载 Yuel · 解锁完整命书'}
            </span>
          </DDLRedirectButton>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <StoreChip label='App Store' />
            <StoreChip label='Google Play' />
          </div>
        </div>

        {/* Per-reader-locale hook (pair only) */}
        {isPair ? (
          <p
            style={{
              marginTop: '1.25rem',
              textAlign: 'center',
              fontSize: '0.8rem',
              lineHeight: 1.7,
              color: P.muted,
            }}
          >
            对方也会收到同一份合盘 —— 用你们各自的语言。
          </p>
        ) : null}

        {/* Footer */}
        <div
          style={{
            marginTop: '2.5rem',
            textAlign: 'center',
            fontSize: '0.72rem',
            letterSpacing: '0.2em',
            color: P.muted,
          }}
        >
          {isPair ? '缘' : '命'} Yuel · hexastral.com
          <p style={{ marginTop: '0.75rem', letterSpacing: '0.05em', lineHeight: 1.6 }}>
            For entertainment, cultural exploration, and personal reflection only — not relationship
            counseling or professional advice.
          </p>
        </div>
      </div>
    </main>
  )
}

function PairHero({ content }: { content: Record<string, unknown> }) {
  const a = str(content.personAName) ?? '你'
  const b = str(content.personBName) ?? '对方'
  const archetype = str(content.archetypeName)
  const tagline = str(content.archetypeTagline)
  const category = str(content.archetypeCategory)
  const verdict = category ? CATEGORY_WORD[category] : null

  return (
    <div style={{ textAlign: 'center' }}>
      {/* you —红线— TA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          marginBottom: '1.5rem',
        }}
      >
        <span style={{ fontSize: '1.05rem', letterSpacing: '0.15em', color: P.inkSoft }}>{a}</span>
        <span
          style={{
            position: 'relative',
            width: 64,
            height: 2,
            background: P.cinnabar,
            margin: '0 16px',
            display: 'inline-block',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 9,
              height: 9,
              borderRadius: 5,
              background: P.cinnabar,
              transform: 'translate(-50%,-50%)',
            }}
          />
        </span>
        <span style={{ fontSize: '1.05rem', letterSpacing: '0.15em', color: P.inkSoft }}>{b}</span>
      </div>

      {archetype ? (
        <h1
          style={{
            margin: 0,
            fontSize: '2.4rem',
            fontWeight: 500,
            letterSpacing: '0.12em',
            color: P.ink,
            fontFamily: 'var(--font-serif, serif)',
          }}
        >
          {archetype}
        </h1>
      ) : null}
      {tagline ? (
        <p style={{ margin: '0.85rem 0 0', fontSize: '1rem', lineHeight: 1.7, color: P.inkSoft }}>
          {tagline}
        </p>
      ) : null}
      {verdict ? (
        <div
          style={{
            marginTop: '1.1rem',
            fontSize: '0.82rem',
            letterSpacing: '0.4em',
            color: P.bronze,
          }}
        >
          {verdict}
        </div>
      ) : null}
    </div>
  )
}

function SoloHero({
  content,
  titleHint,
}: {
  content: Record<string, unknown>
  titleHint: string | null
}) {
  const essence = str(content.dayMaster) ?? titleHint ?? '命书'
  const stem = [...essence][0] ?? '命'
  const geju = str(content.geju)

  return (
    <div style={{ textAlign: 'center' }}>
      {/* 朱文 印章 — cinnabar square with the 日主 stem in paper white */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 8,
          background: P.cinnabar,
          color: P.ctaText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          margin: '0 auto 1.5rem',
          fontFamily: 'var(--font-serif, serif)',
        }}
      >
        {stem}
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: '2.4rem',
          fontWeight: 500,
          letterSpacing: '0.12em',
          color: P.ink,
          fontFamily: 'var(--font-serif, serif)',
        }}
      >
        {essence}
      </h1>
      {geju ? (
        <div
          style={{
            marginTop: '1.1rem',
            fontSize: '0.82rem',
            letterSpacing: '0.4em',
            color: P.bronze,
          }}
        >
          {geju}
        </div>
      ) : null}
    </div>
  )
}

function PairTeaser() {
  return (
    <div style={{ marginTop: '2.25rem' }}>
      <div
        style={{
          textAlign: 'center',
          fontSize: '0.72rem',
          letterSpacing: '0.3em',
          color: P.muted,
          marginBottom: '1rem',
        }}
      >
        完整报告 · 6 章
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
        {PAIR_CHAPTERS.map((title, i) => (
          <span
            key={title}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 8,
              border: `1px solid ${P.hair}`,
              fontSize: '0.82rem',
              color: i < 2 ? P.ink : P.muted,
              background: i < 2 ? 'rgba(176,74,52,0.06)' : 'transparent',
              opacity: i < 2 ? 1 : 0.7,
            }}
          >
            {title}
          </span>
        ))}
      </div>
    </div>
  )
}

function SoloTeaser({ content }: { content: Record<string, unknown> }) {
  const text = str(content.fullInterpretation)
  if (!text) return null
  const preview = text.slice(0, 160)
  return (
    <div style={{ marginTop: '2rem', position: 'relative' }}>
      <p
        style={{
          margin: 0,
          fontSize: '0.95rem',
          lineHeight: 1.9,
          color: P.inkSoft,
          padding: '1.25rem 1.5rem',
          border: `1px solid ${P.hair}`,
          borderRadius: 14,
          whiteSpace: 'pre-wrap',
        }}
      >
        {preview}…
      </p>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55%',
          background: `linear-gradient(to bottom, transparent, ${P.bg})`,
          borderRadius: '0 0 14px 14px',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

function StoreChip({ label }: { label: string }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '0.6rem 0',
        border: `1px solid ${P.hair}`,
        borderRadius: 10,
        fontSize: '0.8rem',
        color: P.ink,
      }}
    >
      {label}
    </div>
  )
}
