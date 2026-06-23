import { redirect } from 'next/navigation'

/**
 * /[locale]/yuan/invite/[token]/teaser — retired with the web-accept form.
 * /resonate/[token] is the canonical invite landing now; redirect stray links to the
 * fixed, locale-agnostic URL (the landing localises by the opening device).
 */
interface PageProps {
  params: Promise<{ locale: string; token: string }>
}

export default async function KindredInviteTeaserPage({ params }: PageProps) {
  const { token } = await params
  redirect(`/resonate/${token}`)
}
