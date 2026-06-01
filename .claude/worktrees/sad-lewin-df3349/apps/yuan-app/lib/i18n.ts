/**
 * Yuán app i18n — minimal locale registry for 4 markets.
 *
 * Per ADR-0001 (docs/decisions/0001-yuan-naming.md), Yuán ships:
 *   - en-US: "Yuán: Eastern Astrology"
 *   - zh-Hans: "緣 · 东方占星合婚"
 *   - zh-Hant: "緣 · 東方占星合婚"
 *   - ja-JP: "縁・東洋占星相性"
 *
 * Keys are flat (no namespacing) — Yuán is a focused product with a small
 * string surface compared to hexastral-app. If string count exceeds ~200,
 * promote to `@zhop/ui-i18n` (deferred until needed).
 */

import { getLocales } from 'expo-localization'

export type Locale = 'en' | 'zh' | 'zh-Hant' | 'ja'

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'zh', 'zh-Hant', 'ja']

/** Resolve the device locale to one of the supported Yuán locales */
export function resolveLocale(): Locale {
  const locales = getLocales()
  const first = locales[0]
  if (!first) return 'en'
  const tag = first.languageTag.toLowerCase()
  if (tag.startsWith('zh-tw') || tag.startsWith('zh-hk') || tag.startsWith('zh-hant')) {
    return 'zh-Hant'
  }
  if (tag.startsWith('zh')) return 'zh'
  if (tag.startsWith('ja')) return 'ja'
  return 'en'
}

type Translations = Record<Locale, Record<string, string>>

export const translations: Translations = {
  en: {
    'welcome.line1': 'Between two people',
    'welcome.line2': 'there are invisible threads',
    'welcome.tap': 'Tap anywhere to begin',

    'name.title': 'First,',
    'name.subtitle': 'tell me your name',
    'name.placeholder': 'Your name',

    'date.title': 'Your birthday',
    'date.subtitle': '',

    'time.title': 'What time were you born?',
    'time.subtitle': '',
    'time.unknown': "I'm not sure (we'll use day pillar)",

    'place.title': 'Where were you born?',
    'place.subtitle': '',

    'mode.title': "Now for them",
    'mode.invite': 'Invite them to fill in their own',
    'mode.inviteHint': "We'll email them — they take it from there",
    'mode.fill': 'Or I will fill it in →',

    'invite.title': 'Their email',
    'invite.subtitle': 'And what are you to each other?',
    'invite.hint': "I'll send a note. They'll continue the thread.",
    'invite.send': 'Send invitation →',

    'fill.title': 'Tell me about them',
    'fill.done': 'Done →',

    'reveal.line1': 'Your meeting',
    'reveal.line2': 'was not by chance',
    'reveal.cta': 'Read your story  →',

    'waiting.title': 'Invitation sent',
    'waiting.subtitle': 'waiting for them',
    'waiting.hint': "Once they fill in their birth, we'll align your charts.",
    'waiting.resend': 'Resend invitation',
    'waiting.cancel': 'Cancel invitation',
    'waiting.acceptedTitle': 'Your thread is woven',
    'waiting.acceptedSubtitle': 'report ready',
    'waiting.viewReport': 'Read your story  →',

    'common.next': 'Next →',
    'common.skip': 'Skip',
    'common.back': '←',
    'common.relationship.romantic': 'Partner',
    'common.relationship.friend': 'Friend',
    'common.relationship.family': 'Family',
    'common.relationship.partner': 'Business partner',
    'common.relationship.colleague': 'Colleague',
    'common.relationship.other': 'Other',

    'bondList.empty.title': 'No threads yet',
    'bondList.empty.cta': 'Begin →',

    'invite.accept.prefix': 'is ',
    'invite.accept.suffix': ' inviting you in',
    'invite.accept.open': 'Open the thread  →',
    'invite.accept.later': 'Later',
  },

  zh: {
    'welcome.line1': '两人之间',
    'welcome.line2': '有看不见的丝线',
    'welcome.tap': '轻触屏幕开始',

    'name.title': '先告诉我',
    'name.subtitle': '你的名字',
    'name.placeholder': '你的名字',

    'date.title': '你的生日',
    'date.subtitle': '',

    'time.title': '出生的具体时辰',
    'time.subtitle': '',
    'time.unknown': '不太清楚（用日柱推算）',

    'place.title': '在哪里出生',
    'place.subtitle': '',

    'mode.title': '现在轮到 ta',
    'mode.invite': '邀请 ta 自己填',
    'mode.inviteHint': '我会发邮件让 ta 接力',
    'mode.fill': '或者我代填  →',

    'invite.title': 'ta 的邮箱',
    'invite.subtitle': '你们是什么关系？',
    'invite.hint': '我会发一封信，让 ta 接力填',
    'invite.send': '发送邀请  →',

    'fill.title': '告诉我关于 ta',
    'fill.done': '完成  →',

    'reveal.line1': '你们的相遇',
    'reveal.line2': '并非偶然',
    'reveal.cta': '阅读你们的故事  →',

    'waiting.title': '邀请已发出',
    'waiting.subtitle': '等 ta 接力',
    'waiting.hint': 'ta 收到邮件后填一份生辰，我们就会合上你们的星盘',
    'waiting.resend': '重发邀请',
    'waiting.cancel': '取消邀请',
    'waiting.acceptedTitle': '你们的缘已系',
    'waiting.acceptedSubtitle': '报告已生成',
    'waiting.viewReport': '阅读你们的故事  →',

    'common.next': '下一步 →',
    'common.skip': '跳过',
    'common.back': '←',
    'common.relationship.romantic': '恋人',
    'common.relationship.friend': '朋友',
    'common.relationship.family': '家人',
    'common.relationship.partner': '合伙人',
    'common.relationship.colleague': '同事',
    'common.relationship.other': '其他',

    'bondList.empty.title': '还没有缘',
    'bondList.empty.cta': '开始一段  →',

    'invite.accept.prefix': '是 ',
    'invite.accept.suffix': ' 邀请你进入',
    'invite.accept.open': '打开缘报告  →',
    'invite.accept.later': '稍后',
  },

  'zh-Hant': {
    'welcome.line1': '兩人之間',
    'welcome.line2': '有看不見的絲線',
    'welcome.tap': '輕觸螢幕開始',

    'name.title': '先告訴我',
    'name.subtitle': '你的名字',
    'name.placeholder': '你的名字',

    'date.title': '你的生日',
    'date.subtitle': '',

    'time.title': '出生的具體時辰',
    'time.subtitle': '',
    'time.unknown': '不太清楚（用日柱推算）',

    'place.title': '在哪裡出生',
    'place.subtitle': '',

    'mode.title': '現在輪到 ta',
    'mode.invite': '邀請 ta 自己填',
    'mode.inviteHint': '我會發郵件讓 ta 接力',
    'mode.fill': '或者我代填  →',

    'invite.title': 'ta 的信箱',
    'invite.subtitle': '你們是什麼關係？',
    'invite.hint': '我會發一封信，讓 ta 接力填',
    'invite.send': '送出邀請  →',

    'fill.title': '告訴我關於 ta',
    'fill.done': '完成  →',

    'reveal.line1': '你們的相遇',
    'reveal.line2': '並非偶然',
    'reveal.cta': '閱讀你們的故事  →',

    'waiting.title': '邀請已發出',
    'waiting.subtitle': '等 ta 接力',
    'waiting.hint': 'ta 收到信件後填一份生辰，我們就會合上你們的星盤',
    'waiting.resend': '重新發送邀請',
    'waiting.cancel': '取消邀請',
    'waiting.acceptedTitle': '你們的緣已繫',
    'waiting.acceptedSubtitle': '報告已生成',
    'waiting.viewReport': '閱讀你們的故事  →',

    'common.next': '下一步 →',
    'common.skip': '跳過',
    'common.back': '←',
    'common.relationship.romantic': '戀人',
    'common.relationship.friend': '朋友',
    'common.relationship.family': '家人',
    'common.relationship.partner': '合夥人',
    'common.relationship.colleague': '同事',
    'common.relationship.other': '其他',

    'bondList.empty.title': '還沒有緣',
    'bondList.empty.cta': '開始一段  →',

    'invite.accept.prefix': '是 ',
    'invite.accept.suffix': ' 邀請你進入',
    'invite.accept.open': '開啟緣報告  →',
    'invite.accept.later': '稍後',
  },

  ja: {
    'welcome.line1': '二人の間には',
    'welcome.line2': '見えない糸がある',
    'welcome.tap': 'タップして始める',

    'name.title': 'まず',
    'name.subtitle': 'あなたのお名前を',
    'name.placeholder': 'お名前',

    'date.title': 'お誕生日',
    'date.subtitle': '',

    'time.title': '生まれた時刻',
    'time.subtitle': '',
    'time.unknown': 'わからない（日柱を使用）',

    'place.title': '出生地',
    'place.subtitle': '',

    'mode.title': '次は相手の番',
    'mode.invite': '相手に自分で記入してもらう',
    'mode.inviteHint': 'メールでお誘いします',
    'mode.fill': '私が代わりに入力  →',

    'invite.title': '相手のメール',
    'invite.subtitle': '二人はどんな関係？',
    'invite.hint': 'メールを送って続きをお任せします',
    'invite.send': '招待を送る  →',

    'fill.title': '相手について教えて',
    'fill.done': '完了  →',

    'reveal.line1': '二人の出会いは',
    'reveal.line2': '偶然ではない',
    'reveal.cta': '物語を読む  →',

    'waiting.title': '招待を送信しました',
    'waiting.subtitle': '相手の返信を待っています',
    'waiting.hint': '相手が生まれた情報を入力すると、二人の星盤を合わせます',
    'waiting.resend': '招待を再送',
    'waiting.cancel': '招待を取り消す',
    'waiting.acceptedTitle': '縁が結ばれました',
    'waiting.acceptedSubtitle': 'レポートが生成されました',
    'waiting.viewReport': '物語を読む  →',

    'common.next': '次へ →',
    'common.skip': 'スキップ',
    'common.back': '←',
    'common.relationship.romantic': '恋人',
    'common.relationship.friend': '友人',
    'common.relationship.family': '家族',
    'common.relationship.partner': 'パートナー',
    'common.relationship.colleague': '同僚',
    'common.relationship.other': 'その他',

    'bondList.empty.title': 'まだ縁はありません',
    'bondList.empty.cta': '始める  →',

    'invite.accept.prefix': 'さんが',
    'invite.accept.suffix': 'あなたを誘っています',
    'invite.accept.open': '縁レポートを開く  →',
    'invite.accept.later': '後で',
  },
}

export type TranslationKey = keyof typeof translations.en

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key] ?? translations.en[key] ?? key
}
