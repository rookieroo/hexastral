import type { Metadata } from 'next'
import { DayMasterCalculator } from '@/app/[locale]/tools/day-master/DayMasterCalculator'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Day Master calculator (Ba Zi 八字 lite) — HexAstral tools',
    description:
      'See your approximate Day Master heavenly stem plus four pillar preview — educational snapshot before opening HexAstral on iOS.',
    alternates: {
      canonical:
        locale === 'en'
          ? 'https://hexastral.com/tools/day-master'
          : `https://hexastral.com/${locale}/tools/day-master`,
    },
  }
}

export default function DayMasterToolPage() {
  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, marginTop: 0 }}>
        Day Master preview{' '}
        <span style={{ color: 'var(--color-ivory-dim)', fontSize: '1rem' }}>八字</span>
      </h1>
      <p style={{ color: 'var(--color-ivory-dim)', lineHeight: 1.65 }}>
        The <strong>Day Master</strong> is the Heavenly Stem sitting on your day pillar (
        <em> Ri Kindred / 日元 </em>). It anchors Element psychology in Ba Zi — like a sun sign
        backbone, tuned for Five Elements rather than planets.
      </p>
      <DayMasterCalculator />
    </>
  )
}
