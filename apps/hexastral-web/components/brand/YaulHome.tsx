import { AppCTA } from './AppCTA'
import { BRAND_STORE, type BrandLocale, pickLocale } from './brand-config'

/**
 * Yaul (爻) brand home — served on yaul.hexastral.com. Zinc void + ink-gold
 * accents; three-coin motif matches the CoinCast ritual scene. Self-contained i18n.
 */

const C = {
  bg: '#09090B',
  ink: '#F5F0E8',
  inkDim: 'rgba(245,240,232,0.62)',
  inkMuted: 'rgba(245,240,232,0.34)',
  gold: '#C4A882',
  goldDim: 'rgba(196,168,130,0.45)',
  brown: '#3C2415',
  hair: 'rgba(245,240,232,0.10)',
  stone: '#18181B',
}

const STR: Record<
  BrandLocale,
  {
    headline: string
    sub: string
    features: string[]
    try: string
    privacy: string
    terms: string
    foot: string
  }
> = {
  en: {
    headline: 'Three coins. Six lines. One question.',
    sub: 'An I Ching Liu Yao (六爻) study journal — 3D coin casting, classical line rules, and cited commentary. Educational, not predictive.',
    features: ['3D coin cast', 'Liu Yao lines', 'Hexagram journal', 'Classical AI read'],
    try: 'Try a cast in browser',
    privacy: 'Privacy',
    terms: 'Terms',
    foot: 'Educational, not predictive',
  },
  zh: {
    headline: '三枚铜钱，六爻成卦。',
    sub: '易经六爻研习工具 —— 三维摇卦、古典爻值与外应规则，附典籍语境的 AI 释读。重在研习，而非预测。',
    features: ['三维摇卦', '六爻成卦', '卦象日记', '古典释读'],
    try: '在浏览器中试摇一卦',
    privacy: '隐私政策',
    terms: '使用条款',
    foot: '重在研习，而非预测',
  },
  tw: {
    headline: '三枚銅錢，六爻成卦。',
    sub: '易經六爻研習工具 —— 三維搖卦、古典爻值與外應規則，附典籍語境的 AI 釋讀。重在研習，而非預測。',
    features: ['三維搖卦', '六爻成卦', '卦象日記', '古典釋讀'],
    try: '在瀏覽器中試搖一卦',
    privacy: '隱私政策',
    terms: '使用條款',
    foot: '重在研習，而非預測',
  },
  ja: {
    headline: '三枚の銭で、六爻の卦を立てる。',
    sub: '易経六爻の学習ジャーナル —— 3D 起卦、古典の爻値と外応。予測ではなく、古典に基づく内省のために。',
    features: ['3D 起卦', '六爻', '卦の記録', '古典 AI 解説'],
    try: 'ブラウザで試す',
    privacy: 'プライバシー',
    terms: '利用規約',
    foot: '予測ではなく、学習のために',
  },
}

function localePath(locale: string, path: string): string {
  const l = pickLocale(locale)
  if (l === 'en') return path
  return `/${l}${path}`
}

function tryHref(locale: string): string {
  const l = pickLocale(locale)
  if (l === 'en') return '/coin-cast/try'
  if (l === 'zh') return '/zh/coin-cast/try'
  if (l === 'tw') return '/tw/coin-cast/try'
  return '/ja/coin-cast/try'
}

/** Three ink-wash coins — simplified hero motif (no WebGL). */
function CoinTrio() {
  const coins = [
    { cx: 52, rot: -8 },
    { cx: 100, rot: 4 },
    { cx: 148, rot: -5 },
  ]
  return (
    <svg width={200} height={88} viewBox='0 0 200 88' aria-hidden style={{ marginBottom: 12 }}>
      {coins.map((c, i) => (
        <g key={i} transform={`translate(${c.cx}, 44) rotate(${c.rot})`}>
          <circle r={34} fill={C.stone} stroke={C.goldDim} strokeWidth={1.2} />
          <circle r={28} fill='none' stroke='rgba(196,168,130,0.35)' strokeWidth={0.8} />
          <rect x={-9} y={-9} width={18} height={18} rx={2} fill='#0a0a0b' stroke={C.brown} strokeWidth={1} />
        </g>
      ))}
    </svg>
  )
}

export function YaulHome({ locale }: { locale: string }) {
  const t = STR[pickLocale(locale)]
  const store = BRAND_STORE.yaul

  return (
    <main
      style={{ position: 'relative', minHeight: '100dvh', background: C.bg, overflowX: 'hidden' }}
    >
      <nav
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 22px',
          borderBottom: `0.5px solid ${C.hair}`,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* biome-ignore lint/performance/noImgElement: static brand asset */}
          <img
            src='/brand/yaul.png'
            alt='Yaul'
            width={28}
            height={28}
            style={{ borderRadius: 7 }}
          />
          <span style={{ fontSize: 15, letterSpacing: 1, color: C.ink }}>Yaul</span>
        </span>
        <span style={{ fontSize: 11, letterSpacing: 2, color: C.inkMuted }}>爻 · 易经六爻</span>
      </nav>

      <section
        style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '74vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 24px',
        }}
      >
        <CoinTrio />

        {/* biome-ignore lint/performance/noImgElement: static brand asset */}
        <img
          src='/brand/yaul.png'
          alt='Yaul app icon'
          width={68}
          height={68}
          style={{ borderRadius: 16 }}
        />

        <div style={{ marginTop: 14, fontSize: 11, letterSpacing: 5, color: C.gold }}>
          YAUL · 爻
        </div>
        <h1
          style={{
            margin: '16px 0 0',
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 'clamp(26px, 5vw, 40px)',
            fontWeight: 400,
            lineHeight: 1.32,
            color: C.ink,
            maxWidth: 620,
          }}
        >
          {t.headline}
        </h1>
        <p
          style={{
            margin: '18px auto 0',
            maxWidth: 480,
            fontSize: 15,
            lineHeight: 1.7,
            color: C.inkDim,
          }}
        >
          {t.sub}
        </p>

        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <AppCTA
            ios={store.ios}
            android={store.android}
            bg={C.brown}
            color={C.ink}
            labels={store.labels[pickLocale(locale)]}
          />
          <a
            href={tryHref(locale)}
            style={{
              fontSize: 13,
              color: C.gold,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {t.try}
          </a>
        </div>

        <div
          style={{
            marginTop: 30,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 460,
          }}
        >
          {t.features.map((f) => (
            <span
              key={f}
              style={{
                fontSize: 12,
                padding: '5px 12px',
                borderRadius: 20,
                background: 'rgba(196,168,130,0.12)',
                color: C.gold,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </section>

      <footer
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '22px',
          borderTop: `0.5px solid ${C.hair}`,
          fontSize: 11,
          letterSpacing: 1,
          color: C.inkMuted,
        }}
      >
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 10 }}>
          <a
            href={localePath(locale, '/privacy/coincast')}
            style={{ color: C.gold, textDecoration: 'none' }}
          >
            {t.privacy}
          </a>
          <span aria-hidden>·</span>
          <a href={localePath(locale, '/terms')} style={{ color: C.gold, textDecoration: 'none' }}>
            {t.terms}
          </a>
        </div>
        {t.foot} · yaul.hexastral.com
      </footer>
    </main>
  )
}
