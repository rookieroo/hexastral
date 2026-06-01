import type { MetadataRoute } from 'next'
import { locales } from '@/i18n/routing'
import { getAllBlogSlugs } from '@/lib/content/blog-posts'
import {
  CONTENT_BASE_PATHS,
  DAY_MASTER_SLUGS,
  FENG_SHUI_SLUGS,
  LP_PATHS,
  PALACE_SLUGS,
  TOOL_PATHS,
  ZODIAC_SLUGS,
} from '@/lib/growth/seo-data'

const BASE = 'https://hexastral.com'

type Locale = (typeof locales)[number]

function absoluteUrl(locale: Locale, path: string): string {
  if (path === '/' || path === '') {
    return locale === 'en' ? BASE : `${BASE}/${locale}`
  }
  if (locale === 'en') return `${BASE}${path}`
  return `${BASE}/${locale}${path}`
}

export default function sitemap(): MetadataRoute.Sitemap {
  const blogSlugs = getAllBlogSlugs()
  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    entries.push({
      url: absoluteUrl(locale, '/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    })

    for (const p of TOOL_PATHS) {
      entries.push({
        url: absoluteUrl(locale, p),
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.85,
      })
    }

    for (const p of CONTENT_BASE_PATHS) {
      entries.push({
        url: absoluteUrl(locale, p),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: p === '/blog' ? 0.8 : 0.75,
      })
    }

    for (const slug of blogSlugs) {
      entries.push({
        url: absoluteUrl(locale, `/blog/${slug}`),
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.65,
      })
    }

    for (const p of LP_PATHS) {
      entries.push({
        url: absoluteUrl(locale, p),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    for (let n = 1; n <= 64; n++) {
      entries.push({
        url: absoluteUrl(locale, `/hexagram/${n}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.55,
      })
    }

    for (const slug of DAY_MASTER_SLUGS) {
      entries.push({
        url: absoluteUrl(locale, `/day-master/${slug}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.58,
      })
    }

    for (const slug of ZODIAC_SLUGS) {
      entries.push({
        url: absoluteUrl(locale, `/zodiac/${slug}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.58,
      })
    }

    for (const slug of PALACE_SLUGS) {
      entries.push({
        url: absoluteUrl(locale, `/palace/${slug}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.58,
      })
    }

    for (const slug of FENG_SHUI_SLUGS) {
      entries.push({
        url: absoluteUrl(locale, `/feng-shui/${slug}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.55,
      })
    }
  }

  return entries
}
