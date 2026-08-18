import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import { useEffect, useState } from 'react'

const LOCALE_STORAGE_KEY = 'lantai_locale'

export type UiLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

export const SUPPORTED_UI_LOCALES: readonly UiLocale[] = ['en', 'zh', 'zh-Hant', 'ja']

function normalizeLocale(tag: string): UiLocale {
  const lower = tag.toLowerCase()
  if (lower.startsWith('zh-hant') || lower.startsWith('zh-tw') || lower.startsWith('zh-hk')) {
    return 'zh-Hant'
  }
  if (lower.startsWith('zh')) return 'zh'
  if (lower.startsWith('ja')) return 'ja'
  return 'en'
}

export function resolveUiLocale(saved?: string | null): UiLocale {
  if (saved) return normalizeLocale(saved)
  const fallback = getLocales()[0]?.languageTag ?? 'en'
  return normalizeLocale(fallback)
}

const EN = {
  appName: 'Lantai',
  subtitle: 'Flare for Notion',
  tabSlots: 'Slots',
  tabTemplates: 'Templates',
  tabMe: 'Me',
  slotsEmpty: 'No shortcuts yet. Pick a template to create your first slot.',
  slotsFreeCap: 'Free plan: 2 slots. Unlock for unlimited.',
  templatesTitle: 'Official templates',
  templateJournal: 'Journal',
  templateInbox: 'Inbox',
  templateBookmark: 'Links',
  templateHabit: 'Habits',
  templateLedger: 'Ledger (AI)',
  templateLedgerHint: 'Needs Lantai Pro. Visible now; runs in a later build.',
  connectTitle: 'Connect Notion',
  connectCta: 'Continue with Notion',
  connectNeedSignIn: 'Sign in first, then connect a Notion workspace.',
  connectOk: 'Workspace connected.',
  connectFail: 'Could not connect Notion.',
  installTitle: 'Install shortcut',
  installBody:
    'Lantai uses one fixed-name shortcut. Tap Run — Shortcuts will fetch the config and save it. Do not rename the shortcut.',
  installRun: 'Open Shortcuts',
  installMissing: 'Install the Shortcuts app to continue.',
  configTitle: 'Configure',
  configName: 'Name',
  configDatabase: 'Database',
  configSave: 'Save',
  configNeedDb: 'Select a Notion database.',
  meAccount: 'Account',
  meNotion: 'Notion',
  meSignOut: 'Sign out',
  mePrivacy: 'Privacy',
  meTerms: 'Terms',
  meDisconnected: 'Not connected',
  meConnected: 'Connected',
  confirmStub: 'AI confirmation ships in a later build.',
  signedOut: 'Sign in to save configs across devices.',
}

const ZH: typeof EN = {
  appName: 'Lantai',
  subtitle: 'Flare for Notion',
  tabSlots: '槽位',
  tabTemplates: '模板',
  tabMe: '我的',
  slotsEmpty: '还没有快捷指令。选一个模板创建第一个槽位。',
  slotsFreeCap: '免费 2 个槽位。买断可无限。',
  templatesTitle: '官方模板',
  templateJournal: '手记',
  templateInbox: '待办 Inbox',
  templateBookmark: '链接收藏',
  templateHabit: '习惯打卡',
  templateLedger: '记账（AI）',
  templateLedgerHint: '需要 Lantai Pro。现在可见，运行能力稍后上线。',
  connectTitle: '连接 Notion',
  connectCta: '用 Notion 继续',
  connectNeedSignIn: '请先登录，再连接 Notion 工作区。',
  connectOk: '工作区已连接。',
  connectFail: '无法连接 Notion。',
  installTitle: '安装快捷指令',
  installBody: '使用固定名快捷指令 Lantai。点运行后，快捷指令会拉取配置并保存。不要改名。',
  installRun: '打开快捷指令',
  installMissing: '请先安装「快捷指令」应用。',
  configTitle: '配置',
  configName: '名称',
  configDatabase: '数据库',
  configSave: '保存',
  configNeedDb: '请选择 Notion 数据库。',
  meAccount: '账号',
  meNotion: 'Notion',
  meSignOut: '退出登录',
  mePrivacy: '隐私政策',
  meTerms: '使用条款',
  meDisconnected: '未连接',
  meConnected: '已连接',
  confirmStub: 'AI 确认页将在后续版本提供。',
  signedOut: '登录后可跨设备保存配置。',
}

const ZH_HANT: typeof EN = {
  ...ZH,
  tabSlots: '槽位',
  tabTemplates: '模板',
  tabMe: '我的',
  slotsEmpty: '還沒有快捷指令。選一個模板建立第一個槽位。',
  slotsFreeCap: '免費 2 個槽位。買斷可無限。',
  templateJournal: '手記',
  templateInbox: '待辦 Inbox',
  templateBookmark: '鏈接收藏',
  templateHabit: '習慣打卡',
  templateLedger: '記帳（AI）',
  templateLedgerHint: '需要 Lantai Pro。現在可見，運行能力稍後上線。',
  connectTitle: '連接 Notion',
  connectCta: '用 Notion 繼續',
  connectNeedSignIn: '請先登入，再連接 Notion 工作區。',
  connectOk: '工作區已連接。',
  connectFail: '無法連接 Notion。',
  installTitle: '安裝快捷指令',
  installBody: '使用固定名快捷指令 Lantai。點執行後，快捷指令會拉取配置並儲存。不要改名。',
  installRun: '打開快捷指令',
  installMissing: '請先安裝「快捷指令」App。',
  configTitle: '配置',
  configName: '名稱',
  configDatabase: '資料庫',
  configSave: '儲存',
  configNeedDb: '請選擇 Notion 資料庫。',
  meAccount: '帳號',
  meSignOut: '登出',
  mePrivacy: '隱私權政策',
  meTerms: '使用條款',
  meDisconnected: '未連接',
  meConnected: '已連接',
  confirmStub: 'AI 確認頁將在後續版本提供。',
  signedOut: '登入後可跨裝置儲存配置。',
}

const JA: typeof EN = {
  appName: 'Lantai',
  subtitle: 'Flare for Notion',
  tabSlots: 'スロット',
  tabTemplates: 'テンプレ',
  tabMe: '設定',
  slotsEmpty: 'ショートカットはまだありません。テンプレートから最初のスロットを作ってください。',
  slotsFreeCap: '無料は 2 スロット。買い切りで無制限。',
  templatesTitle: '公式テンプレート',
  templateJournal: 'ジャーナル',
  templateInbox: 'Inbox',
  templateBookmark: 'リンク',
  templateHabit: '習慣',
  templateLedger: '家計（AI）',
  templateLedgerHint: 'Lantai Pro が必要です。表示はできますが実行は後のビルドです。',
  connectTitle: 'Notion を接続',
  connectCta: 'Notion で続ける',
  connectNeedSignIn: '先にサインインしてから Notion ワークスペースを接続してください。',
  connectOk: 'ワークスペースを接続しました。',
  connectFail: 'Notion に接続できませんでした。',
  installTitle: 'ショートカットを入れる',
  installBody:
    '固定名ショートカット Lantai を使います。実行すると設定を取得して保存します。名前は変えないでください。',
  installRun: 'ショートカットを開く',
  installMissing: '「ショートカット」アプリをインストールしてください。',
  configTitle: '設定',
  configName: '名前',
  configDatabase: 'データベース',
  configSave: '保存',
  configNeedDb: 'Notion データベースを選んでください。',
  meAccount: 'アカウント',
  meNotion: 'Notion',
  meSignOut: 'サインアウト',
  mePrivacy: 'プライバシー',
  meTerms: '利用規約',
  meDisconnected: '未接続',
  meConnected: '接続済み',
  confirmStub: 'AI 確認画面は後のビルドで提供します。',
  signedOut: 'サインインすると設定を端末間で保存できます。',
}

const STRINGS: Record<UiLocale, typeof EN> = {
  en: EN,
  zh: ZH,
  'zh-Hant': ZH_HANT,
  ja: JA,
}

export type LantaiStringKey = keyof typeof EN

export function useSatelliteI18n() {
  const [locale, setLocale] = useState<UiLocale>('en')

  useEffect(() => {
    void AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((saved) => {
      setLocale(resolveUiLocale(saved))
    })
  }, [])

  return {
    locale,
    t: (key: LantaiStringKey) => STRINGS[locale][key],
    templateLabel: (id: string): string => {
      if (id === 'journal') return STRINGS[locale].templateJournal
      if (id === 'inbox') return STRINGS[locale].templateInbox
      if (id === 'bookmark') return STRINGS[locale].templateBookmark
      if (id === 'habit') return STRINGS[locale].templateHabit
      if (id === 'ledger') return STRINGS[locale].templateLedger
      return id
    },
  }
}
