import type { FengChapterKind } from '@zhop/scenario-feng'
import { Share2 } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Pressable, Share, Text, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'
import { resolveLocale, type Strings, useStrings } from '@/lib/i18n'
import { useFengTheme } from '@/lib/theme'
import { ShareableFengCard } from './ShareableFengCard'

export interface ShareFengChapterButtonProps {
  reportId: string
  chapterKind: string
  chapterTitle: string
  contentJson: string
}

const TAG_BY_KIND: Record<string, keyof Strings> = {
  external_landform: 'chapter_external_landform',
  personal_fit: 'chapter_personal_fit',
  flying_stars: 'chapter_flying_stars',
  annual_directions: 'chapter_annual_directions',
  remediation: 'chapter_remediation',
  auspicious_objects: 'chapter_auspicious_objects',
}

export function ShareFengChapterButton({
  chapterKind,
  chapterTitle,
  contentJson,
}: ShareFengChapterButtonProps) {
  const { colors } = useFengTheme()
  const t = useStrings(resolveLocale())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const cardRef = useRef<View>(null)

  const accent = colors.accent
  const tagKey = TAG_BY_KIND[chapterKind]
  const tag = tagKey ? t[tagKey] : chapterKind
  let goldenLine = ''
  try {
    goldenLine = (JSON.parse(contentJson) as { goldenLine?: string }).goldenLine ?? ''
  } catch {
    // contentJson malformed — card just omits the golden line
  }

  const handlePress = async () => {
    if (busy) return
    setErr(null)
    setBusy(true)
    try {
      // Capture the off-screen 宣纸 card → PNG file → share the IMAGE (not a link).
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 })
      await Share.share({ url: uri, message: chapterTitle })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View>
      <ShareableFengCard
        ref={cardRef}
        kind={chapterKind as FengChapterKind}
        tag={tag}
        title={chapterTitle}
        goldenLine={goldenLine}
        footer='風 · Fēng Shui'
      />
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
        <Text style={{ color: colors.warning, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
          {t.err_generic}
        </Text>
      ) : null}
    </View>
  )
}
