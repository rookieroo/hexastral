import type { DreamDescribeStrings } from './types'

const EN: DreamDescribeStrings = {
  title: 'Dream',
  placeholder: 'I was swimming in a quiet lake…',
  cta: 'Interpret now',
  back: '← Back',
  minHint: 'Please enter at least 8 characters.',
  loading: 'Interpreting dream...',
  errorGeneric: 'Dream interpretation failed. Please retry.',
}

const ZH: DreamDescribeStrings = {
  title: '解梦',
  placeholder: '我梦见在安静的湖里游泳……',
  cta: '开始解读',
  back: '← 返回',
  minHint: '请至少输入 8 个字符。',
  loading: '正在解读梦境…',
  errorGeneric: '解读失败，请稍后重试。',
}

const ZH_HANT: DreamDescribeStrings = {
  title: '解夢',
  placeholder: '我夢見在安靜的湖裡游泳……',
  cta: '開始解讀',
  back: '← 返回',
  minHint: '請至少輸入 8 個字元。',
  loading: '正在解讀夢境…',
  errorGeneric: '解讀失敗，請稍後重試。',
}

const JA: DreamDescribeStrings = {
  title: '夢占い',
  placeholder: '静かな湖で泳いでいた…',
  cta: '占う',
  back: '← 戻る',
  minHint: '8文字以上入力してください。',
  loading: '夢を読み解いています…',
  errorGeneric: '解釈に失敗しました。もう一度お試しください。',
}

const KO: DreamDescribeStrings = {
  title: '꿈 해몽',
  placeholder: '고요한 호수에서 수영하고 있었어요…',
  cta: '해몽하기',
  back: '← 뒤로',
  minHint: '8자 이상 입력해 주세요.',
  loading: '꿈을 해석하는 중…',
  errorGeneric: '해석에 실패했습니다. 다시 시도해 주세요.',
}

const DE: DreamDescribeStrings = {
  title: 'Traumdeutung',
  placeholder: 'Ich schwamm in einem stillen See…',
  cta: 'Jetzt deuten',
  back: '← Zurück',
  minHint: 'Bitte mindestens 8 Zeichen eingeben.',
  loading: 'Traum wird gedeutet…',
  errorGeneric: 'Traumdeutung fehlgeschlagen. Bitte erneut versuchen.',
}

const ES: DreamDescribeStrings = {
  title: 'Sueño',
  placeholder: 'Nadaba en un lago tranquilo…',
  cta: 'Interpretar',
  back: '← Volver',
  minHint: 'Introduce al menos 8 caracteres.',
  loading: 'Interpretando el sueño…',
  errorGeneric: 'Falló la interpretación. Inténtalo de nuevo.',
}

const VI: DreamDescribeStrings = {
  title: 'Giải mộng',
  placeholder: 'Tôi đang bơi trong một hồ yên tĩnh…',
  cta: 'Giải mộng',
  back: '← Quay lại',
  minHint: 'Vui lòng nhập ít nhất 8 ký tự.',
  loading: 'Đang giải mộng…',
  errorGeneric: 'Giải mộng thất bại. Vui lòng thử lại.',
}

const TH: DreamDescribeStrings = {
  title: 'ทำนายฝัน',
  placeholder: 'ฉันว่ายน้ำในทะเลสาบที่เงียบสงบ…',
  cta: 'ตีความฝัน',
  back: '← กลับ',
  minHint: 'กรุณากรอกอย่างน้อย 8 ตัวอักษร',
  loading: 'กำลังตีความฝัน…',
  errorGeneric: 'ตีความฝันไม่สำเร็จ โปรดลองอีกครั้ง',
}

const BY_TAG: Record<string, DreamDescribeStrings> = {
  en: EN,
  zh: ZH,
  'zh-Hant': ZH_HANT,
  ja: JA,
  ko: KO,
  de: DE,
  es: ES,
  vi: VI,
  th: TH,
}

/** Built-in copy for satellite apps (portfolio locales). Flagship should use `useI18n` keys instead. */
export function dreamDescribeStringsForLocale(locale: string): DreamDescribeStrings {
  if (BY_TAG[locale]) return BY_TAG[locale]!
  const base = locale.split('-')[0] ?? 'en'
  return BY_TAG[base] ?? EN
}
