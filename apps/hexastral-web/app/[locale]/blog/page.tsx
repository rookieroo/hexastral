import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { BLOG_POSTS } from '@/lib/content/blog-posts'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'HexAstral Blog — Eastern metaphysics, plain language',
    description:
      'Explainers on Zi Wei Dou Shu, Ba Zi, I Ching, dream culture, feng shui, and relationship synastry — with source terms cited.',
    alternates: {
      canonical:
        locale === 'en' ? 'https://hexastral.com/blog' : `https://hexastral.com/${locale}/blog`,
    },
  }
}

export default async function BlogIndexPage() {
  const t = await getTranslations('growth')

  return (
    <>
      <h1 style={{ marginTop: 0, fontWeight: 400 }}>{t('blogTitle')}</h1>
      <p style={{ color: 'var(--color-ivory-dim)', marginBottom: '2rem' }}>{t('blogSubtitle')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            prefetch={false}
            style={{
              display: 'block',
              padding: '1rem 1.1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              textDecoration: 'none',
              color: 'inherit',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)' }}>{post.date}</span>
            <h2
              style={{
                margin: '0.35rem 0',
                fontWeight: 500,
                fontSize: '1.12rem',
                color: 'var(--color-ivory)',
              }}
            >
              {post.title}
            </h2>
            <p style={{ margin: 0, color: 'var(--color-ivory-dim)', fontSize: '0.88rem' }}>
              {post.description}
            </p>
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.55rem',
                color: 'var(--color-gold)',
                fontSize: '0.82rem',
              }}
            >
              {t('readArticle')} →
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
