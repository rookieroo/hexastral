import { HexastralPlanetLogo } from '@/components/HexastralPlanetLogo'
import { StarBackground } from '@/components/StarBackground'
import { Link } from '@/i18n/navigation'
import {
  APP_LAUNCH,
  appIsComingSoon,
  getHomepageAppsByAvailability,
  type AppId,
} from '@/lib/growth/launch-status'
import { type BrandLocale, pickLocale } from './brand-config'

/**
 * HexAstral suite home — apps grouped by availability (live vs coming soon).
 * Visibility driven by lib/growth/launch-status.ts per launch wave.
 */

interface SystemItem {
  glyph: string
  line: string
}
interface Strings {
  eyebrow: string
  headline: string
  goldLine: string
  sub: string
  system: SystemItem[]
  comingSoon: string
  privacy: string
  terms: string
  yuel: string
  yuun: string
  yaul: string
  kanyu: string
  foot: string
}

const STR: Record<BrandLocale, Strings> = {
  en: {
    eyebrow: 'Classical Chinese cosmology',
    headline: 'Your chart has structure worth reading.',
    goldLine: '八字 · 紫微 · 五行',
    sub: 'A millennium-old tradition of charting a life — Four Pillars and ZiWei palaces, read with AI. Educational, not predictive.',
    system: [
      { glyph: '命盤', line: 'Four Pillars — the chart of your birth moment' },
      { glyph: '紫微', line: 'ZiWei — the twelve-palace system' },
      { glyph: '五行 · 大運', line: 'Five Elements, read through decade cycles' },
    ],
    comingSoon: 'Coming soon',
    privacy: 'Privacy',
    terms: 'Terms',
    yuel: 'Your reading, and the people you’re bound to — synastry (合盘) and your 命書.',
    yuun: 'The Chinese almanac, every day — 宜忌, the lunar calendar, your decade timeline.',
    yaul: 'I Ching Liu Yao (六爻) — three-coin casting, hexagram journal, classical AI read.',
    kanyu: 'Classical feng-shui (堪舆) — pin a site, compass bearing, optional floor plan, structured site report.',
    foot: 'Educational, not predictive',
  },
  zh: {
    eyebrow: '中华命理传统',
    headline: '一张命盘，自有其结构。',
    goldLine: '八字 · 紫微 · 五行',
    sub: '传承千年的一套看待人生的方法——四柱八字与紫微诸宫，以 AI 辅以解读。重在认知，而非预测。',
    system: [
      { glyph: '命盤', line: '四柱——你出生时刻的命盘' },
      { glyph: '紫微', line: '紫微——十二宫的星曜系统' },
      { glyph: '五行 · 大運', line: '五行，循大运而读' },
    ],
    comingSoon: '即将推出',
    privacy: '隐私政策',
    terms: '使用条款',
    yuel: '你的命书，和你命中相系的人——合盘与个人命书。',
    yuun: '中华黄历，每日宜忌——农历、流年大运时间轴。',
    yaul: '易经六爻研习——三维摇卦、卦象日记与古典释读。',
    kanyu: '古典堪舆风水——定位居所、罗盘坐向、可选户型图与结构化报告。',
    foot: '重在认知，而非预测',
  },
  tw: {
    eyebrow: '中華命理傳統',
    headline: '一張命盤，自有其結構。',
    goldLine: '八字 · 紫微 · 五行',
    sub: '傳承千年的一套看待人生的方法——四柱八字與紫微諸宮，以 AI 輔以解讀。重在認知，而非預測。',
    system: [
      { glyph: '命盤', line: '四柱——你出生時刻的命盤' },
      { glyph: '紫微', line: '紫微——十二宮的星曜系統' },
      { glyph: '五行 · 大運', line: '五行，循大運而讀' },
    ],
    comingSoon: '即將推出',
    privacy: '隱私政策',
    terms: '使用條款',
    yuel: '你的命書，和你命中相繫的人——合盤與個人命書。',
    yuun: '中華黃曆，每日宜忌——農曆、流年大運時間軸。',
    yaul: '易經六爻研習——三維搖卦、卦象日記與古典釋讀。',
    kanyu: '古典堪輿風水——定位居所、羅盤坐向、可選戶型圖與結構化報告。',
    foot: '重在認知，而非預測',
  },
  ja: {
    eyebrow: '中国伝統の命理',
    headline: '命盤には、読むに値する構造がある。',
    goldLine: '八字 · 紫微 · 五行',
    sub: '千年を超える命盤の伝統——四柱と紫微の十二宮を、AI とともに読む。予測ではなく、理解のために。',
    system: [
      { glyph: '命盤', line: '四柱——あなたの出生の命盤' },
      { glyph: '紫微', line: '紫微——十二宮の星のシステム' },
      { glyph: '五行 · 大運', line: '五行を、大運を通して読む' },
    ],
    comingSoon: '近日公開',
    privacy: 'プライバシー',
    terms: '利用規約',
    yuel: 'あなたの命書と、結ばれた人々——相性（合盤）と個人鑑定。',
    yuun: '中華暦、毎日の吉凶——旧暦と大運のタイムライン。',
    yaul: '易経六爻の学び——三枚銭の起卦、卦の記録、古典 AI 解説。',
    kanyu: '古典風水（堪輿）——場所を指定、羅盤の向き、任意の間取り、構造化レポート。',
    foot: '予測ではなく、理解のために',
  },
}

const V = {
  void: '#050510',
  gold: '#c4a862',
  ivory: '#f5f0e8',
  dim: 'rgba(245,240,232,0.6)',
  hair: 'rgba(245,240,232,0.1)',
  goldHair: 'rgba(196,168,98,0.2)',
}

const APP_STYLE: Record<
  AppId,
  { border: string; bg: string; accent: string; icon?: string; glyph?: string }
> = {
  yuel: {
    border: '0.5px solid rgba(155,34,38,0.5)',
    bg: '#0f0a0b',
    accent: '#C0392B',
    icon: '/brand/yuel.png',
  },
  yuun: {
    border: '0.5px solid rgba(137,124,108,0.5)',
    bg: '#0e0d0c',
    accent: '#A2937E',
    icon: '/brand/yuun.png',
  },
  yaul: {
    border: '0.5px solid rgba(196,168,130,0.45)',
    bg: '#09090b',
    accent: '#C4A882',
    icon: '/brand/yaul.png',
  },
  kanyu: {
    border: '0.5px solid rgba(162,147,126,0.45)',
    bg: '#0b1219',
    accent: '#A2937E',
    icon: '/brand/kanyu.png',
    glyph: '堪',
  },
}

const APP_LABEL: Record<AppId, string> = {
  yuel: 'Yuel · 缘',
  yuun: 'Yuun · 运',
  yaul: 'Yaul · 爻',
  kanyu: 'Kanyu · 堪舆',
}

type AppCopyKey = 'yuel' | 'yuun' | 'yaul' | 'kanyu'

const APP_COPY_KEY: Record<AppId, AppCopyKey> = {
  yuel: 'yuel',
  yuun: 'yuun',
  yaul: 'yaul',
  kanyu: 'kanyu',
}

const JSON_LD_DESCRIPTION: Record<AppId, string> = {
  yuel: 'A personal 命書 (BaZi · ZiWei) and two-chart synastry. Educational, not predictive.',
  yuun: 'A daily Chinese almanac (黄历) grounded in classical cosmology. Educational, not predictive.',
  yaul: 'An I Ching Liu Yao (六爻) study journal with 3D coin casting. Educational, not predictive.',
  kanyu: 'Classical feng-shui (堪舆) site analysis with compass, satellite context, and optional floor plans. Educational, not predictive.',
}

function jsonLd(origin: string) {
  const apps = Object.values(APP_LAUNCH).filter((a) => a.visibility !== 'hidden')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'HexAstral',
        legalName: 'UseONE, LLC',
        url: origin,
        description:
          'Educational tools for classical Chinese chart-reading (BaZi / Four Pillars and ZiWei), AI-augmented and not predictive.',
      },
      { '@type': 'WebSite', name: 'HexAstral', url: origin },
      ...apps.map((app) => ({
        '@type': 'SoftwareApplication',
        name: app.displayName,
        applicationCategory:
          app.role === 'flagship' ? 'LifestyleApplication' : 'ReferenceApplication',
        operatingSystem: 'iOS, Android',
        url: app.brandHost,
        description: JSON_LD_DESCRIPTION[app.id],
      })),
    ],
  }
}

function AppIcon({ id }: { id: AppId }) {
  const style = APP_STYLE[id]
  if (style.icon) {
    return (
      // biome-ignore lint/performance/noImgElement: static brand asset
      <img src={style.icon} alt={APP_LAUNCH[id].displayName} width={30} height={30} style={{ borderRadius: 8 }} />
    )
  }
  return (
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        border: style.border,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        color: style.accent,
      }}
    >
      {style.glyph}
    </span>
  )
}

function AppCard({
  id,
  t,
  large,
}: {
  id: AppId
  t: Strings
  large: boolean
}) {
  const app = APP_LAUNCH[id]
  const style = APP_STYLE[id]
  const copyKey = APP_COPY_KEY[id]
  const host = app.brandHost.replace('https://', '')
  const coming = appIsComingSoon(id)

  return (
    <a
      href={app.brandHost}
      style={{
        flex: large ? '1 1 280px' : '1 1 200px',
        textDecoration: 'none',
        border: style.border,
        borderRadius: 14,
        padding: large ? 22 : 16,
        background: style.bg,
        opacity: coming ? 0.92 : 1,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <AppIcon id={id} />
        <span style={{ fontSize: large ? 16 : 14, letterSpacing: 1, color: V.ivory }}>
          {APP_LABEL[id]}
        </span>
        {coming ? (
          <span
            style={{
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: style.accent,
              border: `0.5px solid ${style.accent}`,
              borderRadius: 6,
              padding: '2px 6px',
            }}
          >
            {t.comingSoon}
          </span>
        ) : null}
      </span>
      <div
        style={{
          marginTop: 12,
          fontSize: large ? 13 : 12,
          lineHeight: 1.65,
          color: V.dim,
        }}
      >
        {t[copyKey]}
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          fontFamily: 'var(--font-mono, monospace)',
          color: style.accent,
        }}
      >
        {host} →
      </div>
    </a>
  )
}

export function HexastralHome({ locale, origin }: { locale: string; origin: string }) {
  const t = STR[pickLocale(locale)]
  const { live, comingSoon } = getHomepageAppsByAvailability()
  const linkStyle = { color: 'rgba(196,168,98,0.85)', textDecoration: 'none' as const }

  return (
    <main
      style={{ position: 'relative', minHeight: '100dvh', background: V.void, overflowX: 'hidden' }}
    >
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(origin)) }}
      />
      <StarBackground density={150} />

      <nav
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: `0.5px solid ${V.goldHair}`,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HexastralPlanetLogo size={26} phase={0.6} />
          <span style={{ fontSize: 15, letterSpacing: 1, color: V.gold }}>HexAstral</span>
        </span>
        <span style={{ fontSize: 11, letterSpacing: 2, color: V.dim }}>八字 · 紫微</span>
      </nav>

      <section
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '64px 24px 48px',
          maxWidth: 760,
          margin: '0 auto',
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 4, color: V.gold, textTransform: 'uppercase' }}>
          {t.eyebrow}
        </div>
        <h1
          style={{
            margin: '20px 0 0',
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 'clamp(28px, 5.5vw, 44px)',
            fontWeight: 400,
            lineHeight: 1.3,
            color: V.ivory,
          }}
        >
          {t.headline}
        </h1>
        <div style={{ marginTop: 16, fontSize: 16, letterSpacing: 6, color: V.gold }}>
          {t.goldLine}
        </div>
        <p
          style={{
            margin: '20px auto 0',
            maxWidth: 460,
            fontSize: 15,
            lineHeight: 1.75,
            color: V.dim,
          }}
        >
          {t.sub}
        </p>
      </section>

      <section
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 820,
          margin: '0 auto',
          padding: '0 24px 44px',
        }}
      >
        {t.system.map((s, i) => (
          <div
            key={s.glyph}
            style={{
              flex: '1 1 200px',
              minWidth: 180,
              textAlign: 'center',
              padding: '0 18px',
              borderRight: i < t.system.length - 1 ? `0.5px solid ${V.hair}` : 'none',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: 22,
                color: V.ivory,
              }}
            >
              {s.glyph}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6, color: V.dim }}>
              {s.line}
            </div>
          </div>
        ))}
      </section>

      <section
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 760,
          margin: '0 auto',
          padding: '0 24px 12px',
        }}
      >
        {live.length > 0 ? (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: comingSoon.length ? 24 : 0 }}>
            {live.map((app) => (
              <AppCard key={app.id} id={app.id} t={t} large />
            ))}
          </div>
        ) : null}

        {comingSoon.length > 0 ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {comingSoon.map((app) => (
              <AppCard key={app.id} id={app.id} t={t} large={false} />
            ))}
          </div>
        ) : null}
      </section>

      <footer
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          marginTop: 40,
          padding: '20px 24px',
          borderTop: `0.5px solid ${V.hair}`,
          fontSize: 11,
          letterSpacing: 1,
          color: 'rgba(245,240,232,0.34)',
        }}
      >
        {t.foot}
        {' · '}
        <Link href='/privacy' style={linkStyle}>
          {t.privacy}
        </Link>
        {' · '}
        <Link href='/terms' style={linkStyle}>
          {t.terms}
        </Link>
      </footer>
    </main>
  )
}
