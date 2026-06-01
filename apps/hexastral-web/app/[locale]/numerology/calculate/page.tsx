/**
 * /[locale]/numerology/calculate — free in-browser numerology calculator
 * (Phase D.3).
 *
 * No signup, no IAP. Submits to `POST /api/numerology/compute` and renders
 * the six numbers inline. The component itself is a Client Component because
 * the form state needs interactivity; the locale label data ships server-side
 * for SEO + first-paint.
 */

import type { Metadata } from 'next'
import { CalculatorClient } from './client'

interface CalcPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CalcPageProps): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> & { en: string } = {
    en: 'Numerology Calculator · HexAstral',
    zh: '数字命理计算 · HexAstral',
    tw: '數字命理計算 · HexAstral',
    ja: '数秘術計算 · HexAstral',
  }
  return { title: titles[locale] ?? titles.en }
}

type CalcCopyRow = {
  title: string
  nameLabel: string
  nameHint: string
  birthLabel: string
  submit: string
  busy: string
  err: string
  resultTitle: string
  master: string
  rows: { key: string; label: string; sub: string }[]
}

const COPY: Record<string, CalcCopyRow> & { en: CalcCopyRow } = {
  en: {
    title: 'Calculate your numbers',
    nameLabel: 'Full name (as on your ID)',
    nameHint: 'Used for Expression / Soul-Urge / Personality numbers.',
    birthLabel: 'Date of birth',
    submit: 'Reveal numbers',
    busy: 'Computing…',
    err: 'Something went wrong. Please try again.',
    resultTitle: 'Your numbers',
    master: 'Master',
    rows: [
      { key: 'lifePath', label: 'Life-Path', sub: 'The shape of your journey' },
      { key: 'birthday', label: 'Birthday', sub: 'A gift you bring with you' },
      { key: 'expression', label: 'Expression', sub: 'How you naturally show up' },
      { key: 'soulUrge', label: 'Soul-Urge', sub: 'What you secretly want' },
      { key: 'personality', label: 'Personality', sub: 'How others first see you' },
      { key: 'personalYear', label: 'Personal Year', sub: 'The flavor of this calendar year' },
    ],
  },
  zh: {
    title: '算出你的数字',
    nameLabel: '全名（与证件一致）',
    nameHint: '用于表达数 / 灵魂数 / 人格数。',
    birthLabel: '出生日期',
    submit: '揭示数字',
    busy: '计算中…',
    err: '出错了，请重试。',
    resultTitle: '你的数字',
    master: '大师数',
    rows: [
      { key: 'lifePath', label: '生命路径数', sub: '你旅程的形状' },
      { key: 'birthday', label: '生日数', sub: '你与生俱来的礼物' },
      { key: 'expression', label: '表达数', sub: '你自然展现的样子' },
      { key: 'soulUrge', label: '灵魂数', sub: '你内心真正渴望' },
      { key: 'personality', label: '人格数', sub: '别人初次看到的你' },
      { key: 'personalYear', label: '流年数', sub: '今年对你的基调' },
    ],
  },
}

export default async function CalcPage({ params }: CalcPageProps) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en
  return <CalculatorClient copy={copy} />
}

export type CalcCopy = (typeof COPY)['en']
