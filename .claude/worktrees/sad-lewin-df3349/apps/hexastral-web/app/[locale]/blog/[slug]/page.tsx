import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { DownloadCTA } from '@/components/DownloadCTA'
import { getAllBlogSlugs, getBlogPost } from '@/lib/content/blog-posts'
import { resolveAppStoreUrl } from '@/lib/growth/app-store-urls'
import { JsonLd } from '@/lib/json-ld'

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: 'HexAstral Blog' }
  return {
    title: `${post.title} · HexAstral`,
    description: post.description,
    alternates: {
      canonical:
        locale === 'en' ? `https://hexastral.com/blog/${slug}` : `https://hexastral.com/${locale}/blog/${slug}`,
    },
  }
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()
  const t = await getTranslations('growth')

  return (
    <article>
      <JsonLd
        json={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          datePublished: post.date,
          description: post.description,
          author: { '@type': 'Organization', name: 'HexAstral' },
          inLanguage: 'en-US',
        }}
      />
      <p style={{ fontSize: '0.76rem', letterSpacing: '0.16em', color: 'var(--color-gold)', marginBottom: '0.35rem' }}>
        {post.date}
      </p>
      <h1 style={{ fontWeight: 400, fontSize: '1.85rem', marginTop: 0 }}>{post.title}</h1>
      <p style={{ color: 'var(--color-ivory-dim)' }}>{post.description}</p>
      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1.75rem 0' }} />
      {post.body.split('\n\n').map((para, idx) => (
        <p key={idx} style={{ lineHeight: 1.76, whiteSpace: 'pre-wrap' }}>
          {para.trim()}
        </p>
      ))}
      <div style={{ marginTop: '2.5rem' }}>
        <DownloadCTA
          headline='Shipped first in HexAstral & satellites'
          appStoreUrl={resolveAppStoreUrl(post.appCta)}
          targetApp={post.appCta}
        />
      </div>
      <p style={{ marginTop: '1.5rem' }}>
        <Link href='/blog' style={{ color: 'var(--color-gold)', fontSize: '0.88rem', textDecoration: 'none' }}>
          ← {t('backToBlog')}
        </Link>
      </p>
    </article>
  )
}
