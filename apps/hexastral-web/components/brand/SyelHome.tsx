/**
 * Syel (形气) brand home — served on syel.hexastral.com.
 * Teaser until App Store launch; ink-night + jade accent.
 */

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
    headline: 'Face, palms, and natal chart — one form-qi reading.',
    sub: 'Syel reads three photos (left palm, right palm, face) against BaZi — curated loci, five chapters, educational framing. Not predictive.',
    features: ['Face · palms', 'BaZi contrast', 'Locus map', 'Near-window actions'],
    soon: 'Coming soon',
    foot: 'Educational, not predictive',
  },
  zh: {
    headline: '面、掌、命盘——一次形气对照。',
    sub: 'Syel 以三张照片（左掌、右掌、面）对照八字——策展位点、五章简报。重在研习，而非预测。',
    features: ['面 · 掌', '八字对照', '位点图', '近窗与行动'],
    soon: '即将推出',
    foot: '重在研习，而非预测',
  },
  tw: {
    headline: '面、掌、命盤——一次形氣對照。',
    sub: 'Syel 以三張照片（左掌、右掌、面）對照八字——策展位點、五章簡報。重在研習，而非預測。',
    features: ['面 · 掌', '八字對照', '位點圖', '近窗與行動'],
    soon: '即將推出',
    foot: '重在研習，而非預測',
  },
  ja: {
    headline: '顔・掌・命盤——ひとつの形気の読み。',
    sub: 'Syel は三枚の写真（左掌・右掌・顔）と八字を対照——位点の策展と五章。予測ではなく、学習のために。',
    features: ['顔 · 掌', '八字対照', '位点マップ', '近窓と行動'],
    soon: '近日公開',
    foot: '予測ではなく、学習のために',
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
        <p
          style={{
            fontSize: 11,
            letterSpacing: 6,
            color: C.jade,
            marginBottom: 20,
            textTransform: 'uppercase',
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
