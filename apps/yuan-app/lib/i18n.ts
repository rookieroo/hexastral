/**
 * Yuán app i18n — minimal locale registry for 4 markets.
 *
 * App Store display titles (anti-spam compliant per docs/anti-spam-positioning.md;
 * supersedes ADR-0001 which used "Eastern Astrology" register — that triggered
 * 4.3(b) on the hexastral-app rejection):
 *   - en-US:   "Yuán: BaZi Couples Chart"
 *   - zh-Hans: "緣 · 八字合盘"
 *   - zh-Hant: "緣 · 八字合盤"
 *   - ja-JP:   "縁・四柱推命の相性"
 *
 * Keys are flat (no namespacing) — Yuán is a focused product with a small
 * string surface. If string count exceeds ~200, promote to `@zhop/ui-i18n`.
 */

import { getLocales } from 'expo-localization'
import { useMemo } from 'react'

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

    'mode.title': 'Now for them',
    'mode.invite': 'Invite them to fill in their own',
    'mode.inviteHint': "We'll email them — they take it from there",
    'mode.fill': 'Or I will fill it in →',

    'invite.title': 'Their email',
    'invite.subtitle': 'And what are you to each other?',
    'invite.hint': "I'll send a note. They'll continue the thread.",
    'invite.send': 'Send invitation →',

    'fill.title': 'Tell me about them',
    'fill.name': 'Name',
    'fill.date': 'Birth date (YYYY-MM-DD)',
    'fill.place': 'Birth place',
    'fill.time': 'Birth time',
    'fill.timeUnknown': "I don't know",
    'fill.gender': 'Gender',
    'fill.gender.male': 'Male',
    'fill.gender.female': 'Female',
    'fill.relationship': 'Relationship',
    'fill.done': 'Done →',

    'reveal.line1': 'Your meeting',
    'reveal.line2': 'was not by chance',
    'reveal.cta': 'Read your story  →',
    'reveal.generating': 'Aligning your charts…',
    'reveal.error': "Couldn't generate the reading.",
    'reveal.retry': 'Try again',
    'reveal.paywall': 'Upgrade to Pro to read this',
    'reveal.back': 'Edit details',

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
    'bondList.error.title': 'Could not load threads',

    'invite.accept.prefix': 'is ',
    'invite.accept.suffix': ' inviting you in',
    'invite.accept.relationshipPrefix': 'You are ',
    'invite.accept.open': 'Open the thread  →',
    'invite.accept.later': 'Later',
    'invite.accept.consent.lead': 'I agree to share my birth data with ',
    'invite.accept.consent.trail': ' for a synastry compatibility reading. ',
    'invite.accept.consent.privacyPolicy': 'Privacy Policy',
    'invite.accept.relationship.other': 'connected by fate',

    'settings.title': 'Settings',
    'settings.account': 'Account',
    'settings.email.section': 'Email',
    'settings.email.notLinked': 'No email linked yet',
    'settings.email.link': 'Link email',
    'settings.email.change': 'Change email',
    'settings.email.hint':
      'Optional — lets people reply to you and helps recover your threads on a new device.',
    'settings.email.title': 'Verify your email',
    'settings.email.subtitle': 'We will send a 6-digit code to confirm ownership.',
    'settings.email.placeholder': 'you@example.com',
    'settings.email.sendCode': 'Send code',
    'settings.email.codeSent': 'Code sent to',
    'settings.email.verify': 'Confirm',
    'settings.email.changeEmail': 'Use a different email',
    'settings.email.invalid': 'Enter a valid email address',
    'settings.email.requestError': 'Could not send code — try again',
    'settings.email.codeError': 'Invalid or expired code',
    'waiting.linkEmail': 'Add your email in Settings so they can reach you →',
    'settings.signInWithApple': 'Sign in with Apple',
    'settings.signInWithApple.hint': 'Recover your threads on a new device',
    'settings.linked': 'Linked',
    'settings.recovered': 'Restored your previous threads',
    'settings.signOut': 'Sign out',
    'settings.signOut.hint': 'Removes the local device key',
    'settings.privacy.section': 'Privacy',
    'settings.crossAppMemory.label': 'Cross-app memory',
    'settings.crossAppMemory.hint':
      'Let chat reference your readings across all HexAstral apps. Same account only — never shared with anyone else.',
    'settings.error.conflict': 'This Apple ID is already linked to another account',
    'settings.error.generic': "Couldn't link your Apple ID",

    'paywall.title': 'Unlock Yuán Pro',
    'paywall.subtitle': "You've reached the free limit of 3 bonds.",
    'paywall.bullet.unlimited': 'Unlimited bonds',
    'paywall.bullet.deep': 'Deeper synastry — 6 full chapters',
    'paywall.bullet.support': 'Support a small studio',
    'paywall.monthly': 'Monthly',
    'paywall.annual': 'Annual',
    'paywall.bestValue': 'Best value',
    'paywall.cta': 'Continue',
    'paywall.restore': 'Restore purchases',
    'paywall.unavailable': 'Purchases unavailable in this build',
    'paywall.cancelled': 'Purchase cancelled',
    'paywall.failed': 'Purchase failed — please try again',
    'paywall.success': 'Welcome to Yuán Pro',
    'paywall.close': 'Close',

    'chat.title': 'Ask about this synastry',
    'chat.empty': 'Ask anything about you two.',
    'chat.placeholder': 'Type a question…',
    'chat.loading': 'Thinking…',
    'chat.error': 'Something went wrong. Please try again.',
    'chat.proUnlimited': 'Yuán Pro · unlimited',
    'chat.buyCredits': "You're out of chat replies — tap to get more.",
    'chat.freeRemaining': '{remaining} free replies left',
    'chat.poolRemaining': '{remaining} replies left this month',
    'chat.cta': 'Ask about this →',
    'chat.suggest1': 'How can we communicate better?',
    'chat.suggest2': 'What should I watch out for?',
    'chat.suggest3': 'Where are we most compatible?',
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
    'fill.name': '姓名',
    'fill.date': '生日（YYYY-MM-DD）',
    'fill.place': '出生地',
    'fill.time': '出生时辰',
    'fill.timeUnknown': '不太清楚',
    'fill.gender': '性别',
    'fill.gender.male': '男',
    'fill.gender.female': '女',
    'fill.relationship': '关系',
    'fill.done': '完成  →',

    'reveal.line1': '你们的相遇',
    'reveal.line2': '并非偶然',
    'reveal.cta': '阅读你们的故事  →',
    'reveal.generating': '正在合上星盘…',
    'reveal.error': '生成失败。',
    'reveal.retry': '再试一次',
    'reveal.paywall': '升级 Pro 解锁此报告',
    'reveal.back': '修改资料',

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
    'bondList.error.title': '无法加载缘列表',

    'invite.accept.prefix': '是 ',
    'invite.accept.suffix': ' 邀请你进入',
    'invite.accept.relationshipPrefix': '你们是 ',
    'invite.accept.open': '打开缘报告  →',
    'invite.accept.later': '稍后',
    'invite.accept.consent.lead': '我同意与 ',
    'invite.accept.consent.trail': ' 分享我的生辰信息，用于生成合盘相性解读。',
    'invite.accept.consent.privacyPolicy': '隐私政策',
    'invite.accept.relationship.other': '有缘人',

    'settings.title': '设置',
    'settings.account': '账户',
    'settings.email.section': '邮箱',
    'settings.email.notLinked': '尚未绑定邮箱',
    'settings.email.link': '绑定邮箱',
    'settings.email.change': '更换邮箱',
    'settings.email.hint': '选填 — 方便对方回复你，也有助于在新设备恢复缘记录。',
    'settings.email.title': '验证邮箱',
    'settings.email.subtitle': '我们将发送 6 位验证码以确认归属。',
    'settings.email.placeholder': 'you@example.com',
    'settings.email.sendCode': '发送验证码',
    'settings.email.codeSent': '验证码已发送至',
    'settings.email.verify': '确认',
    'settings.email.changeEmail': '更换邮箱地址',
    'settings.email.invalid': '请输入有效邮箱',
    'settings.email.requestError': '发送失败，请重试',
    'settings.email.codeError': '验证码无效或已过期',
    'waiting.linkEmail': '在设置中补充你的邮箱，方便对方联系你 →',
    'settings.signInWithApple': '用 Apple 登录',
    'settings.signInWithApple.hint': '在新设备上恢复你的缘',
    'settings.linked': '已绑定',
    'settings.recovered': '已恢复你之前的缘',
    'settings.signOut': '退出',
    'settings.signOut.hint': '清除本机密钥',
    'settings.privacy.section': '隐私',
    'settings.crossAppMemory.label': '跨应用记忆',
    'settings.crossAppMemory.hint':
      '允许对话参考你在所有 HexAstral 应用中的解读。仅限同一账户，绝不外泄。',
    'settings.error.conflict': '此 Apple ID 已绑定到另一账户',
    'settings.error.generic': '绑定 Apple ID 失败',

    'paywall.title': '解锁 Yuán Pro',
    'paywall.subtitle': '你已达到免费 3 条缘的上限',
    'paywall.bullet.unlimited': '无限缘',
    'paywall.bullet.deep': '更深的合盘 — 完整 6 章',
    'paywall.bullet.support': '支持一个独立工作室',
    'paywall.monthly': '月度',
    'paywall.annual': '年度',
    'paywall.bestValue': '最划算',
    'paywall.cta': '继续',
    'paywall.restore': '恢复购买',
    'paywall.unavailable': '当前构建不支持购买',
    'paywall.cancelled': '已取消',
    'paywall.failed': '购买失败，请重试',
    'paywall.success': '欢迎加入 Yuán Pro',
    'paywall.close': '关闭',

    'chat.title': '聊聊你们的合盘',
    'chat.empty': '关于你们俩，问我任何问题。',
    'chat.placeholder': '输入你的问题…',
    'chat.loading': '正在思考…',
    'chat.error': '出错了，请稍后再试。',
    'chat.proUnlimited': 'Yuán Pro · 无限畅聊',
    'chat.buyCredits': '对话次数已用完 — 点此获取更多。',
    'chat.freeRemaining': '还剩 {remaining} 次免费回复',
    'chat.poolRemaining': '本月还剩 {remaining} 次回复',
    'chat.cta': '聊聊这段缘 →',
    'chat.suggest1': '我们怎样沟通更好？',
    'chat.suggest2': '我需要注意什么？',
    'chat.suggest3': '我们最契合的地方是？',
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
    'fill.name': '姓名',
    'fill.date': '生日（YYYY-MM-DD）',
    'fill.place': '出生地',
    'fill.time': '出生時辰',
    'fill.timeUnknown': '不太清楚',
    'fill.gender': '性別',
    'fill.gender.male': '男',
    'fill.gender.female': '女',
    'fill.relationship': '關係',
    'fill.done': '完成  →',

    'reveal.line1': '你們的相遇',
    'reveal.line2': '並非偶然',
    'reveal.cta': '閱讀你們的故事  →',
    'reveal.generating': '正在合上星盤…',
    'reveal.error': '生成失敗。',
    'reveal.retry': '再試一次',
    'reveal.paywall': '升級 Pro 解鎖此報告',
    'reveal.back': '修改資料',

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
    'bondList.error.title': '無法載入緣列表',

    'invite.accept.prefix': '是 ',
    'invite.accept.suffix': ' 邀請你進入',
    'invite.accept.relationshipPrefix': '你們是 ',
    'invite.accept.open': '開啟緣報告  →',
    'invite.accept.later': '稍後',
    'invite.accept.consent.lead': '我同意與 ',
    'invite.accept.consent.trail': ' 分享我的生辰資訊，用於生成合盤相性解讀。',
    'invite.accept.consent.privacyPolicy': '隱私政策',
    'invite.accept.relationship.other': '有緣人',

    'settings.title': '設定',
    'settings.account': '帳號',
    'settings.email.section': '電子郵件',
    'settings.email.notLinked': '尚未綁定郵箱',
    'settings.email.link': '綁定郵箱',
    'settings.email.change': '更換郵箱',
    'settings.email.hint': '選填 — 方便對方回覆你，也有助於在新裝置恢復緣記錄。',
    'settings.email.title': '驗證郵箱',
    'settings.email.subtitle': '我們將發送 6 位驗證碼以確認歸屬。',
    'settings.email.placeholder': 'you@example.com',
    'settings.email.sendCode': '發送驗證碼',
    'settings.email.codeSent': '驗證碼已發送至',
    'settings.email.verify': '確認',
    'settings.email.changeEmail': '更換郵箱地址',
    'settings.email.invalid': '請輸入有效郵箱',
    'settings.email.requestError': '發送失敗，請重試',
    'settings.email.codeError': '驗證碼無效或已過期',
    'waiting.linkEmail': '在設定中補充你的郵箱，方便對方聯繫你 →',
    'settings.signInWithApple': '使用 Apple 登入',
    'settings.signInWithApple.hint': '在新裝置上恢復你的緣',
    'settings.linked': '已綁定',
    'settings.recovered': '已還原先前的緣',
    'settings.signOut': '登出',
    'settings.signOut.hint': '清除本機金鑰',
    'settings.privacy.section': '隱私',
    'settings.crossAppMemory.label': '跨應用記憶',
    'settings.crossAppMemory.hint':
      '允許對話參考你在所有 HexAstral 應用中的解讀。僅限同一帳號，絕不外洩。',
    'settings.error.conflict': '此 Apple ID 已綁定其他帳號',
    'settings.error.generic': '綁定 Apple ID 失敗',

    'paywall.title': '解鎖 Yuán Pro',
    'paywall.subtitle': '你已達到免費 3 條緣的上限',
    'paywall.bullet.unlimited': '無限緣',
    'paywall.bullet.deep': '更深的合盤 — 完整 6 章',
    'paywall.bullet.support': '支持一個獨立工作室',
    'paywall.monthly': '月度',
    'paywall.annual': '年度',
    'paywall.bestValue': '最划算',
    'paywall.cta': '繼續',
    'paywall.restore': '還原購買',
    'paywall.unavailable': '此版本無法購買',
    'paywall.cancelled': '已取消',
    'paywall.failed': '購買失敗，請重試',
    'paywall.success': '歡迎加入 Yuán Pro',
    'paywall.close': '關閉',

    'chat.title': '聊聊你們的合盤',
    'chat.empty': '關於你們倆，問我任何問題。',
    'chat.placeholder': '輸入你的問題…',
    'chat.loading': '正在思考…',
    'chat.error': '發生錯誤，請稍後再試。',
    'chat.proUnlimited': 'Yuán Pro · 無限暢聊',
    'chat.buyCredits': '對話次數已用完 — 點此取得更多。',
    'chat.freeRemaining': '還剩 {remaining} 次免費回覆',
    'chat.poolRemaining': '本月還剩 {remaining} 次回覆',
    'chat.cta': '聊聊這段緣 →',
    'chat.suggest1': '我們怎樣溝通更好？',
    'chat.suggest2': '我需要注意什麼？',
    'chat.suggest3': '我們最契合的地方是？',
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
    'fill.name': '名前',
    'fill.date': '生年月日（YYYY-MM-DD）',
    'fill.place': '出生地',
    'fill.time': '出生時刻',
    'fill.timeUnknown': 'わからない',
    'fill.gender': '性別',
    'fill.gender.male': '男性',
    'fill.gender.female': '女性',
    'fill.relationship': '関係',
    'fill.done': '完了  →',

    'reveal.line1': '二人の出会いは',
    'reveal.line2': '偶然ではない',
    'reveal.cta': '物語を読む  →',
    'reveal.generating': '星盤を合わせています…',
    'reveal.error': '生成に失敗しました。',
    'reveal.retry': 'もう一度',
    'reveal.paywall': 'Proにアップグレードして開く',
    'reveal.back': '修正する',

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
    'bondList.error.title': '縁を読み込めませんでした',

    'invite.accept.prefix': 'さんが',
    'invite.accept.suffix': 'あなたを誘っています',
    'invite.accept.relationshipPrefix': '二人は ',
    'invite.accept.open': '縁レポートを開く  →',
    'invite.accept.later': '後で',
    'invite.accept.consent.lead': '',
    'invite.accept.consent.trail': 'さんと出生情報を共有し、相性鑑定のために使用することに同意します。',
    'invite.accept.consent.privacyPolicy': 'プライバシーポリシー',
    'invite.accept.relationship.other': '縁の相手',

    'settings.title': '設定',
    'settings.account': 'アカウント',
    'settings.email.section': 'メール',
    'settings.email.notLinked': 'メール未登録',
    'settings.email.link': 'メールを登録',
    'settings.email.change': 'メールを変更',
    'settings.email.hint':
      '任意 — 相手からの返信や、新しい端末での縁の復元に役立ちます。',
    'settings.email.title': 'メールを確認',
    'settings.email.subtitle': '6桁の確認コードをお送りします。',
    'settings.email.placeholder': 'you@example.com',
    'settings.email.sendCode': 'コードを送信',
    'settings.email.codeSent': '送信先：',
    'settings.email.verify': '確認',
    'settings.email.changeEmail': '別のメールを使う',
    'settings.email.invalid': '有効なメールアドレスを入力してください',
    'settings.email.requestError': '送信に失敗しました。もう一度お試しください',
    'settings.email.codeError': 'コードが無効、または期限切れです',
    'waiting.linkEmail': '設定でメールを追加すると、相手から連絡を受け取れます →',
    'settings.signInWithApple': 'Appleでサインイン',
    'settings.signInWithApple.hint': '新しいデバイスで縁を復元',
    'settings.linked': 'リンク済み',
    'settings.recovered': '以前の縁を復元しました',
    'settings.signOut': 'サインアウト',
    'settings.signOut.hint': '端末のキーを削除',
    'settings.privacy.section': 'プライバシー',
    'settings.crossAppMemory.label': 'アプリ間メモリ',
    'settings.crossAppMemory.hint':
      'すべての HexAstral アプリの鑑定結果をチャットが参照できるようにします。同一アカウントのみ — 他者と共有されません。',
    'settings.error.conflict': 'このApple IDは別のアカウントにリンク済みです',
    'settings.error.generic': 'Apple IDのリンクに失敗しました',

    'paywall.title': 'Yuán Proを解放',
    'paywall.subtitle': '無料3件の上限に達しました',
    'paywall.bullet.unlimited': '縁の数は無制限',
    'paywall.bullet.deep': '詳細な相性診断 — 全6章',
    'paywall.bullet.support': '小さなスタジオを応援',
    'paywall.monthly': '月額',
    'paywall.annual': '年額',
    'paywall.bestValue': 'お得',
    'paywall.cta': '続ける',
    'paywall.restore': '購入を復元',
    'paywall.unavailable': 'このビルドでは購入できません',
    'paywall.cancelled': 'キャンセルしました',
    'paywall.failed': '購入に失敗しました',
    'paywall.success': 'Yuán Proへようこそ',
    'paywall.close': '閉じる',

    'chat.title': '二人の相性について聞く',
    'chat.empty': '二人のことを何でも聞いてください。',
    'chat.placeholder': '質問を入力…',
    'chat.loading': '考えています…',
    'chat.error': 'エラーが発生しました。もう一度お試しください。',
    'chat.proUnlimited': 'Yuán Pro · 無制限',
    'chat.buyCredits': 'チャット回数を使い切りました — タップで追加。',
    'chat.freeRemaining': '無料の返信があと {remaining} 回',
    'chat.poolRemaining': '今月の返信があと {remaining} 回',
    'chat.cta': 'この縁について聞く →',
    'chat.suggest1': 'どうすればもっと良く話せますか？',
    'chat.suggest2': '気をつけることは？',
    'chat.suggest3': '私たちが最も合うところは？',
  },
}

export type TranslationKey = keyof typeof translations.en

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key] ?? translations.en[key] ?? key
}

/** HexAstral web privacy page path segment for each Yuán locale */
export function privacyPolicyUrl(locale: Locale): string {
  const segment =
    locale === 'zh-Hant' ? 'tw' : locale === 'zh' ? 'zh' : locale === 'ja' ? 'ja' : 'en'
  return `https://www.hexastral.com/${segment}/privacy`
}

export function useI18n() {
  const locale = useMemo(() => resolveLocale(), [])
  return {
    locale,
    t: (key: TranslationKey) => t(locale, key),
  }
}
