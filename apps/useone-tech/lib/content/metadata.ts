import type { Metadata } from 'next'
import { siteConfig } from '../config/site-config'

interface MetadataOptions {
  title?:
    | string
    | {
        template?: string
        default?: string
      }
  description?: string
  keywords?: string[]
  authors?: Array<{ name: string; url?: string }>
  icons?: {
    icon?: string | Array<{ url: string; sizes?: string; type?: string }>
    shortcut?: string
    apple?: string | Array<{ url: string; sizes?: string; type?: string }>
  }
  openGraph?: {
    title?: string
    description?: string
    url?: string
    images?: Array<{
      url: string
      width?: number
      height?: number
      alt?: string
    }>
    type?: 'website' | 'article'
  }
  twitter?: {
    card?: 'summary' | 'summary_large_image'
    title?: string
    description?: string
    images?: string[]
  }
  robots?: {
    index?: boolean
    follow?: boolean
  }
  alternates?: {
    canonical?: string
  }
}

/**
 * 创建 Next.js metadata 对象的辅助函数
 */
export function createMetadata(options: MetadataOptions): Metadata {
  const baseUrl = siteConfig.url

  const title =
    typeof options.title === 'object' && options.title !== null
      ? {
          template: options.title.template ?? `%s | ${siteConfig.name}`,
          default: options.title.default ?? siteConfig.name,
        }
      : options.title || siteConfig.name

  const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title,
    description: options.description || siteConfig.description,
    keywords: options.keywords || [
      'Notion',
      'Data Visualization',
      'Knowledge Base',
      'Shopify',
      'Digital Growth',
      'No-Code',
    ],
    authors: options.authors,
    creator: 'UseONE Tech',
    publisher: 'UseONE Tech',
    icons: options.icons || {
      icon: [
        { url: '/logo.png', sizes: '32x32', type: 'image/png' },
        { url: '/logo.png', sizes: '16x16', type: 'image/png' },
      ],
      shortcut: '/logo.png',
      apple: '/logo.png',
    },
    openGraph: {
      title: typeof options.title === 'string' ? options.title : siteConfig.name,
      description: options.description || siteConfig.description,
      url: options.openGraph?.url || baseUrl,
      images: options.openGraph?.images || [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
      type: options.openGraph?.type || 'website',
      siteName: siteConfig.name,
    },
    twitter: {
      card: options.twitter?.card || 'summary_large_image',
      title:
        options.twitter?.title ||
        (typeof options.title === 'string' ? options.title : siteConfig.name),
      description: options.twitter?.description || siteConfig.description,
      images: options.twitter?.images || [siteConfig.ogImage],
      creator: '@useonetech',
    },
    robots: options.robots || {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: options.alternates,
  }

  return metadata
}
