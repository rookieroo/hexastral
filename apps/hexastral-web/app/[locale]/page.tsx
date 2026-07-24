import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { AdPixels } from '@/components/ads/AdPixels'
import { HexastralHome } from '@/components/brand/HexastralHome'
import { KanyuHome } from '@/components/brand/KanyuHome'
import { SyelHome } from '@/components/brand/SyelHome'
import { YaulHome } from '@/components/brand/YaulHome'
import { YuelHome } from '@/components/brand/YuelHome'
import { YuunHome } from '@/components/brand/YuunHome'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ brand?: string }>
}

type Brand = 'yuel' | 'yuun' | 'yaul' | 'kanyu' | 'syel' | 'hexastral'

/** Resolve the brand from the request host — one worker serves brand homes. A
 *  `?brand=` query override makes local preview / QA trivial (no host spoofing). */
async function resolveBrand(searchParams?: PageProps['searchParams']): Promise<Brand> {
  const o = (searchParams ? await searchParams : undefined)?.brand
  if (
    o === 'yuel' ||
    o === 'yuun' ||
    o === 'yaul' ||
    o === 'kanyu' ||
    o === 'syel' ||
    o === 'hexastral'
  ) {
    return o
  }
  const host = (await headers()).get('host') ?? ''
  if (host.startsWith('yuel.')) return 'yuel'
  if (host.startsWith('yuun.')) return 'yuun'
  if (host.startsWith('yaul.')) return 'yaul'
  if (host.startsWith('kanyu.')) return 'kanyu'
  if (host.startsWith('syel.')) return 'syel'
  return 'hexastral'
}

/** Request origin (proto + host) for metadataBase + JSON-LD URLs. */
async function requestOrigin(): Promise<string> {
  const h = await headers()
  return `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host') ?? 'hexastral.com'}`
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const brand = await resolveBrand(searchParams)
  const metadataBase = new URL(await requestOrigin())

  if (brand === 'yuel') {
    return {
      metadataBase,
      title: { absolute: 'Yuel — your reading, and the people you’re bound to' },
      description:
        'A personal 命書 grounded in BaZi (八字) and ZiWei (紫微), plus two-chart synastry for the people who matter. Educational, not predictive. From UseONE, LLC.',
      icons: { icon: '/brand/yuel.png' },
      openGraph: {
        title: 'Yuel · 缘',
        description: 'Your reading, and the people you’re bound to.',
        siteName: 'Yuel',
      },
      alternates: { canonical: '/' },
    }
  }
  if (brand === 'yuun') {
    return {
      metadataBase,
      title: { absolute: 'Yuun — the Chinese almanac, every day' },
      description:
        'A daily 黄历: 宜忌, GanZhi (干支), the lunar calendar and your annual cycle, grounded in classical Chinese cosmology. Educational, not predictive. From UseONE, LLC.',
      icons: { icon: '/brand/yuun.png' },
      openGraph: {
        title: 'Yuun · 运',
        description: 'The Chinese almanac, every day.',
        siteName: 'Yuun',
      },
      alternates: { canonical: '/' },
    }
  }
  if (brand === 'yaul') {
    return {
      metadataBase,
      title: { absolute: 'Yaul — I Ching Liu Yao study journal' },
      description:
        'Three-coin casting with 3D physics, classical Liu Yao (六爻) line rules, and cited AI commentary. Educational, not predictive. From UseONE, LLC.',
      icons: { icon: '/brand/yaul.png' },
      openGraph: {
        title: 'Yaul · 爻',
        description: 'Three coins. Six lines. One question.',
        siteName: 'Yaul',
      },
      alternates: { canonical: '/' },
    }
  }
  if (brand === 'kanyu') {
    return {
      metadataBase,
      title: { absolute: 'Kanyu — classical feng-shui site analysis' },
      description:
        'Pin a site, calibrate compass bearing, optionally upload a floor plan, and receive a structured 堪舆 report with cited AI commentary. Educational, not predictive. From UseONE, LLC.',
      openGraph: {
        title: 'Kanyu · 堪舆',
        description: 'Read built environments through classical site theory.',
        siteName: 'Kanyu',
      },
      alternates: { canonical: '/' },
    }
  }
  if (brand === 'syel') {
    return {
      metadataBase,
      title: { absolute: 'Syel — face, palms, and natal form-qi' },
      description:
        'Three photos (left palm, right palm, face) read against BaZi — curated loci and a five-chapter brief. Educational, not predictive. From UseONE, LLC.',
      robots: { index: false, follow: false },
      icons: { icon: '/brand/syel.png' },
      openGraph: {
        title: 'Syel · 形气',
        description: 'Face, palms, and natal chart — one form-qi reading.',
        siteName: 'Syel',
      },
      alternates: { canonical: '/' },
    }
  }
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    metadataBase,
    title: { absolute: t('title') },
    description: t('description'),
    alternates: { canonical: '/' },
  }
}

export default async function LandingPage({ searchParams }: PageProps) {
  const brand = await resolveBrand(searchParams)
  const locale = await getLocale()
  const home =
    brand === 'yuel' ? (
      <YuelHome locale={locale} />
    ) : brand === 'yuun' ? (
      <YuunHome locale={locale} />
    ) : brand === 'yaul' ? (
      <YaulHome locale={locale} />
    ) : brand === 'kanyu' ? (
      <KanyuHome locale={locale} />
    ) : brand === 'syel' ? (
      <SyelHome locale={locale} />
    ) : (
      <HexastralHome locale={locale} origin={await requestOrigin()} />
    )

  // Brand subdomain homes are acquisition surfaces — load pixels when env configured.
  if (brand !== 'hexastral') {
    return (
      <>
        <AdPixels />
        {home}
      </>
    )
  }
  return home
}
