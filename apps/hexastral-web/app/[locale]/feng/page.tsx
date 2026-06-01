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
    en: 'Fēng: Feng-Shui Site Reading',
    zh: '風 · 风水现场解读',
    tw: '風 · 風水現場解讀',
    ja: '風水：場の読み取り',
  }
  const descriptions: Record<string, string> & { en: string } = {
    en: 'Audit a home or office from its satellite view. External landforms, 八宅 fit, 玄空飞星 — by HexAstral.',
    zh: '从卫星图开始审视一处宅地：外巒頭、八宅、玄空飞星，HexAstral 出品。',
    tw: '從衛星圖開始審視一處宅地：外巒頭、八宅、玄空飛星，HexAstral 出品。',
    ja: '衛星画像から自宅やオフィスを鑑定：外巒頭、八宅、玄空飛星。HexAstralによる風水アプリ。',
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
    title: 'Read a place,',
    subtitle: 'before you settle into it',
    body: 'Fēng analyzes a home or workplace from its satellite view + your birth chart. Two complementary lenses — 外巒頭 (the land outside) and 八宅 / 玄空飞星 (the chart inside) — produce a six-chapter site reading you can save, share, and refresh every solar year.',
  }
  const heroDefaults: Record<string, HeroCopy> = {
    en: heroEn,
    zh: {
      title: '在你住下来之前',
      subtitle: '先读懂一处宅地',
      body: '風 从卫星图 + 你的生辰盘审视一处宅地。两个互补的镜头 — 外巒頭（外部地势）与八宅 / 玄空飞星（内部命理）— 产出一份六章节的现场解读，可保存、分享、每年立春自动刷新。',
    },
    tw: {
      title: '在你住下之前',
      subtitle: '先讀懂一處宅地',
      body: '風 從衛星圖 + 你的生辰盤審視一處宅地。兩個互補的鏡頭 — 外巒頭（外部地勢）與八宅 / 玄空飛星（內部命理）— 產出一份六章節的現場解讀，可保存、分享、每年立春自動刷新。',
    },
    ja: {
      title: '住む前に、',
      subtitle: 'その場を読む',
      body: '風水アプリ Fēng は衛星画像とあなたの命盤から、自宅や職場を鑑定します。外巒頭（外部の地勢）と八宅 / 玄空飛星（内部の命理）— 二つの視点で六章の鑑定書を生成。保存・共有でき、毎年立春に自動更新されます。',
    },
  }

  const fallback: HeroCopy = heroDefaults[locale] ?? heroEn

  const ctas = {
    en: { begin: 'Start a site reading  →', store: 'Get Fēng on iOS' },
    zh: { begin: '开始一份现场解读  →', store: 'iOS 下载' },
    tw: { begin: '開始一份現場解讀  →', store: 'iOS 下載' },
    ja: { begin: '鑑定を始める  →', store: 'iOSで入手' },
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
            marginTop: 96,
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
