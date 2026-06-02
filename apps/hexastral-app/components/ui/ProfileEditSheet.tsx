/**
 * ProfileEditSheet — bottom sheet for editing user profile fields.
 *
 * Fields: photo, displayName, username, email (display + verify link).
 * Phone is not edited here (no validation path — contact matching uses hashed device contacts).
 * Uses @gorhom/bottom-sheet with snap points at 70% and 90%.
 */

import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { Camera, CheckCircle, ChevronRight, History, XCircle } from 'lucide-react-native'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { DefaultAvatar } from '@/components/ui/DefaultAvatar'
import { useAuth } from '@/lib/auth'
import { config } from '@/lib/config'
import type { UseProfileResult } from '@/lib/domain/profile'
import { signRequest } from '@/lib/hmac'
import { type UsernameStatus, useUsernameAvailability } from '@/lib/hooks/useUsernameAvailability'
import type { TranslationKeys } from '@/lib/i18n'
import { storage } from '@/lib/storage'
import { type ThemeColors, useIosPalette } from '@/lib/theme'

interface Props {
  visible: boolean
  onClose: () => void | Promise<void>
  profile: UseProfileResult
  email: string | null
  colors: ThemeColors
  isDark: boolean
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string
  /**
   * Saved username at sheet open (prefer server). Passed from parent so the first
   * paint matches duplicate-check baseline and avoids a false `taken` flash.
   */
  usernameAvailabilityBaseline?: string
}

export default function ProfileEditSheet({
  visible,
  onClose,
  profile: { profile, setProfile, saveProfile, avatarIndex, photoUri },
  email,
  colors,
  isDark,
  t,
  usernameAvailabilityBaseline = '',
}: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const ios = useIosPalette()
  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['70%', '92%'], [])
  const [showHistory, setShowHistory] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const effectiveUsernameBaseline = (usernameAvailabilityBaseline || profile.username || '').trim()

  // Track the username at open time so flush/skip logic matches server baseline
  const savedUsernameRef = useRef<string>(effectiveUsernameBaseline)
  const usernameStatusRef = useRef<UsernameStatus>('idle')

  const usernameStatus = useUsernameAvailability(profile.username, effectiveUsernameBaseline)
  usernameStatusRef.current = usernameStatus

  useLayoutEffect(() => {
    if (!visible) return
    savedUsernameRef.current = effectiveUsernameBaseline
  }, [visible, effectiveUsernameBaseline])

  // Always save the latest editable text fields when the sheet closes — onBlur
  // is unreliable when the sheet dismisses while a TextInput still has focus
  // (the keyboard tear-down race can drop the blur event in iOS).
  const handleClose = useCallback(async () => {
    const flush: Partial<typeof profile> = {
      displayName: profile.displayName,
      name: profile.name,
    }

    let wait = 0
    while (
      wait < 30 &&
      profile.username !== savedUsernameRef.current &&
      usernameStatusRef.current === 'checking'
    ) {
      await new Promise<void>((r) => setTimeout(r, 50))
      wait++
    }

    if (
      profile.username !== savedUsernameRef.current &&
      usernameStatusRef.current !== 'taken' &&
      usernameStatusRef.current !== 'invalid' &&
      usernameStatusRef.current !== 'checking'
    ) {
      flush.username = profile.username
    }

    const ok = await saveProfile(flush)
    if (!ok) {
      Alert.alert(t('profile_save_failed_title'), t('profile_save_failed_body'))
      sheetRef.current?.snapToIndex(0)
      return
    }
    if (flush.username !== undefined) savedUsernameRef.current = profile.username ?? ''
    await Promise.resolve(onClose())
  }, [profile.displayName, profile.name, profile.username, saveProfile, onClose, t])

  const blockPanCloseWhileChecking =
    profile.username !== savedUsernameRef.current && usernameStatus === 'checking'

  // Update saved ref whenever a username save actually completes
  const handleUsernameSave = useCallback(() => {
    // Don't persist a username that is taken or invalid — visual indicator is shown
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return
    saveProfile({ username: profile.username }).then(() => {
      savedUsernameRef.current = profile.username ?? ''
    })
  }, [profile.username, saveProfile, usernameStatus])

  const handlePickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const newUri = asset.uri
      const base64Data = asset.base64

      // Push current photo to history before overwriting
      if (photoUri) {
        const raw = storage.getString('hexastral_avatar_history')
        const history: string[] = raw ? JSON.parse(raw) : []
        if (!history.includes(photoUri)) {
          history.unshift(photoUri)
          storage.set('hexastral_avatar_history', JSON.stringify(history.slice(0, 20)))
        }
      }

      // Optimistic visual update
      saveProfile({ photoUri: newUri })

      if (user?.id && base64Data) {
        setIsUploading(true)
        try {
          const mimeType = asset.mimeType ?? 'image/jpeg'
          const payload = {
            type: 'avatar',
            mimeType,
            base64Data,
          }
          const body = JSON.stringify(payload)
          const path = '/api/media/upload-json'
          const sig = await signRequest({ body, userId: user.id, method: 'POST', path })

          if (sig) {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user.id}`,
              ...sig,
            }

            const res = await fetch(`${config.apiUrl}${path}`, {
              method: 'POST',
              headers,
              body,
            })

            if (res.ok) {
              const data = await res.json()
              if (data.key) {
                // Update profile with confirmed key and proxy url
                saveProfile({ photoUri: data.url, avatarKey: data.key })
              }
            } else {
              console.warn(
                '[ProfileEditSheet] Error uploading avatar:',
                res.status,
                await res.text().catch(() => '')
              )
            }
          }
        } catch (err) {
          console.error('[ProfileEditSheet] Upload exception:', err)
        } finally {
          setIsUploading(false)
        }
      }
    }
  }, [photoUri, saveProfile, user?.id])

  const handleRestoreFromHistory = useCallback(
    (uri: string) => {
      // Push current to history before restoring
      if (photoUri && photoUri !== uri) {
        const raw = storage.getString('hexastral_avatar_history')
        const history: string[] = raw ? JSON.parse(raw) : []
        if (!history.includes(photoUri)) {
          history.unshift(photoUri)
          storage.set('hexastral_avatar_history', JSON.stringify(history.slice(0, 20)))
        }
      }
      saveProfile({ photoUri: uri })
      setShowHistory(false)
    },
    [photoUri, saveProfile]
  )

  const avatarHistory: string[] = useMemo(() => {
    const raw = storage.getString('hexastral_avatar_history')
    return raw ? JSON.parse(raw) : []
  }, []) // re-read when toggling history panel

  const cardBg = isDark ? colors.card : '#FFFFFF'
  const separatorColor = isDark ? colors.surfaceSecondary : '#E4E4E7'
  const secondaryText = colors.textSecondary

  if (!visible) return null

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={!blockPanCloseWhileChecking}
      onClose={() => {
        void handleClose()
      }}
      backgroundStyle={{ backgroundColor: isDark ? colors.card : '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: secondaryText }}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* Header */}
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: colors.text,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          {t('you_profile_edit')}
        </Text>

        {/* Avatar */}
        <View style={{ alignSelf: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={handlePickPhoto}>
            <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden' }}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: 80, height: 80 }} />
              ) : (
                <DefaultAvatar index={avatarIndex} size={80} />
              )}
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isUploading ? (
                <ActivityIndicator size='small' color={isDark ? '#18181B' : '#FFFFFF'} />
              ) : (
                <Camera size={14} color={isDark ? '#18181B' : '#FFFFFF'} strokeWidth={1.5} />
              )}
            </View>
          </TouchableOpacity>
          {avatarHistory.length > 0 ? (
            <TouchableOpacity
              onPress={() => setShowHistory((v) => !v)}
              style={{
                marginTop: 10,
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <History size={12} color={secondaryText} strokeWidth={1.5} />
              <Text style={{ fontSize: 12, color: secondaryText }}>{t('you_avatar_history')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Avatar history grid */}
        {showHistory && avatarHistory.length > 0 ? (
          <View style={{ marginBottom: 24 }}>
            <FlatList
              data={avatarHistory}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleRestoreFromHistory(item)}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      overflow: 'hidden',
                      borderWidth: 0.5,
                      borderColor: separatorColor,
                    }}
                  >
                    <Image source={{ uri: item }} style={{ width: 56, height: 56 }} />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : null}

        {/* Fields card */}
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 0,
            overflow: 'hidden',
          }}
        >
          {/* 姓名 (real name) — written to users.name, used as divination/命理 input.
              Distinct from 昵称/displayName. Seeded from onboarding NameStep. */}
          <FieldRow
            label={t('profile_real_name_label')}
            separatorColor={separatorColor}
            labelColor={colors.text}
          >
            <TextInput
              style={{ flex: 1, fontSize: 16, color: colors.text, textAlign: 'right' }}
              value={profile.name}
              placeholder={t('settings_real_name_placeholder')}
              placeholderTextColor={secondaryText}
              onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))}
              onBlur={() => saveProfile({ name: profile.name })}
              returnKeyType='done'
            />
          </FieldRow>

          {/* Name */}
          <FieldRow
            label={t('settings_name')}
            separatorColor={separatorColor}
            labelColor={colors.text}
          >
            <TextInput
              style={{ flex: 1, fontSize: 16, color: colors.text, textAlign: 'right' }}
              value={profile.displayName}
              placeholder={t('settings_name_placeholder')}
              placeholderTextColor={secondaryText}
              onChangeText={(v) => setProfile((p) => ({ ...p, displayName: v }))}
              onBlur={() => saveProfile({ displayName: profile.displayName })}
              returnKeyType='done'
            />
          </FieldRow>

          {/* Username */}
          <FieldRow
            label={t('settings_username')}
            separatorColor={separatorColor}
            labelColor={colors.text}
          >
            <TextInput
              style={{ flex: 1, fontSize: 16, color: colors.text, textAlign: 'right' }}
              value={profile.username}
              placeholder='username'
              placeholderTextColor={secondaryText}
              autoCapitalize='none'
              autoCorrect={false}
              onChangeText={(v) => {
                const sanitized = v.toLowerCase().replace(/[^a-z0-9_]/g, '')
                setProfile((p) => ({ ...p, username: sanitized }))
              }}
              onBlur={handleUsernameSave}
              returnKeyType='done'
            />
            {usernameStatus === 'checking' ? (
              <ActivityIndicator size='small' color={secondaryText} style={{ marginLeft: 6 }} />
            ) : usernameStatus === 'available' ? (
              <CheckCircle
                size={16}
                color={colors.accent}
                strokeWidth={1.5}
                style={{ marginLeft: 6 }}
              />
            ) : usernameStatus === 'taken' ? (
              <XCircle
                size={16}
                color={ios.destructive}
                strokeWidth={1.5}
                style={{ marginLeft: 6 }}
              />
            ) : null}
          </FieldRow>

          {/* Phone */}
          {/* Email */}
          <TouchableOpacity
            onPress={() => {
              onClose()
              setTimeout(() => router.push('/email-verify'), 300)
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 16, color: colors.text }}>{t('settings_email')}</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 16, color: secondaryText, marginRight: 6 }}>
              {email ?? t('settings_email_add')}
            </Text>
            <ChevronRight size={16} color={secondaryText} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

function FieldRow({
  label,
  separatorColor,
  labelColor,
  children,
}: {
  label: string
  separatorColor: string
  labelColor: string
  children: React.ReactNode
}) {
  return (
    <View
      style={{
        borderBottomWidth: 0.5,
        borderBottomColor: separatorColor,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 16, color: labelColor, minWidth: 60 }}>{label}</Text>
        {children}
      </View>
    </View>
  )
}
