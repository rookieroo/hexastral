import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
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

type Locale = (typeof locales)[number]

function absoluteUrl(base: string, locale: Locale, path: string): string {
  if (path === '/' || path === '') {
    return locale === 'en' ? base : `${base}/${locale}`
  }
  if (locale === 'en') return `${base}${path}`
  return `${base}/${locale}${path}`
}

/** A brand subdomain's focused sitemap: home + its privacy appendix + the shared terms. */
function brandSitemap(base: string, privacyPath: string): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []
  for (const locale of locales) {
    entries.push({
      url: absoluteUrl(base, locale, '/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    })
    entries.push({
      url: absoluteUrl(base, locale, privacyPath),
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    })
    entries.push({
      url: absoluteUrl(base, locale, '/terms'),
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    })
  }
  return entries
}

/** Host-aware: yuel/yuun/yaul subdomains get a focused brand sitemap; hexastral.com
 *  gets the full content sitemap. One worker, four sitemaps by request host. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers()
  const host = h.get('host') ?? 'hexastral.com'
  const base = `${h.get('x-forwarded-proto') ?? 'https'}://${host}`
  if (host.startsWith('yuel.')) return brandSitemap(base, '/privacy/kindred')
  if (host.startsWith('yuun.')) return brandSitemap(base, '/privacy/auspice')
  if (host.startsWith('yaul.')) return brandSitemap(base, '/privacy/coincast')

  const blogSlugs = getAllBlogSlugs()
  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    entries.push({
      url: absoluteUrl(base, locale, '/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    })

    for (const p of TOOL_PATHS) {
      entries.push({
        url: absoluteUrl(base, locale, p),
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.85,
      })
    }
    for (const p of CONTENT_BASE_PATHS) {
      entries.push({
        url: absoluteUrl(base, locale, p),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: p === '/blog' ? 0.8 : 0.75,
      })
    }
    for (const slug of blogSlugs) {
      entries.push({
        url: absoluteUrl(base, locale, `/blog/${slug}`),
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.65,
      })
    }
    for (const p of LP_PATHS) {
      entries.push({
        url: absoluteUrl(base, locale, p),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
    for (let n = 1; n <= 64; n++) {
      entries.push({
        url: absoluteUrl(base, locale, `/hexagram/${n}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.55,
      })
    }
    for (const slug of DAY_MASTER_SLUGS) {
      entries.push({
        url: absoluteUrl(base, locale, `/day-master/${slug}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.58,
      })
    }
    for (const slug of ZODIAC_SLUGS) {
      entries.push({
        url: absoluteUrl(base, locale, `/sheng-xiao/${slug}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.58,
      })
    }
    for (const slug of PALACE_SLUGS) {
      entries.push({
        url: absoluteUrl(base, locale, `/palace/${slug}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.58,
      })
    }
    for (const slug of FENG_SHUI_SLUGS) {
      entries.push({
        url: absoluteUrl(base, locale, `/feng-shui/${slug}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.55,
      })
    }
  }

  return entries
}
