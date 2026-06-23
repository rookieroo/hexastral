import { redirect } from 'next/navigation'

/**
 * /[locale]/yuan/invite/[token] — retired in favor of resonate/[token], the
 * single canonical invite landing (install-first, identity-clear, relationship
 * never shown — it would leak the inviter's intent). The web-accept birth form
 * lived here; we redirect old links instead of 404ing. Same token namespace
 * (both resolve /api/bonds/invite/:token).
 */
interface PageProps {
  params: Promise<{ locale: string; token: string }>
}

export default async function KindredInvitePage({ params }: PageProps) {
  const { locale, token } = await params
  redirect(`/${locale}/resonate/${token}`)
}
