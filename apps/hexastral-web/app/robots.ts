import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { APP_LAUNCH, appIsPublicSurface, brandIdFromHost } from '@/lib/growth/launch-status'

/** Host-aware so each brand host (yuel/yuun/hexastral) points crawlers at its
 *  own sitemap — one worker serves all three. Hidden launch-wave hosts disallow. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers()
  const host = h.get('host') ?? 'hexastral.com'
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${host}`
  const brandId = brandIdFromHost(host)

  if (brandId && !appIsPublicSurface(brandId)) {
    return {
      rules: { userAgent: '*', disallow: '/' },
      host: origin,
    }
  }

  if (brandId && !APP_LAUNCH[brandId].brandHostIndexable) {
    return {
      rules: { userAgent: '*', disallow: '/' },
      host: origin,
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
