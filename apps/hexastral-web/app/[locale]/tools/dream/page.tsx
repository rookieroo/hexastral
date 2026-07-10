import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ locale: string }>
}

/** DreamOracle is not in the launch wave — route retired from public index. */
export default async function DreamTeaserToolPage({ params }: Props) {
  const { locale } = await params
  redirect(locale === 'en' ? '/tools' : `/${locale}/tools`)
}
