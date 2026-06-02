const fs = require('node:fs')
const path = require('node:path')

const translations = {
  'zh.ts': "paywall_legal_disclaimer: '订阅将自动续订直到您取消。可在 Apple ID 设置中管理。',",
  'zh-Hant.ts': "paywall_legal_disclaimer: '訂閱將自動續訂直到您取消。可在 Apple ID 設定中管理。',",
  'en.ts':
    "paywall_legal_disclaimer: 'Subscriptions auto-renew until cancelled. Manage in your Apple ID settings.',",
  'ja.ts':
    "paywall_legal_disclaimer: 'サブスクリプションはキャンセルするまで自動更新されます。Apple ID設定で管理できます。',",
  'ko.ts':
    "paywall_legal_disclaimer: '구독은 취소할 때까지 자동 갱신됩니다. Apple ID 설정에서 관리하세요.',",
  'de.ts':
    "paywall_legal_disclaimer: 'Abonnements verlängern sich automatisch, bis sie gekündigt werden. Verwalten Sie diese in Ihren Apple-ID-Einstellungen.',",
  'es.ts':
    "paywall_legal_disclaimer: 'Las suscripciones se renuevan automáticamente hasta que se cancelen. Gestione en la configuración de su Apple ID.',",
  'vi.ts':
    "paywall_legal_disclaimer: 'Các đăng ký tự động gia hạn cho đến khi bị hủy. Quản lý trong cài đặt Apple ID của bạn.',",
  'th.ts':
    "paywall_legal_disclaimer: 'การสมัครสมาชิกจะต่ออายุอัตโนมัติจนกว่าคุณจะยกเลิก จัดการได้ที่การตั้งค่า Apple ID ของคุณ',",
}

const dir = '../hexastral-app/locales'

for (const [file, text] of Object.entries(translations)) {
  const p = path.join(dir, file)
  if (!fs.existsSync(p)) continue
  let content = fs.readFileSync(p, 'utf-8')
  // insert after `paywall_later:` or somewhere known.
  if (content.includes('paywall_later:')) {
    content = content.replace(/paywall_later:.*\n/, (match) => `${match}  ${text}\n`)
    fs.writeFileSync(p, content, 'utf-8')
    console.log(`Updated ${file}`)
  }
}
