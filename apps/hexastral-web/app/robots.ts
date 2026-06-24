import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

/** Host-aware so each brand host (yuel/yuun/hexastral) points crawlers at its
 *  own sitemap — one worker serves all three. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host') ?? 'hexastral.com'}`
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
