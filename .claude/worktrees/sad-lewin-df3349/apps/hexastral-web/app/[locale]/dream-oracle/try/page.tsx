/**
 * /[locale]/dream-oracle/try — free in-browser Dream Oracle demo (Phase D.4).
 *
 * Single dream textarea → AI interpretation via `POST /api/portfolio` with
 * `target: dreamoracle`. No signin needed.
 */

import type { Metadata } from 'next'
import { DreamTryClient } from './client'

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> = {
    en: 'Try Dream Oracle · HexAstral',
    zh: '梦谕 体验 · HexAstral',
  }
  return { title: titles[locale] ?? titles.en }
}

const COPY: Record<
  string,
  {
    title: string
    dreamLabel: string
    dreamPlaceholder: string
    submit: string
    busy: string
    err: string
    appCta: string
  }
> = {
  en: {
    title: 'Tell me your dream',
    dreamLabel: 'Last night, you dreamt…',
    dreamPlaceholder: 'I was walking through an old house, the rooms shifted as I moved…',
    submit: 'Read this dream',
    busy: 'Reading…',
    err: 'Something went wrong. Please try again.',
    appCta: 'Continue in Dream Oracle on iOS',
  },
  zh: {
    title: '说说你的梦',
    dreamLabel: '昨夜你梦见……',
    dreamPlaceholder: '我走进一座旧屋子，房间随着脚步在变换……',
    submit: '为我解梦',
    busy: '解读中…',
    err: '出错了，请重试。',
    appCta: 'iOS 下载梦谕继续',
  },
}

export default async function DreamTryPage({ params }: Props) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en
  return <DreamTryClient copy={copy} locale={locale} />
}

export type DreamTryCopy = (typeof COPY)['en']
