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
  tabTemplates: 'Starters',
  tabMe: 'Me',
  slotsEmpty: 'No shortcuts yet. Connect Notion and pick a database you already have.',
  slotsAdd: 'Use my Notion database',
  slotsFreeCap: 'Free plan: 2 slots. Unlock for unlimited.',
  templatesTitle: 'Optional starters',
  templatesHint: 'Starters only pre-fill a name. Fields always come from the database you pick.',
  templateCustom: 'My database',
  templateJournal: 'Journal',
  templateInbox: 'Inbox',
  templateBookmark: 'Links',
  templateHabit: 'Habits',
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
  configTitle: 'Your database',
  configLead: 'Pick a Notion database Lantai can see, then choose which properties the shortcut fills.',
  configName: 'Name',
  configDatabase: 'Database',
  configFields: 'Fields to capture',
  configNoDb: 'No databases in this workspace. In Notion, share a database with the Lantai integration.',
  configSave: 'Save',
  configNeedDb: 'Select a Notion database.',
  configNeedName: 'Name this shortcut.',
  configNeedFields: 'Enable at least one field.',
  meAccount: 'Account',
  meNotion: 'Notion',
  meSignOut: 'Sign out',
  mePrivacy: 'Privacy',
  meTerms: 'Terms',
  meDisconnected: 'Not connected',
  meConnected: 'Connected',
  signedOut: 'Sign in to save configs across devices.',
}

const ZH: typeof EN = {
  appName: 'Lantai',
  subtitle: 'Flare for Notion',
  tabSlots: '槽位',
  tabTemplates: '起点',
  tabMe: '我的',
  slotsEmpty: '还没有快捷指令。连接 Notion，选一个你已经在用的数据库。',
  slotsAdd: '用我的 Notion 数据库',
  slotsFreeCap: '免费 2 个槽位。买断可无限。',
  templatesTitle: '可选起点',
  templatesHint: '起点只预填名称。字段一律来自你选中的数据库。',
  templateCustom: '我的数据库',
  templateJournal: '手记',
  templateInbox: '待办 Inbox',
  templateBookmark: '链接收藏',
  templateHabit: '习惯打卡',
  connectTitle: '连接 Notion',
  connectCta: '用 Notion 继续',
  connectNeedSignIn: '请先登录，再连接 Notion 工作区。',
  connectOk: '工作区已连接。',
  connectFail: '无法连接 Notion。',
  installTitle: '安装快捷指令',
  installBody: '使用固定名快捷指令 Lantai。点运行后，快捷指令会拉取配置并保存。不要改名。',
  installRun: '打开快捷指令',
  installMissing: '请先安装「快捷指令」应用。',
  configTitle: '你的数据库',
  configLead: '选一个 Lantai 能看到的 Notion 数据库，再勾选快捷指令要填写的属性。',
  configName: '名称',
  configDatabase: '数据库',
  configFields: '要采集的字段',
  configNoDb: '这个工作区里没有数据库。请在 Notion 里把数据库分享给 Lantai 集成。',
  configSave: '保存',
  configNeedDb: '请选择 Notion 数据库。',
  configNeedName: '请给这条快捷指令起名。',
  configNeedFields: '至少启用一个字段。',
  meAccount: '账号',
  meNotion: 'Notion',
  meSignOut: '退出登录',
  mePrivacy: '隐私政策',
  meTerms: '使用条款',
  meDisconnected: '未连接',
  meConnected: '已连接',
  signedOut: '登录后可跨设备保存配置。',
}

const ZH_HANT: typeof EN = {
  ...ZH,
  tabSlots: '槽位',
  tabTemplates: '起點',
  tabMe: '我的',
  slotsEmpty: '還沒有快捷指令。連接 Notion，選一個你已經在用的資料庫。',
  slotsAdd: '用我的 Notion 資料庫',
  slotsFreeCap: '免費 2 個槽位。買斷可無限。',
  templatesTitle: '可選起點',
  templatesHint: '起點只預填名稱。欄位一律來自你選中的資料庫。',
  templateCustom: '我的資料庫',
  templateJournal: '手記',
  templateInbox: '待辦 Inbox',
  templateBookmark: '鏈接收藏',
  templateHabit: '習慣打卡',
  connectTitle: '連接 Notion',
  connectCta: '用 Notion 繼續',
  connectNeedSignIn: '請先登入，再連接 Notion 工作區。',
  connectOk: '工作區已連接。',
  connectFail: '無法連接 Notion。',
  installTitle: '安裝快捷指令',
  installBody: '使用固定名快捷指令 Lantai。點執行後，快捷指令會拉取配置並儲存。不要改名。',
  installRun: '打開快捷指令',
  installMissing: '請先安裝「快捷指令」App。',
  configTitle: '你的資料庫',
  configLead: '選一個 Lantai 能看到的 Notion 資料庫，再勾選快捷指令要填寫的屬性。',
  configName: '名稱',
  configDatabase: '資料庫',
  configFields: '要採集的欄位',
  configNoDb: '這個工作區裡沒有資料庫。請在 Notion 把資料庫分享給 Lantai 整合。',
  configSave: '儲存',
  configNeedDb: '請選擇 Notion 資料庫。',
  configNeedName: '請幫這條快捷指令命名。',
  configNeedFields: '至少啟用一個欄位。',
  meAccount: '帳號',
  meSignOut: '登出',
  mePrivacy: '隱私權政策',
  meTerms: '使用條款',
  meDisconnected: '未連接',
  meConnected: '已連接',
  signedOut: '登入後可跨裝置儲存配置。',
}

const JA: typeof EN = {
  appName: 'Lantai',
  subtitle: 'Flare for Notion',
  tabSlots: 'スロット',
  tabTemplates: '起点',
  tabMe: '設定',
  slotsEmpty: 'ショートカットはまだありません。Notion を接続し、使っているデータベースを選んでください。',
  slotsAdd: '自分の Notion データベースを使う',
  slotsFreeCap: '無料は 2 スロット。買い切りで無制限。',
  templatesTitle: '任意の起点',
  templatesHint: '起点は名前の初期値だけです。フィールドは選んだデータベースから取ります。',
  templateCustom: '自分のデータベース',
  templateJournal: 'ジャーナル',
  templateInbox: 'Inbox',
  templateBookmark: 'リンク',
  templateHabit: '習慣',
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
  configTitle: 'データベース',
  configLead: 'Lantai に共有した Notion データベースを選び、ショートカットが埋めるプロパティを選びます。',
  configName: '名前',
  configDatabase: 'データベース',
  configFields: '取り込むフィールド',
  configNoDb: 'このワークスペースにデータベースがありません。Notion で Lantai 連携に共有してください。',
  configSave: '保存',
  configNeedDb: 'Notion データベースを選んでください。',
  configNeedName: 'ショートカットに名前をつけてください。',
  configNeedFields: 'フィールドを 1 つ以上有効にしてください。',
  meAccount: 'アカウント',
  meNotion: 'Notion',
  meSignOut: 'サインアウト',
  mePrivacy: 'プライバシー',
  meTerms: '利用規約',
  meDisconnected: '未接続',
  meConnected: '接続済み',
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
      if (id === 'custom') return STRINGS[locale].templateCustom
      if (id === 'journal') return STRINGS[locale].templateJournal
      if (id === 'inbox') return STRINGS[locale].templateInbox
      if (id === 'bookmark') return STRINGS[locale].templateBookmark
      if (id === 'habit') return STRINGS[locale].templateHabit
      return id
    },
  }
}
