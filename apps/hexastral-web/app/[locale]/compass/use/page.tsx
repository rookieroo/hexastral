/**
 * /[locale]/compass/use — the browser compass tool.
 *
 * Server wrapper picks locale copy and delegates the live DeviceOrientation
 * loop to the client component. Mobile-first; on desktop the page shows a
 * "scan with your phone" QR + an explainer.
 */

import type { Metadata } from 'next'
import { CompassUseClient } from './client'

interface CompassUsePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CompassUsePageProps): Promise<Metadata> {
  const { locale } = await params
  const titles: Record<string, string> & { en: string } = {
    en: 'Compass · HexAstral',
    zh: '罗盘 · HexAstral',
    tw: '羅盤 · HexAstral',
    ja: 'コンパス · HexAstral',
  }
  return {
    title: titles[locale] ?? titles.en,
  }
}

export type CompassUseCopy = {
  heading: string
  mountain: string
  palace: string
  permissionPrompt: string
  permissionDenied: string
  desktopMsg: string
  appCta: string
  fengCta: string
  learnLink: string
}

const COPY: Record<string, CompassUseCopy> & { en: CompassUseCopy } = {
  en: {
    heading: 'Heading',
    mountain: '24-Mountain',
    palace: 'Trigram',
    permissionPrompt:
      'Tap "Allow" to read your phone\'s compass. Compass works entirely in your browser — no data leaves your device.',
    permissionDenied:
      'Without orientation access, the compass cannot read your phone heading. iOS Safari: enable in Settings → Safari → Motion & Orientation Access.',
    desktopMsg:
      "Compass needs a phone's magnetometer to read your heading. Open this page on your phone, or get the iOS app below.",
    appCta: 'Get Compass on iOS',
    fengCta: 'Use this bearing for a feng-shui audit →',
    learnLink: 'Why magnetic declination matters',
  },
  zh: {
    heading: '朝向',
    mountain: '二十四山',
    palace: '八卦',
    permissionPrompt: '点击"允许"读取手机罗盘。所有数据仅在浏览器内运算，不上传任何信息。',
    permissionDenied:
      '没有方向感应权限，无法读取朝向。iOS Safari：设置 → Safari → 动作和方向访问。',
    desktopMsg: '罗盘需要手机的磁力计才能工作。请用手机打开此页面，或下载下方 iOS App。',
    appCta: 'iOS 下载罗',
    fengCta: '用此朝向做风水审查 →',
    learnLink: '磁偏角是什么？',
  },
  tw: {
    heading: '朝向',
    mountain: '二十四山',
    palace: '八卦',
    permissionPrompt: '點擊「允許」讀取手機羅盤。所有資料僅在瀏覽器內運算，不上傳任何資訊。',
    permissionDenied:
      '沒有方向感應權限，無法讀取朝向。iOS Safari：設定 → Safari → 動作與方向存取。',
    desktopMsg: '羅盤需要手機的磁力計才能運作。請用手機打開此頁，或下載下方 iOS App。',
    appCta: 'iOS 下載羅',
    fengCta: '用此朝向做風水審查 →',
    learnLink: '磁偏角是什麼？',
  },
  ja: {
    heading: '方位',
    mountain: '二十四山',
    palace: '八卦',
    permissionPrompt:
      '「許可」をタップすると端末のコンパスを読み取れます。データはブラウザ内で完結し外部に送信されません。',
    permissionDenied:
      '方向センサー権限がないため方位を読み取れません。iOS Safari：設定 → Safari → モーションと画面の向きアクセス。',
    desktopMsg:
      'コンパスは端末の磁力計が必要です。スマートフォンでこのページを開くか、下のiOSアプリをご利用ください。',
    appCta: 'iOSで羅',
    fengCta: 'この方位で風水鑑定する →',
    learnLink: '磁気偏角とは？',
  },
}

export default async function CompassUsePage({ params }: CompassUsePageProps) {
  const { locale } = await params
  const copy = COPY[locale] ?? COPY.en
  return <CompassUseClient locale={locale} copy={copy} />
}
