import { StarBackground } from '@/components/StarBackground'
import { AppCTA } from './AppCTA'
import { BrandLegalFooter } from './BrandLegalFooter'
import { BRAND_STORE, type BrandLocale, pickLocale } from './brand-config'

/**
 * Yuel (缘) brand home — served on yuel.hexastral.com. Faithful to the app's
 * "living night sky": stone-void ground (#0C0A09), the cool star field, the
 * you-star (gold halo + white core) with orbiting thread-stars, and the real
 * 同心结 app icon. Serif display, cinnabar seal accent. Self-contained i18n.
 */

const C = {
  bg: '#0C0A09',
  ink: '#F5F0E8',
  inkDim: 'rgba(245,240,232,0.62)',
  inkMuted: 'rgba(245,240,232,0.34)',
  cinnabar: '#9B2226',
  cinnabarBright: '#C0392B',
  gold: '#C4A882',
  hair: 'rgba(245,240,232,0.10)',
}

const STR: Record<
  BrandLocale,
  { headline: string; sub: string; features: string[]; foot: string }
> = {
  en: {
    headline: 'Your reading, and the people you’re bound to.',
    sub: 'A personal 命書 grounded in BaZi and ZiWei, and a two-chart synastry for the people who matter. Educational, not predictive.',
    features: ['Personal reading', 'Synastry (合盘)', 'Relationship timeline', 'What-if'],
    foot: 'Educational, not predictive',
  },
  zh: {
    headline: '你的命书，和你命中相系的人。',
    sub: '以八字、紫微为底的个人命书，与在乎之人的双盘合参。重在认知，而非预测。',
    features: ['个人命书', '双人合盘', '关系时间轴', '假如'],
    foot: '重在认知，而非预测',
  },
  tw: {
    headline: '你的命書，和你命中相繫的人。',
    sub: '以八字、紫微為底的個人命書，與在乎之人的雙盤合參。重在認知，而非預測。',
    features: ['個人命書', '雙人合盤', '關係時間軸', '假如'],
    foot: '重在認知，而非預測',
  },
  ja: {
    headline: 'あなたの命書と、結ばれた人々。',
    sub: '八字・紫微にもとづく個人鑑定と、大切な人との相性。予測ではなく、理解のために。',
    features: ['個人鑑定', '相性（合盤）', '関係タイムライン', 'もしも'],
    foot: '予測ではなく、理解のために',
  },
}

export function YuelHome({ locale }: { locale: string }) {
  const t = STR[pickLocale(locale)]
  const store = BRAND_STORE.yuel

  return (
    <main
      style={{ position: 'relative', minHeight: '100dvh', background: C.bg, overflowX: 'hidden' }}
    >
      <StarBackground density={120} />

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
          {/* biome-ignore lint/performance/noImgElement: static brand asset, no next/image config */}
          <img
            src='/brand/yuel.png'
            alt='Yuel'
            width={28}
            height={28}
            style={{ borderRadius: 7 }}
          />
          <span style={{ fontSize: 15, letterSpacing: 1, color: C.ink }}>Yuel</span>
        </span>
        <span style={{ fontSize: 11, letterSpacing: 2, color: C.inkMuted }}>缘 · 命 + 缘</span>
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
        {/* You-star: gold halo + white core, the app's signature hero motif */}
        <div style={{ position: 'relative', width: 200, height: 120, marginBottom: 8 }}>
          <div
            style={{
              position: 'absolute',
              left: 16,
              top: 28,
              width: 168,
              height: 64,
              border: '0.5px solid rgba(188,204,234,0.20)',
              borderRadius: '50%',
              transform: 'rotate(-12deg)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 150,
              top: 40,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#D8E2F6',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 38,
              top: 66,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#BCCCEA',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 70,
              top: 30,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, #ffffff 8%, #E6C88C 20%, rgba(196,168,130,0.34) 46%, rgba(196,168,130,0) 72%)',
            }}
          />
        </div>

        {/* biome-ignore lint/performance/noImgElement: static brand asset */}
        <img
          src='/brand/yuel.png'
          alt='Yuel app icon'
          width={68}
          height={68}
          style={{ borderRadius: 16 }}
        />

        <div style={{ marginTop: 14, fontSize: 11, letterSpacing: 5, color: C.cinnabarBright }}>
          YUEL · 缘
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

        <div style={{ marginTop: 26 }}>
          <AppCTA
            ios={store.ios}
            android={store.android}
            bg={C.cinnabar}
            color={C.ink}
            labels={store.labels[pickLocale(locale)]}
          />
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

      <BrandLegalFooter
        brand='yuel'
        locale={locale}
        foot={t.foot}
        linkColor={C.gold}
        mutedColor={C.inkMuted}
        borderColor={C.hair}
        hostLabel='yuel.hexastral.com'
      />
    </main>
  )
}
