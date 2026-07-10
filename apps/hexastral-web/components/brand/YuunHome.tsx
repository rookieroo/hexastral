import { AppCTA } from './AppCTA'
import { BrandLegalFooter } from './BrandLegalFooter'
import { BRAND_STORE, type BrandLocale, pickLocale } from './brand-config'

/**
 * Yuun (运) brand home — served on yuun.hexastral.com. Faithful to the app's
 * locked 苍墨-ink almanac: rice-paper ground (#F5F0E8), warm-gray ink (#897C6C),
 * the real moon app icon, and a 宜忌 block (宜 green / 忌 red). Layout-first,
 * content-dominant — the almanac speaks. Self-contained i18n.
 */

const C = {
  bg: '#F5F0E8',
  ink: '#09090B',
  inkSoft: '#3f3f46',
  dim: '#71717A',
  accent: '#897C6C',
  card: '#FFFFFF',
  sep: '#E4E4E7',
  good: '#16A34A',
  bad: '#DC2626',
}

const STR: Record<
  BrandLocale,
  {
    today: string
    dateline: string
    good: string
    bad: string
    goodItems: string[]
    badItems: string[]
    headline: string
    features: string[]
    foot: string
  }
> = {
  en: {
    today: 'Today',
    dateline: 'Jiǎ-zǐ day · 9th lunar month',
    good: 'FAVORABLE',
    bad: 'AVOID',
    goodItems: ['Travel', 'Agreements', 'Gatherings'],
    badItems: ['Construction', 'Moving', 'Big purchases'],
    headline: 'The Chinese almanac, every day.',
    features: ['Daily auspices', 'GanZhi', 'Annual cycle', 'What-if'],
    foot: 'Educational, not predictive',
  },
  zh: {
    today: '今日',
    dateline: '甲子日 · 冬月初九',
    good: '宜',
    bad: '忌',
    goodItems: ['祭祀', '出行', '会友'],
    badItems: ['动土', '安葬', '开市'],
    headline: '中华黄历，每日宜忌与节律参照。',
    features: ['每日宜忌', '干支', '流年', '假如'],
    foot: '重在认知，而非预测',
  },
  tw: {
    today: '今日',
    dateline: '甲子日 · 冬月初九',
    good: '宜',
    bad: '忌',
    goodItems: ['祭祀', '出行', '會友'],
    badItems: ['動土', '安葬', '開市'],
    headline: '中華黃曆，每日宜忌與運勢。',
    features: ['每日宜忌', '干支', '流年', '假如'],
    foot: '重在認知，而非預測',
  },
  ja: {
    today: '今日',
    dateline: '甲子の日 · 旧暦十一月九日',
    good: '吉',
    bad: '凶',
    goodItems: ['旅行', '契約', '会合'],
    badItems: ['工事', '引越', '開業'],
    headline: '中華暦、毎日の吉凶。',
    features: ['毎日の宜忌', '干支', '流年', 'もしも'],
    foot: '予測ではなく、理解のために',
  },
}

export function YuunHome({ locale }: { locale: string }) {
  const t = STR[pickLocale(locale)]
  const store = BRAND_STORE.yuun

  return (
    <main style={{ position: 'relative', minHeight: '100dvh', background: C.bg, overflowX: 'hidden' }}>
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 22px',
          borderBottom: `0.5px solid ${C.sep}`,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* biome-ignore lint/performance/noImgElement: static brand asset */}
          <img
            src='/brand/yuun.png'
            alt='Yuun'
            width={28}
            height={28}
            style={{ borderRadius: 7 }}
          />
          <span style={{ fontSize: 15, letterSpacing: 1, color: C.ink }}>Yuun</span>
        </span>
        <span style={{ fontSize: 11, letterSpacing: 2, color: C.accent }}>运 · 黄历</span>
      </nav>

      <section
        style={{
          minHeight: '72vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 24px',
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: static brand asset */}
        <img
          src='/brand/yuun.png'
          alt='Yuun app icon'
          width={68}
          height={68}
          style={{ borderRadius: 16 }}
        />

        <div style={{ marginTop: 14, fontSize: 11, letterSpacing: 5, color: C.accent }}>
          YUUN · 运
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 26,
            letterSpacing: 1,
            color: C.ink,
          }}
        >
          {t.today}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, letterSpacing: 0.5, color: C.dim }}>
          {t.dateline}
        </div>

        {/* 宜忌 block — the product, in miniature */}
        <div style={{ marginTop: 22, display: 'flex', gap: 12, width: '100%', maxWidth: 360 }}>
          <div
            style={{
              flex: 1,
              border: `0.5px solid ${C.sep}`,
              borderRadius: 10,
              padding: '11px 13px',
              background: C.card,
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1.5, color: C.good }}>
              {t.good}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.8, color: C.inkSoft }}>
              {t.goodItems.map((g) => (
                <div key={g}>{g}</div>
              ))}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              border: `0.5px solid ${C.sep}`,
              borderRadius: 10,
              padding: '11px 13px',
              background: C.card,
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1.5, color: C.bad }}>
              {t.bad}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.8, color: C.inkSoft }}>
              {t.badItems.map((b) => (
                <div key={b}>{b}</div>
              ))}
            </div>
          </div>
        </div>

        <p
          style={{
            margin: '22px auto 0',
            maxWidth: 360,
            fontSize: 14,
            lineHeight: 1.7,
            color: C.dim,
          }}
        >
          {t.headline}
        </p>

        <div style={{ marginTop: 22 }}>
          <AppCTA
            ios={store.ios}
            android={store.android}
            bg={C.ink}
            color={C.bg}
            labels={store.labels[pickLocale(locale)]}
          />
        </div>

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 380,
          }}
        >
          {t.features.map((f) => (
            <span
              key={f}
              style={{
                fontSize: 12,
                padding: '5px 12px',
                borderRadius: 20,
                background: 'rgba(137,124,108,0.12)',
                color: '#46535d',
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </section>

      <BrandLegalFooter
        brand='yuun'
        locale={locale}
        foot={t.foot}
        linkColor={C.accent}
        mutedColor={C.dim}
        borderColor={C.sep}
        hostLabel='yuun.hexastral.com'
      />
    </main>
  )
}
