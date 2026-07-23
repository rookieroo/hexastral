import Image from 'next/image'
import { AppCTA } from './AppCTA'
import { BrandLegalFooter } from './BrandLegalFooter'
import { BRAND_STORE, type BrandLocale, pickLocale } from './brand-config'

/**
 * Kanyu (堪舆) brand home — served on kanyu.hexastral.com. Ink-night + bronze
 * accents match the feng-app night surface. Self-contained i18n.
 */

const C = {
  bg: '#0B1219',
  ink: '#F5F0E8',
  inkDim: 'rgba(245,240,232,0.62)',
  inkMuted: 'rgba(245,240,232,0.34)',
  bronze: '#A2937E',
  bronzeDim: 'rgba(162,147,126,0.45)',
  hair: 'rgba(245,240,232,0.10)',
}

const STR: Record<
  BrandLocale,
  {
    headline: string
    sub: string
    features: string[]
    privacy: string
    terms: string
    foot: string
  }
> = {
  en: {
    headline: 'Read the site the way classical practitioners do.',
    sub: 'A feng-shui (堪舆) site-analysis tool — satellite context, compass bearing, optional floor plans, and cited AI commentary. Educational, not predictive.',
    features: ['Compass & bearing', 'Satellite read', 'Floor plan rooms', 'Classical AI chat'],
    privacy: 'Privacy',
    terms: 'Terms',
    foot: 'Educational, not predictive',
  },
  zh: {
    headline: '用古典堪舆的方式读建成环境。',
    sub: '风水居所分析工具 —— 卫星语境、罗盘坐向、可选户型图与典籍语境的 AI 解读。重在研习，而非预测。',
    features: ['罗盘坐向', '卫星峦头', '户型内局', '古典对话'],
    privacy: '隐私政策',
    terms: '使用条款',
    foot: '重在研习，而非预测',
  },
  tw: {
    headline: '用古典堪輿的方式讀建成環境。',
    sub: '風水居所分析工具 —— 衛星語境、羅盤坐向、可選戶型圖與典籍語境的 AI 解讀。重在研習，而非預測。',
    features: ['羅盤坐向', '衛星巒頭', '戶型內局', '古典對話'],
    privacy: '隱私政策',
    terms: '使用條款',
    foot: '重在研習，而非預測',
  },
  ja: {
    headline: '古典の堪輿のように、場所を読む。',
    sub: '風水の居所分析ツール —— 衛星コンテキスト、羅盤の向き、任意の間取り図、古典文脈付き AI 解説。予測ではなく、学習のために。',
    features: ['羅盤・向き', '衛星巒頭', '間取り内局', '古典 AI チャット'],
    privacy: 'プライバシー',
    terms: '利用規約',
    foot: '予測ではなく、学習のために',
  },
}

export function KanyuHome({ locale }: { locale: string }) {
  const t = STR[pickLocale(locale)]
  const store = BRAND_STORE.kanyu

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
          src='/brand/kanyu.png'
          alt='Kanyu'
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
            color: C.bronze,
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Kanyu · 堪舆
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
        <AppCTA
          ios={store.ios}
          android={store.android}
          bg={C.bronze}
          color={C.bg}
          labels={store.labels[pickLocale(locale)]}
        />
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
                border: `0.5px solid ${C.bronzeDim}`,
                color: C.inkDim,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </section>

      <BrandLegalFooter
        brand='kanyu'
        locale={locale}
        foot={t.foot}
        linkColor={C.bronze}
        mutedColor={C.inkMuted}
        borderColor={C.hair}
        hostLabel='kanyu.hexastral.com'
      />
    </main>
  )
}
