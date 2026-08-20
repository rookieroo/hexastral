import { useTheme } from '@zhop/core-ui'
import * as Linking from 'expo-linking'
import { Stack } from 'expo-router'
import { Pressable, ScrollView, Text } from 'react-native'

import { privacyPolicyUrl, resolveLocale } from '@/lib/i18n'
import { pickUi } from '@/lib/locale-zh'

export default function FacePrivacyAppendixScreen() {
  const { colors, spacing } = useTheme()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const url = privacyPolicyUrl(locale)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>
        {s('Syel 数据处理', 'Syel 資料處理', 'Syel data handling', 'Syel データ処理')}
      </Text>
      <Text style={{ color: colors.secondary, lineHeight: 22 }}>
        {s(
          '本机保留可查看的左掌、右掌与面部草稿。为提取特征会短暂上传到服务器（短生命周期存储），提取结束后删除原图，不永久保留。上传完成后即可离开，云端继续提取与解读。长期只存结构化特征与报告。',
          '本機保留可查看的左掌、右掌與面部草稿。為提取特徵會短暫上傳到伺服器（短生命週期儲存），提取結束後刪除原圖，不永久保留。上傳完成後即可離開，雲端繼續提取與解讀。長期只存結構化特徵與報告。',
          'Drafts of left palm, right palm, and face stay viewable on this device. For extraction we briefly upload to our servers (short-lived storage), then delete the originals — not kept permanently. After upload you may leave while the cloud continues. Long-term we store only structured features and reports.',
          '端末には左掌・右掌・顔の確認用下書きを残します。抽出のため短時間サーバー（短寿命ストレージ）へアップロードし、抽出後に原画像を削除します（恒久保存しません）。アップロード後は閉じてもクラウドで抽出と解読が続きます。長期保存は構造化特徴とレポートのみです。'
        )}
      </Text>
      <Text style={{ color: colors.secondary, lineHeight: 22 }}>
        {s(
          '生辰信息用于形气与八字对照，保存在你的账户出生资料中。',
          '生辰資訊用於形氣與八字對照，保存在你的帳戶出生資料中。',
          'Birth details power form-qi × BaZi cross-reference and are stored with your account birth profile.',
          '生辰情報は形気と八字の対照に使われ、アカウントの出生プロフィールに保存されます。'
        )}
      </Text>
      <Text style={{ color: colors.secondary, lineHeight: 22 }}>
        {s(
          '每次解读会更新前瞻事件表；Pro 订阅可用其驱动本地/推送提醒（宜留意的时间窗、月度复拍）。',
          '每次解讀會更新前瞻事件表；Pro 訂閱可用其驅動本地／推送提醒（宜留意的時間窗、月度複拍）。',
          'Each reading refreshes a forward event table. Pro may use it for local/push reminders (windows worth noting, monthly re-capture).',
          '各解読で前瞻イベント表が更新されます。Pro ではローカル／プッシュリマインダー（留意すべき時間窗、月次の再撮影）に利用できます。'
        )}
      </Text>
      <Pressable onPress={() => void Linking.openURL(url)}>
        <Text style={{ color: colors.accent, lineHeight: 22 }}>
          {s(
            '完整隐私附录（网页）→',
            '完整隱私附錄（網頁）→',
            'Full privacy appendix (web) →',
            '完全なプライバシー付録（Web）→'
          )}
        </Text>
      </Pressable>
    </ScrollView>
  )
}
