import { redirect } from 'next/navigation'

/**
 * /[locale]/yuan/invite/[token]/teaser — retired with the web-accept form.
 * resonate/[token] is the canonical invite landing now; redirect stray links.
 */
interface PageProps {
  params: Promise<{ locale: string; token: string }>
}

export default async function KindredInviteTeaserPage({ params }: PageProps) {
  const { locale, token } = await params
  redirect(`/${locale}/resonate/${token}`)
}
