/**
 * /[locale]/face-oracle/try — Face Oracle "what we read" teaser (Phase D.4).
 *
 * Web has no camera-secure capture pipeline that matches the iOS on-device
 * extraction guarantee, so the web "try" surface is informational only:
 * shows the trait map + sample reading + DDL handoff to the iOS app where
 * the actual photo flow lives.
 */

import type { Metadata } from 'next'
import Link from 'next/link'

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> = {
    en: 'How Face Oracle reads · HexAstral',
    zh: '面相录如何解读 · HexAstral',
  }
  return { title: titles[locale] ?? titles.en }
}

const COPY: Record<
  string,
  {
    title: string
    intro: string
    traitsTitle: string
    traits: { name: string; body: string }[]
    sampleTitle: string
    sample: string
    appCta: string
  }
> = {
  en: {
    title: 'What Face Oracle reads',
    intro:
      'Five regions, eleven micro-traits, one composite reading. The math is mian xiang; the eye for nuance is yours.',
    traitsTitle: 'Traits',
    traits: [
      {
        name: 'Brow',
        body: 'Brow shape and density signal early-life energy and self-direction.',
      },
      { name: 'Eye', body: 'Eye spacing and iris exposure speak to receptivity and inner pacing.' },
      { name: 'Nose', body: 'Nose bridge and nostril shape correlate with mid-life vitality.' },
      { name: 'Mouth', body: 'Mouth corners and lip thickness map to expressive warmth.' },
      { name: 'Jaw', body: 'Jaw breadth and chin point speak to late-life ground.' },
    ],
    sampleTitle: 'Sample reading',
    sample:
      'Steady brow, soft eye spacing, balanced jaw — a profile that reads as patient and approachable, with reserves you don’t spend on small things.',
    appCta: 'Open Face Oracle on iOS',
  },
  zh: {
    title: '面相录解读什么',
    intro: '五个区域，十一项微观特征，一份综合解读。原理来自古法面相，分寸由你掌握。',
    traitsTitle: '特征',
    traits: [
      { name: '眉', body: '眉形与浓淡映照早年精气与自主方向。' },
      { name: '眼', body: '眼距与虹膜外露程度对应接收力与内在节奏。' },
      { name: '鼻', body: '鼻梁与鼻翼形态关联中年元气。' },
      { name: '口', body: '嘴角与唇厚反映表达的温度。' },
      { name: '颌', body: '颌部宽度与下巴形态指向晚年根基。' },
    ],
    sampleTitle: '示例解读',
    sample:
      '稳眉、眼距柔和、颌部均衡——读起来是耐心、易亲近的轮廓，有不轻易在小事上消耗的余裕。',
    appCta: 'iOS 打开 Face Oracle',
  },
}

export default async function FaceOracleTryPage({ params }: Props) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        color: '#18181B',
        padding: '64px 20px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: -0.4, marginBottom: 12 }}>
          {copy.title}
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(24,24,27,0.7)', marginBottom: 40 }}>
          {copy.intro}
        </p>

        <h2
          style={{
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: 'rgba(24,24,27,0.55)',
            marginBottom: 12,
          }}
        >
          {copy.traitsTitle}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
          {copy.traits.map((tr) => (
            <div
              key={tr.name}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                padding: 16,
                border: '0.5px solid rgba(24,24,27,0.18)',
              }}
            >
              <div style={{ width: 56, fontSize: 22, fontWeight: 500 }}>{tr.name}</div>
              <p style={{ flex: 1, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{tr.body}</p>
            </div>
          ))}
        </div>

        <h2
          style={{
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: 'rgba(24,24,27,0.55)',
            marginBottom: 12,
          }}
        >
          {copy.sampleTitle}
        </h2>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            padding: 20,
            border: '0.5px solid rgba(24,24,27,0.18)',
            marginBottom: 48,
            fontStyle: 'italic',
          }}
        >
          {copy.sample}
        </p>

        <div style={{ textAlign: 'center' }}>
          <a
            href='https://apps.apple.com/app/face-oracle/id000000000'
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 1.4,
              color: '#18181B',
              borderBottom: '1px solid #18181B',
              padding: '8px 0',
              textDecoration: 'none',
            }}
          >
            {copy.appCta}
          </a>
        </div>

        <div style={{ marginTop: 56, textAlign: 'center' }}>
          <Link
            href={`/${locale === 'en' ? '' : `${locale}/`}face-oracle`}
            style={{
              fontSize: 12,
              color: 'rgba(24,24,27,0.55)',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            ← back
          </Link>
        </div>
      </div>
    </main>
  )
}
