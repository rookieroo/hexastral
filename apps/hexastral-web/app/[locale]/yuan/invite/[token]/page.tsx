/**
 * /[locale]/yuan/invite/[token]
 *
 * The B-user entry point. A invited B by email; B clicks the link and lands
 * here. Flow:
 *
 *   1. Resolve the token → server-side fetch /api/bonds/invitations/:token
 *      to get the inviter's name + relationship type for the page header
 *      and OpenGraph tags (so the link unfurls nicely in iMessage, etc.)
 *   2. Client component renders: Turnstile gate → BirthInfoForm
 *   3. On submit → POST /api/bonds/invitations/:token/accept
 *   4. On success → redirect to /[locale]/yuan/invite/[token]/teaser
 *      which shows a basic compatibility preview + "Get full report in app"
 *
 * SEO: high — this is what users land on from a personal share. Good OG image
 * + inviter-personalized title increases first-tap rate dramatically.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { KindredInviteClient } from './client'

interface PageProps {
  params: Promise<{ locale: string; token: string }>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

interface InvitationContext {
  invitationId: string
  inviterName: string
  inviterAvatarUrl: string | null
  relationshipLabel: string
  targetName: string
  message: string | null
  expiresAt: string
  archetypeName: string | null
  archetypeTagline: string | null
  archetypeCategory: string | null
}

async function resolveInvitation(token: string): Promise<InvitationContext | null> {
  try {
    const res = await fetch(`${API_URL}/api/bonds/invite/${encodeURIComponent(token)}/info`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: InvitationContext }
    return json.data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token, locale } = await params
  const ctx = await resolveInvitation(token)
  if (!ctx) return { title: 'Yuel' }

  const titles: Record<string, (name: string) => string> & { en: (name: string) => string } = {
    en: (n) => `${n} invited you · Yuel`,
    zh: (n) => `${n} 邀你看看 · Yuel`,
    tw: (n) => `${n} 邀你看看 · Yuel`,
    ja: (n) => `${n} さんからの招待 · 縁`,
  }
  const titleFn = titles[locale] ?? titles.en
  const title = titleFn(ctx.inviterName)

  const descriptions: Record<string, string> & { en: string } = {
    en: 'Discover the resonance between you. Free preview, no signup.',
    zh: '看看你们之间的共鸣。免费预览，无需注册。',
    tw: '看看你們之間的共鳴。免費預覽，無需註冊。',
    ja: '二人の共鳴を見てみよう。無料プレビュー、登録不要。',
  }
  const description = descriptions[locale] ?? descriptions.en

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'HexAstral',
      images: [{ url: '/yuan-og.png', width: 1200, height: 630 }],
    },
  }
}

export default async function KindredInvitePage({ params }: PageProps) {
  const { token, locale } = await params
  const ctx = await resolveInvitation(token)
  if (!ctx) notFound()

  return (
    <KindredInviteClient
      token={token}
      locale={locale}
      inviterName={ctx.inviterName}
      relationshipLabel={ctx.relationshipLabel}
      targetName={ctx.targetName}
      note={ctx.message ?? undefined}
    />
  )
}
