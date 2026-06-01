/**
 * /[locale]/coin-cast/try — free in-browser CoinCast demo (Phase D.4).
 *
 * Single question → randomly cast 6 lines → routes to AI interpretation via
 * `POST /api/portfolio` with `target: coincast`. No signin needed; the
 * portfolio route handles anonymous flows with an in-flight rate-limit.
 */

import type { Metadata } from 'next'
import { CoinCastTryClient } from './client'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> & { en: string } = {
    en: 'Try CoinCast · HexAstral',
    zh: 'CoinCast 体验 · HexAstral',
  }
  return { title: titles[locale] ?? titles.en }
}

type CoinCastTryCopyRow = {
  title: string
  questionLabel: string
  questionPlaceholder: string
  submit: string
  busy: string
  err: string
  appCta: string
}

const COPY: Record<string, CoinCastTryCopyRow> & { en: CoinCastTryCopyRow } = {
  en: {
    title: 'Cast a hexagram',
    questionLabel: 'Your question',
    questionPlaceholder: 'What do I most need to see this season?',
    submit: 'Cast',
    busy: 'Casting…',
    err: 'Something went wrong. Please try again.',
    appCta: 'Continue in CoinCast on iOS',
  },
  zh: {
    title: '起一卦',
    questionLabel: '你的问题',
    questionPlaceholder: '这个阶段，我最需要看见什么？',
    submit: '起卦',
    busy: '正在起卦…',
    err: '出错了，请重试。',
    appCta: 'iOS 下载 CoinCast 继续',
  },
}

export default async function CoinCastTryPage({ params }: Props) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en
  return <CoinCastTryClient copy={copy} locale={locale} />
}

export type CoinCastTryCopy = (typeof COPY)['en']
