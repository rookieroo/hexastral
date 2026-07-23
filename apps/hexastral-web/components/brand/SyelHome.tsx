/**
 * Syel (形气) brand home — served on syel.hexastral.com.
 * Product teaser until App Store launch; ink-night + jade accent.
 */

import Image from 'next/image'
import { BrandLegalFooter } from './BrandLegalFooter'
import { type BrandLocale, pickLocale } from './brand-config'

const C = {
  bg: '#0A0F0C',
  ink: '#F5F0E8',
  inkDim: 'rgba(245,240,232,0.62)',
  inkMuted: 'rgba(245,240,232,0.34)',
  jade: '#6B8F71',
  jadeDim: 'rgba(107,143,113,0.45)',
  hair: 'rgba(245,240,232,0.10)',
}

const STR: Record<
  BrandLocale,
  {
    headline: string
    sub: string
    features: string[]
    soon: string
    foot: string
  }
> = {
  en: {
    headline: 'See your face and palms with your natal chart.',
    sub: 'Syel is a form-qi companion: left palm, right palm, and face — read together with BaZi. Clear chapters for career, love, and health windows. Study and reflection — not prediction.',
    features: ['Face & palms', 'Natal contrast', 'Period windows', 'Ask follow-ups'],
    soon: 'Coming soon on the App Store',
    foot: 'For study and reflection — not prediction',
  },
  zh: {
    headline: '面相、掌纹，对照你的命盘。',
    sub: 'Syel 是形气伴侣：左掌、右掌与面相，一并对照八字。事业、情感、健康近窗一目了然。用来研习与观照——不是算命。',
    features: ['面相与掌纹', '命盘对照', '本期窗口', '报告内追问'],
    soon: '即将上架 App Store',
    foot: '研习与观照——不是算命',
  },
  tw: {
    headline: '面相、掌紋，對照你的命盤。',
    sub: 'Syel 是形氣伴侶：左掌、右掌與面相，一併對照八字。事業、情感、健康近窗一目了然。用來研習與觀照——不是算命。',
    features: ['面相與掌紋', '命盤對照', '本期窗口', '報告內追問'],
    soon: '即將上架 App Store',
    foot: '研習與觀照——不是算命',
  },
  ja: {
    headline: '顔と掌を、あなたの命盤と照らす。',
    sub: 'Syel は形気の伴侶。左掌・右掌・顔を八字と対照し、仕事・恋愛・健康の近窓を章立てで示します。学びと省察のため——占いではありません。',
    features: ['顔と掌', '命盤対照', '今期の窓', 'レポート内の質問'],
    soon: '近日 App Store 公開',
    foot: '学びと省察のため——占いではありません',
  },
}

export function SyelHome({ locale }: { locale: string }) {
  const t = STR[pickLocale(locale)]

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: C.bg,
        color: C.ink,
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px 32px',
          textAlign: 'center',
        }}
      >
        <Image
          src='/brand/syel.png'
          alt='Syel'
          width={72}
          height={72}
          priority
          style={{
            borderRadius: 16,
            marginBottom: 18,
            boxShadow: '0 0 0 0.5px rgba(245,240,232,0.12)',
          }}
        />
        <p
          style={{
            fontSize: 13,
            letterSpacing: 4,
            color: C.jade,
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Syel · 形气
        </p>
        <h1
          style={{
            fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
            fontWeight: 300,
            lineHeight: 1.35,
            maxWidth: 520,
            margin: '0 0 16px',
          }}
        >
          {t.headline}
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            lineHeight: 1.75,
            color: C.inkDim,
            maxWidth: 480,
            margin: '0 0 28px',
          }}
        >
          {t.sub}
        </p>
        <p
          style={{
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: C.jade,
            padding: '12px 20px',
            border: `0.5px solid ${C.jadeDim}`,
          }}
        >
          {t.soon}
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            marginTop: 32,
            maxWidth: 440,
          }}
        >
          {t.features.map((f) => (
            <span
              key={f}
              style={{
                fontSize: 11,
                letterSpacing: 1,
                padding: '6px 12px',
                border: `0.5px solid ${C.jadeDim}`,
                color: C.inkDim,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </section>

      <BrandLegalFooter
        brand='syel'
        locale={locale}
        foot={t.foot}
        linkColor={C.jade}
        mutedColor={C.inkMuted}
        borderColor={C.hair}
        hostLabel='syel.hexastral.com'
      />
    </main>
  )
}
