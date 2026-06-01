/**
 * 念头 Thought — Quick journal / feedback / reflection entry
 *
 * Minimal fullscreen text input. Saves to AsyncStorage as timestamped entries.
 * Future: sync to backend, AI interpretation based on natal chart.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

const THOUGHTS_KEY = 'hexastral_thoughts'

interface ThoughtEntry {
  id: string
  text: string
  createdAt: string
}

export default function ThoughtScreen() {
  const { colors } = useTheme()
  const { t } = useI18n()
  const router = useRouter()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = text.trim().length > 0

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return
    setSaving(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const entry: ThoughtEntry = {
      id: `thought_${Date.now()}`,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }

    const raw = await AsyncStorage.getItem(THOUGHTS_KEY)
    const existing: ThoughtEntry[] = raw ? JSON.parse(raw) : []
    existing.unshift(entry)
    // Keep last 200 entries
    if (existing.length > 200) existing.length = 200
    await AsyncStorage.setItem(THOUGHTS_KEY, JSON.stringify(existing))

    setSaving(false)
    router.back()
  }, [canSave, saving, text, router])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header bar */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ fontSize: 14, fontWeight: '300', color: colors.textSecondary }}>
              {t('cancel')}
            </Text>
          </Pressable>

          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: colors.textSecondary,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            {t('thought_title')}
          </Text>

          <Pressable onPress={handleSave} disabled={!canSave || saving} hitSlop={12}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: canSave ? colors.accent : `${colors.textSecondary}40`,
                letterSpacing: 2,
              }}
            >
              {t('thought_save')}
            </Text>
          </Pressable>
        </View>

        {/* Text input area */}
        <Pressable
          style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}
          onPress={() => Keyboard.dismiss()}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('thought_placeholder')}
            placeholderTextColor={`${colors.textSecondary}60`}
            multiline
            autoFocus
            textAlignVertical='top'
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: '300',
              color: colors.text,
              lineHeight: 26,
            }}
          />
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
