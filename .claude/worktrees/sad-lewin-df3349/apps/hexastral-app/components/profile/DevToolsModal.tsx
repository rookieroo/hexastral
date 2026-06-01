/**
 * Dev Tools 模态
 *
 * 仅在 __DEV__ 或 @hexastral.com 邮箱用户可见.
 * 提供 DDL Token 注入、查看 BirthInfo、清空 AsyncStorage 等开发期工具.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useState } from 'react'
import { Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { clearBirthInfoCache } from '@/lib/domain/birthInfo'
import { injectDDLToken, resetDDLState } from '@/lib/domain/ddl'
import { useIosPalette } from '@/lib/theme'

interface DevToolsModalProps {
  visible: boolean
  onClose: () => void
  birthInfoSnapshot: string
  onResetAccount: () => Promise<void>
}

export function DevToolsModal({ visible, onClose, birthInfoSnapshot, onResetAccount }: DevToolsModalProps) {
  const ios = useIosPalette()
  const [ddlTokenInput, setDdlTokenInput] = useState('')

  const handleInjectDDL = useCallback(async () => {
    if (!ddlTokenInput.trim()) {
      Alert.alert('Dev', 'Please enter a DDL Token')
      return
    }
    const payload = await injectDDLToken(ddlTokenInput.trim())
    if (payload) {
      Alert.alert('Dev', `DDL restored!\n${JSON.stringify(payload, null, 2)}`)
      setDdlTokenInput('')
      onClose()
    } else {
      Alert.alert('Dev', 'DDL claim failed — token not found or expired')
    }
  }, [ddlTokenInput, onClose])

  const handleClearState = useCallback(async () => {
    clearBirthInfoCache()
    await AsyncStorage.clear()
    await resetDDLState()
    // Delete the D1 user row so the username is released and onboarding is truly fresh
    await onResetAccount().catch(() => null)
    Alert.alert('Dev', 'All state cleared. Restart app to re-test onboarding.')
    onClose()
  }, [onClose, onResetAccount])

  return (
    <Modal visible={visible} animationType='slide' presentationStyle='pageSheet'>
      <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: ios.text }}>Developer Tools</Text>
          <Pressable onPress={onClose}>
            <Text style={{ fontSize: 15, color: ios.tint }}>Close</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* DDL Token Injection */}
          <SectionTitle>DDL TOKEN INJECTION</SectionTitle>
          <View
            style={{
              backgroundColor: ios.card,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <TextInput
              value={ddlTokenInput}
              onChangeText={setDdlTokenInput}
              placeholder='Paste DDL Token from H5...'
              placeholderTextColor={ios.secondary}
              style={{
                fontSize: 14,
                color: ios.text,
                backgroundColor: ios.bg,
                borderRadius: 8,
                padding: 10,
                marginBottom: 10,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              }}
              autoCapitalize='none'
              autoCorrect={false}
            />
            <Pressable
              onPress={handleInjectDDL}
              style={{
                backgroundColor: ios.tint,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: ios.tintFg }}>
                Claim DDL Token
              </Text>
            </Pressable>
          </View>

          {/* Current BirthInfo */}
          <SectionTitle>CURRENT BIRTH INFO</SectionTitle>
          <View
            style={{
              backgroundColor: ios.card,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: ios.secondary,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                lineHeight: 18,
              }}
            >
              {birthInfoSnapshot || '(empty)'}
            </Text>
          </View>

          {/* Danger zone */}
          <SectionTitle>DANGER ZONE</SectionTitle>
          <View
            style={{
              backgroundColor: ios.card,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Pressable
              onPress={handleClearState}
              style={{
                backgroundColor: ios.destructive,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFF' }}>
                Clear All State + Reset DDL
              </Text>
            </Pressable>
            <Text style={{ fontSize: 11, color: ios.secondary, marginTop: 8, textAlign: 'center' }}>
              Clears AsyncStorage, BirthInfo cache, DDL claimed flag.{'\n'}Restart app to re-test
              full onboarding flow.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function SectionTitle({ children }: { children: string }) {
  const ios = useIosPalette()
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: ios.sectionLabel,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  )
}
