import { Share2 } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { shareFengChapter } from '@/lib/share'
import { useFengTheme } from '@/lib/theme'

export interface ShareFengChapterButtonProps {
  reportId: string
  chapterKind: string
  chapterTitle: string
  contentJson: string
}

export function ShareFengChapterButton({
  reportId,
  chapterKind,
  chapterTitle,
  contentJson,
}: ShareFengChapterButtonProps) {
  const { colors } = useFengTheme()
  const t = useStrings(resolveLocale())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const accent = colors.accent

  const handlePress = async () => {
    if (busy) return
    setErr(null)
    setBusy(true)
    try {
      await shareFengChapter({
        reportId,
        chapterKind,
        title: chapterTitle,
        contentJson,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View>
      <Pressable
        accessibilityRole='button'
        onPress={handlePress}
        disabled={busy}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderWidth: 0.5,
          borderColor: accent,
          borderRadius: 8,
          backgroundColor: 'transparent',
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Share2 size={14} color={accent} />
        <Text
          style={{
            color: accent,
            fontSize: 12,
            fontWeight: '500',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {busy ? t.share_pending : t.share_chapter}
        </Text>
      </Pressable>
      {err ? (
        <Text
          style={{
            color: colors.warning,
            fontSize: 11,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {err === 'share_requires_signed_in_user' ? t.share_needs_signin : t.err_generic}
        </Text>
      ) : null}
    </View>
  )
}
