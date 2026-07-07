/**
 * /[locale]/feng — Fēng (風) product landing page.
 *
 * Three goals:
 *   1. Communicate what Fēng is: site-anchored 风水 reading with 外巒頭 +
 *      personal 命卦 + 流年
 *   2. CTA "begin a site reading" → App Store DDL (Fēng app);
 *      "free preview" → /[locale]/feng/preview (8-question 八宅 mini-tool, V1.1)
 *   3. SEO: capture "feng shui app", "風水", "feng shui audit", "玄空飞星"
 *
 * Visual: 墨青 #0F1E26 dark ground with 銅金 #B08D5B accents and a seal-script
 * 風 hero glyph. Mirrors the Fēng mobile dark aesthetic so the brand feels
 * continuous across web ↔ app — contrast with /yuan which is warm rice-paper.
 *
 * Companion routes:
 *   - /feng-shui/[slug]   — SEO seed pages (kept for inbound links; long-form)
 */

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

interface FengLandingPageProps {
  params: Promise<{ locale: string }>
}

const APP_STORE_URL = 'https://apps.apple.com/app/feng/id000000000'

export async function generateMetadata({ params }: FengLandingPageProps): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> & { en: string } = {
    en: 'Kanyu: Classical Site Study',
    zh: 'Kanyu · 古典场所研习',
    tw: 'Kanyu · 古典場所研習',
    ja: 'Kanyu：古典場所の学習',
  }
  const descriptions: Record<string, string> & { en: string } = {
    en: 'Explore a home or office through classical Chinese site theory and satellite context — educational, not professional feng-shui service.',
    zh: '从卫星与古典场所理论探索一处宅地——文化研习工具，非专业风水服务。',
    tw: '從衛星與古典場所理論探索一處宅地——文化研習工具，非專業風水服務。',
    ja: '衛星と古典場所理論で住まいを学ぶ — 文化研習ツール、専門風水サービスではありません。',
  }
  const title = titles[locale] ?? titles.en
  return {
    title,
    description: descriptions[locale] ?? descriptions.en,
    openGraph: {
      title,
      description: descriptions[locale] ?? descriptions.en,
      siteName: 'HexAstral',
    },
    alternates: {
      canonical:
        locale === 'en' ? 'https://hexastral.com/feng' : `https://hexastral.com/${locale}/feng`,
    },
  }
}

export default async function FengLandingPage({ params }: FengLandingPageProps) {
  const { locale } = await params
  let t: ((k: string) => string) | null = null
  try {
    t = await getTranslations({ locale, namespace: 'feng' })
  } catch {
    t = null
  }

  const get = (k: string, fallback: string): string => {
    if (!t) return fallback
    try {
      return t(k)
    } catch {
      return fallback
    }
  }

  // Locale-aware fallback prose, mirroring /yuan/page.tsx style.
  interface HeroCopy {
    title: string
    subtitle: string
    body: string
  }
  const heroEn: HeroCopy = {
    title: 'Explore a place,',
    subtitle: 'through classical site theory',
    body: 'Kanyu generates a structured digital site report from your pin, facing, and optional floor plan — external landform notes, Eight-Mansions fit, and flying-star compute. For entertainment, cultural exploration, and personal reflection only — not on-site inspection or licensed professional advice.',
  }
  const heroDefaults: Record<string, HeroCopy> = {
    en: heroEn,
    zh: {
      title: '探索一处宅地',
      subtitle: '用古典场所理论作参考',
      body: 'Kanyu 根据地图坐标、坐向与可选户型图生成数字化站点报告 — 外峦头标注、八宅匹配、玄空飞星演算。仅供娱乐、文化探索与个人省思，非现场勘验或持证专业建议。',
    },
    tw: {
      title: '探索一處宅地',
      subtitle: '用古典場所理論作參考',
      body: 'Kanyu 依地圖座標、坐向與可選戶型圖生成數位化站點報告 — 外巒頭標註、八宅匹配、玄空飛星演算。僅供娛樂、文化探索與個人省思，非現場勘驗或持證專業建議。',
    },
    ja: {
      title: '場所を学ぶ、',
      subtitle: '古典の場所理論で',
      body: 'Kanyu は座標・向き・任意の間取りから構造化デジタルレポートを生成 — 巒頭注釈、八宅、玄空飛星。娯楽・文化探索・個人的省察のみ。現地調査や有資格専門家の代替ではありません。',
    },
  }

  const fallback: HeroCopy = heroDefaults[locale] ?? heroEn

  const ctas = {
    en: { begin: 'Start a site report  →', store: 'Get Kanyu on iOS' },
    zh: { begin: '开始一份站点报告  →', store: 'iOS 下载 Kanyu' },
    tw: { begin: '開始一份站點報告  →', store: 'iOS 下載 Kanyu' },
    ja: { begin: 'サイトレポートを始める  →', store: 'iOSで Kanyu を入手' },
  }
  const ctaCopy = ctas[locale as keyof typeof ctas] ?? ctas.en

  // Three short feature lines mirroring the mobile report's 6 chapters distilled to 3 themes
  const features = (() => {
    if (locale === 'zh' || locale === 'tw') {
      return [
        { title: '外巒頭', body: '路冲、反弓、明堂、朝案 — 卫星图上一目了然' },
        { title: '八宅 + 玄空', body: '命卦匹配 × 元运山向 × 流年方位' },
        { title: '六章节报告', body: '可分享，立春自动刷新' },
      ]
    }
    if (locale === 'ja') {
      return [
        { title: '外巒頭', body: '路冲・反弓・明堂・朝案 — 衛星画像で一目瞭然' },
        { title: '八宅 × 玄空', body: '命卦の相性 × 元運 × 流年方位' },
        { title: '6章レポート', body: '共有可・立春に自動更新' },
      ]
    }
    return [
      {
        title: 'External Landform',
        body: 'Road impingements, embracing forms, bright halls — visible from satellite view',
      },
      { title: '八宅 + Flying Stars', body: 'Personal trigram fit × current cycle × annual stars' },
      { title: '6-chapter report', body: 'Shareable, refreshed each solar year on 立春' },
    ]
  })()

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#0F1E26',
        color: '#E6E2D6',
        paddingTop: '120px',
        paddingBottom: '120px',
        paddingLeft: '28px',
        paddingRight: '28px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        {/* Hero seal */}
        <div
          style={{
            width: 144,
            height: 144,
            borderRadius: '50%',
            border: '0.5px solid #B08D5B',
            backgroundColor: 'rgba(176,141,91,0.06)',
            margin: '0 auto 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 72,
              color: '#B08D5B',
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            風
          </span>
        </div>

        <h1
          style={{
            fontSize: 48,
            lineHeight: 1.2,
            fontWeight: 300,
            letterSpacing: -1,
            marginBottom: 16,
          }}
        >
          {get('hero_title', fallback.title)}
        </h1>
        <p
          style={{
            fontSize: 24,
            lineHeight: 1.4,
            fontWeight: 400,
            color: 'rgba(230,226,214,0.65)',
            marginBottom: 56,
          }}
        >
          {get('hero_subtitle', fallback.subtitle)}
        </p>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            color: '#E6E2D6',
            marginBottom: 64,
            letterSpacing: 0.2,
            textAlign: 'left',
          }}
        >
          {get('body', fallback.body)}
        </p>

        {/* Feature triplet */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 24,
            marginBottom: 64,
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                padding: 24,
                borderRadius: 8,
                border: '0.5px solid rgba(176,141,91,0.25)',
                backgroundColor: 'rgba(176,141,91,0.03)',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: '#B08D5B',
                  marginBottom: 8,
                }}
              >
                {f.title}
              </div>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'rgba(230,226,214,0.85)',
                }}
              >
                {f.body}
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <a
            href={APP_STORE_URL}
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#B08D5B',
              letterSpacing: 0.5,
              borderBottom: '1px solid #B08D5B',
              paddingBottom: 12,
              paddingTop: 12,
              textDecoration: 'none',
            }}
          >
            {get('cta_begin', ctaCopy.begin)}
          </a>
          <a
            href={APP_STORE_URL}
            style={{
              fontSize: 11,
              color: 'rgba(230,226,214,0.65)',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {get('cta_app', ctaCopy.store)}
          </a>
        </div>

        <p
          style={{
            marginTop: 48,
            fontSize: 12,
            lineHeight: 1.6,
            color: 'rgba(230,226,214,0.5)',
            textAlign: 'center',
          }}
        >
          {locale === 'zh' || locale === 'tw'
            ? '仅供娱乐与文化研习，不能替代现场勘验、持证风水师、建筑师或施工决策。'
            : locale === 'ja'
              ? '娯楽・文化研習のみ。現地調査、有資格専門家、建築・施工判断の代替ではありません。'
              : 'For entertainment and cultural study only — not a substitute for on-site inspection, licensed practitioners, architects, or construction decisions.'}
        </p>

        <p
          style={{
            marginTop: 48,
            fontSize: 11,
            color: 'rgba(230,226,214,0.35)',
            letterSpacing: 4,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          by HexAstral
        </p>
      </div>
    </main>
  )
}
