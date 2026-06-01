/**
 * /[locale]/numerology — Numerology product landing page (Phase D.3).
 *
 * Mirrors the Yuán landing pattern (`apps/hexastral-web/app/[locale]/yuan/page.tsx`)
 * with three goals:
 *   1. Explain what Numerology is in ≤ 1 scroll
 *   2. CTA "Calculate your numbers" → /[locale]/numerology/calculate (free demo)
 *   3. SEO: capture "numerology calculator", "life path number"
 */

import type { Metadata } from 'next'
import Link from 'next/link'

interface NumerologyLandingPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: NumerologyLandingPageProps): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> = {
    en: 'Numerology — Life-Path & Expression Numbers · HexAstral',
    zh: '数字命理 · HexAstral',
    tw: '數字命理 · HexAstral',
    ja: '数秘術 · HexAstral',
  }
  const descriptions: Record<string, string> = {
    en: 'See your Life-Path, Birthday, Expression, Soul-Urge and Personal-Year numbers in 30 seconds. Free Pythagorean numerology calculator from HexAstral.',
    zh: '30 秒算出你的生命路径数、生日数、表达数、灵魂数与流年数。HexAstral 出品的免费毕达哥拉斯数字命理工具。',
    tw: '30 秒算出你的生命路徑數、生日數、表達數、靈魂數與流年數。HexAstral 出品的免費畢達哥拉斯數字命理工具。',
    ja: '30秒で算出するライフパス・誕生数・表現数・魂の数。HexAstralの無料数秘術計算ツール。',
  }
  const title = titles[locale] ?? titles.en
  const description = descriptions[locale] ?? descriptions.en
  return {
    title,
    description,
    openGraph: { title, description, siteName: 'HexAstral' },
  }
}

const COPY: Record<string, { hero: string; sub: string; body: string; cta: string; app: string }> =
  {
    en: {
      hero: 'The numbers behind your name',
      sub: 'and your birth date',
      body: 'Pythagorean numerology distills your full name and date of birth into six numbers — Life-Path, Birthday, Expression, Soul-Urge, Personality, and Personal-Year. The math is deterministic; the meaning is yours to read.',
      cta: 'Calculate your numbers',
      app: 'Get Numerology on iOS',
    },
    zh: {
      hero: '你姓名背后的数字',
      sub: '与你的出生日期',
      body: '毕达哥拉斯数字命理把你的全名与出生日期凝缩成六个数：生命路径数、生日数、表达数、灵魂数、人格数与流年数。数字是确定的；意义由你解读。',
      cta: '算出你的数字',
      app: 'iOS 下载 Numerology',
    },
    tw: {
      hero: '你姓名背後的數字',
      sub: '與你的出生日期',
      body: '畢達哥拉斯數字命理把你的全名與出生日期凝縮成六個數：生命路徑數、生日數、表達數、靈魂數、人格數與流年數。',
      cta: '算出你的數字',
      app: 'iOS 下載 Numerology',
    },
    ja: {
      hero: '名前の奥にある数字',
      sub: '誕生日とともに',
      body: 'ピタゴラス数秘術はフルネームと生年月日を6つの数 — ライフパス・誕生数・表現数・魂の数・人格数・パーソナルイヤー — に凝縮します。',
      cta: '数字を算出する',
      app: 'iOSでNumerology',
    },
  }

export default async function NumerologyLandingPage({ params }: NumerologyLandingPageProps) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        color: '#18181B',
        paddingTop: '120px',
        paddingBottom: '120px',
        paddingLeft: '28px',
        paddingRight: '28px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        {/* Hero numeric grid mark */}
        <div
          style={{
            width: 144,
            height: 144,
            margin: '0 auto 48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
            alignContent: 'center',
            justifyItems: 'center',
            border: '0.5px solid rgba(24,24,27,0.18)',
            padding: 18,
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span
              key={n}
              style={{
                fontSize: 22,
                color: n === 5 ? '#18181B' : 'rgba(24,24,27,0.45)',
                fontWeight: n === 5 ? 500 : 300,
                letterSpacing: 0.4,
              }}
            >
              {n}
            </span>
          ))}
        </div>

        <h1
          style={{
            fontSize: 48,
            lineHeight: 1.2,
            fontWeight: 300,
            letterSpacing: -0.6,
            marginBottom: 8,
          }}
        >
          {copy.hero}
        </h1>
        <p
          style={{
            fontSize: 22,
            lineHeight: 1.4,
            color: 'rgba(24,24,27,0.65)',
            marginBottom: 56,
            fontWeight: 400,
          }}
        >
          {copy.sub}
        </p>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            color: '#18181B',
            marginBottom: 48,
            letterSpacing: 0.2,
            textAlign: 'left',
          }}
        >
          {copy.body}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <Link
            href={`/${locale === 'en' ? '' : `${locale}/`}numerology/calculate`}
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#18181B',
              letterSpacing: 0.5,
              borderBottom: '1px solid #18181B',
              paddingBottom: 10,
              paddingTop: 10,
              textDecoration: 'none',
            }}
          >
            {copy.cta}
          </Link>
          <a
            href='https://apps.apple.com/app/numerology/id000000000'
            style={{
              fontSize: 13,
              color: 'rgba(24,24,27,0.65)',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {copy.app}
          </a>
        </div>

        <p
          style={{
            marginTop: 96,
            fontSize: 11,
            color: 'rgba(24,24,27,0.35)',
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
