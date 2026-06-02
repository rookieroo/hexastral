/**
 * Push notification helper — wraps SVC_NOTIFY service binding
 *
 * All user-visible strings live here, localized per the recipient's
 * registered device locale (stored in EXPO_PUSH_TOKENS KV by svc-notify).
 *
 * Best-effort: errors are caught and logged, never block the caller.
 */

import type { CloudflareBindings } from '../infra-types'
import { notifyClient } from './service-clients'

// ── Locale string table ─────────────────────────────────────────────────────
// Keys: event_title / event_body. Params: {name} placeholder.

const PUSH_STRINGS: Record<string, Record<string, string>> = {
  bond_matched_title: {
    zh: 'Kindred分已至',
    'zh-Hant': 'Kindred分已至',
    en: 'Your contact joined!',
    ja: 'ご縁がつながりました',
    ko: '인연이 이어졌습니다',
    de: 'Dein Kontakt ist dabei!',
    es: '¡Tu contacto se unió!',
    vi: 'Liên hệ của bạn đã tham gia!',
    th: 'ผู้ติดต่อของคุณเข้าร่วมแล้ว!',
  },
  bond_matched_body: {
    zh: '{name} 也加入了 HexAstral！',
    'zh-Hant': '{name} 也加入了 HexAstral！',
    en: '{name} joined HexAstral',
    ja: '{name} が HexAstral に参加しました！',
    ko: '{name} 님이 HexAstral에 가입했습니다',
    de: '{name} ist HexAstral beigetreten',
    es: '{name} se unió a HexAstral',
    vi: '{name} đã tham gia HexAstral',
    th: '{name} เข้าร่วม HexAstral แล้ว',
  },

  // ── Bond lifecycle events ────────────────────────────────────────────────

  bond_accepted_title: {
    zh: 'Kindred分已共振',
    'zh-Hant': 'Kindred分已共振',
    en: 'Connection accepted!',
    ja: '縁が確立されました',
    ko: '인연이 연결되었습니다',
    de: 'Verbindung angenommen!',
    es: '¡Conexión aceptada!',
    vi: 'Kết nối được chấp nhận!',
    th: 'การเชื่อมต่อได้รับการยอมรับแล้ว!',
  },
  bond_accepted_body: {
    zh: '你的合盘解读已就绪，开启应用查看福报Kindred分。',
    'zh-Hant': '你的合盤解讀已就緒，開啟應用查看福報Kindred分。',
    en: 'Your compatibility reading is ready. Open HexAstral to see the full analysis.',
    ja: '合盤解読が完成しました。アプリを開いてご確認ください。',
    ko: '궁합 해석이 준비되었습니다. 앱을 열어 확인하세요.',
    de: 'Deine Kompatibilitätsanalyse ist bereit. Öffne HexAstral.',
    es: 'Tu lectura de compatibilidad está lista. Abre HexAstral.',
    vi: 'Bản đọc hợp bàn đã sẵn sàng. Mở HexAstral để xem.',
    th: 'การวิเคราะห์ความเข้ากันพร้อมแล้ว เปิด HexAstral เพื่อดู',
  },

  bond_declined_title: {
    zh: '邀请未获回应',
    'zh-Hant': '邀請未獲回應',
    en: 'Invitation declined',
    ja: '招待が辞退されました',
    ko: '초대가 거절되었습니다',
    de: 'Einladung abgelehnt',
    es: 'Invitación rechazada',
    vi: 'Lời mời bị từ chối',
    th: 'คำเชิญถูกปฏิเสธ',
  },
  bond_declined_body: {
    zh: '对方暂未接受合盘邀请。',
    'zh-Hant': '對方暫未接受合盤邀請。',
    en: 'Your connection invitation was not accepted at this time.',
    ja: '合盤の招待が辞退されました。',
    ko: '합반 초대가 거절되었습니다.',
    de: 'Deine Verbindungseinladung wurde nicht angenommen.',
    es: 'Tu invitación de conexión no fue aceptada en este momento.',
    vi: 'Lời mời kết nối của bạn đã không được chấp nhận.',
    th: 'คำเชิญเชื่อมต่อของคุณไม่ได้รับการยอมรับ',
  },

  bond_gifted_title: {
    zh: '完整解读已解锁',
    'zh-Hant': '完整解讀已解鎖',
    en: 'Full reading unlocked!',
    ja: '完全な解読が解放されました',
    ko: '전체 해석이 공유되었습니다',
    de: 'Vollständige Analyse freigeschaltet!',
    es: '¡Análisis completo desbloqueado!',
    vi: 'Phân tích đầy đủ đã mở khóa!',
    th: 'การวิเคราะห์เต็มรูปแบบถูกปลดล็อคแล้ว!',
  },
  bond_gifted_body: {
    zh: '你们的合盘完整解读已解锁，开启应用查看所有维度。',
    'zh-Hant': '你們的合盤完整解讀已解鎖，開啟應用查看所有維度。',
    en: 'Your partner shared the full compatibility reading with you. Open HexAstral to view it.',
    ja: '合盤の完全な解読が共有されました。アプリを開いてご確認ください。',
    ko: '파트너가 전체 궁합 분석을 공유했습니다. 앱을 열어 확인하세요.',
    de: 'Dein Partner hat die vollständige Kompatibilitätsanalyse geteilt. Öffne HexAstral.',
    es: 'Tu pareja compartió el análisis completo contigo. Abre HexAstral.',
    vi: 'Đối tác của bạn đã chia sẻ phân tích tương thích đầy đủ. Mở HexAstral để xem.',
    th: 'คู่ของคุณแชร์การวิเคราะห์ความเข้ากันทั้งหมดกับคุณแล้ว เปิด HexAstral',
  },

  bond_expired_title: {
    zh: '合盘邀请已过期',
    'zh-Hant': '合盤邀請已過期',
    en: 'Connection invitation expired',
    ja: '招待が期限切れになりました',
    ko: '초대가 만료되었습니다',
    de: 'Einladung abgelaufen',
    es: 'Invitación caducada',
    vi: 'Lời mời đã hết hạn',
    th: 'คำเชิญหมดอายุแล้ว',
  },
  bond_expired_body: {
    zh: '你的合盘邀请已过期，可随时重新发送。',
    'zh-Hant': '你的合盤邀請已過期，可隨時重新發送。',
    en: 'Your resonance invitation was not responded to. You can send a new one anytime.',
    ja: '合盤の招待が期限切れになりました。いつでも再送信できます。',
    ko: '합반 초대가 응답을 받지 못했습니다. 언제든지 다시 보낼 수 있습니다.',
    de: 'Deine Verbindungseinladung ist abgelaufen. Du kannst jederzeit eine neue senden.',
    es: 'Tu invitación de conexión caducó. Puedes enviar una nueva en cualquier momento.',
    vi: 'Lời mời kết nối của bạn đã hết hạn. Bạn có thể gửi lại bất cứ lúc nào.',
    th: 'คำเชิญเชื่อมต่อของคุณหมดอายุแล้ว คุณสามารถส่งใหม่ได้ตลอดเวลา',
  },
}

function getPushString(key: string, locale: string, params?: Record<string, string>): string {
  const table = PUSH_STRINGS[key] ?? {}
  // Try exact locale → language prefix → zh fallback
  const lang = locale.split('-')[0] ?? locale
  let str = table[locale] ?? table[lang] ?? table['zh'] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, v)
    }
  }
  return str
}

// ── Public API ───────────────────────────────────────────────────────────────

export type PushEvent =
  | 'bond_matched'
  | 'bond_accepted'
  | 'bond_declined'
  | 'bond_gifted'
  | 'bond_expired'

/**
 * Send a localized push notification to a single user.
 * Resolves the recipient's locale from svc-notify before building strings.
 */
export async function sendPushEvent(
  env: CloudflareBindings,
  userId: string,
  event: PushEvent,
  params: Record<string, string> = {}
): Promise<void> {
  try {
    // 1. Look up recipient's locale from svc-notify
    const { locale } = await notifyClient
      .get<{ locale: string }>(env.SVC_NOTIFY, `/expo-push/locale/${userId}`)
      .catch(() => ({ locale: 'zh' }))

    // 2. Build localized strings
    const title = getPushString(`${event}_title`, locale, params)
    const body = getPushString(`${event}_body`, locale, params)

    // 3. Send via svc-notify (resolves token internally)
    await notifyClient.post(env.SVC_NOTIFY, '/expo-push/notify-user', {
      userId,
      title,
      body,
      data: { type: event, ...params },
    })
  } catch (err) {
    console.error('[push] sendPushEvent failed:', err)
  }
}
