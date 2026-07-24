import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

initOpenNextCloudflareForDev()

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@zhop/astro-core', '@zhop/hexastral-tokens'],
  pageExtensions: ['ts', 'tsx'],
  experimental: {
    useCache: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  async redirects() {
    // Legacy synastry paths → unified /yuan/* product surface.
    // See docs/decisions/0001-yuan-naming.md.
    return [
      // /hehun/[token]  → /yuan/invite/[token]
      {
        source: '/hehun/:token',
        destination: '/yuan/invite/:token',
        permanent: true,
      },
      // /invite/[bondId] → /yuan/invite/[bondId]
      {
        source: '/invite/:bondId',
        destination: '/yuan/invite/:bondId',
        permanent: true,
      },
      // Legacy locale-prefixed Yuel invite links → the fixed, locale-agnostic URL.
      // `/resonate/[token]` is now a non-localized route that localises by the OPENING
      // device (Accept-Language), so strip any `/zh|tw|ja/` prefix old links carried.
      // (This rule previously sent them to /yuan/invite — the wrong product — which is
      // why every non-en Yuel invite "wouldn't open".)
      {
        source: '/:locale(zh|tw|ja)/resonate/:token',
        destination: '/resonate/:token',
        permanent: true,
      },
      // /[locale]/invite → /[locale]/yuan
      {
        source: '/:locale(zh|tw|ja)/invite',
        destination: '/:locale/yuan',
        permanent: true,
      },
      // /feng-shui (no slug) → /feng (new main Fēng landing).
      // /feng-shui/[slug] kept as SEO seed pages — they have unique long-form
      // content and inbound links worth preserving.
      {
        source: '/feng-shui',
        destination: '/feng',
        permanent: true,
      },
      {
        source: '/:locale(zh|tw|ja)/feng-shui',
        destination: '/:locale/feng',
        permanent: true,
      },
      // Brand-aligned /lp canonicals (engineering slugs keep AASA dual-list + 301).
      {
        source: '/lp/yuan',
        destination: '/lp/yuel',
        permanent: true,
      },
      {
        source: '/lp/yuan/:path*',
        destination: '/lp/yuel/:path*',
        permanent: true,
      },
      {
        source: '/:locale(zh|tw|ja)/lp/yuan',
        destination: '/:locale/lp/yuel',
        permanent: true,
      },
      {
        source: '/:locale(zh|tw|ja)/lp/yuan/:path*',
        destination: '/:locale/lp/yuel/:path*',
        permanent: true,
      },
      {
        source: '/lp/feng',
        destination: '/lp/kanyu',
        permanent: true,
      },
      {
        source: '/lp/feng/:path*',
        destination: '/lp/kanyu/:path*',
        permanent: true,
      },
      {
        source: '/:locale(zh|tw|ja)/lp/feng',
        destination: '/:locale/lp/kanyu',
        permanent: true,
      },
      {
        source: '/:locale(zh|tw|ja)/lp/feng/:path*',
        destination: '/:locale/lp/kanyu/:path*',
        permanent: true,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
