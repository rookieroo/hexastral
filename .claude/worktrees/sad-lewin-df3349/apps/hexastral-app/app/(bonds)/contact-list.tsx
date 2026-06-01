/**
 * Contact List — Request contacts permission, show device contacts
 *
 * Two sections:
 * 1. ON HEXASTRAL — matched users (status: matched)
 * 2. INVITE — contacts not on the app yet
 *
 * Accessible from Bonds tab via "Add Contacts" button.
 *
 * Performance: SectionList (virtualised) replaces ScrollView so only
 * visible rows are rendered — handles thousands of contacts without jank.
 * getItemLayout provides O(1) scroll position calculation.
 */

import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { ArrowLeft, UserPlus } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, SectionList, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { DeviceContact } from '@/lib/domain/contacts'
import { getDeviceContacts } from '@/lib/domain/contacts'
import { sendSMSInvite } from '@/lib/domain/invite'
import { useI18n } from '@/lib/i18n'
import { theme } from '@/lib/theme'

// Row height is fixed — lets getItemLayout skip measurement entirely
const ROW_HEIGHT = 60 // paddingVertical 13×2 + 34 avatar

export default function ContactListScreen() {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const isDark = colorScheme === 'dark'
  const { t } = useI18n()
  const router = useRouter()

  // Zinc palette — matches Ink Brutalism aesthetic
  const ios = useMemo(
    () => ({
      bg: colors.background,
      card: colors.card,
      separator: isDark ? '#27272A' : '#E4E4E7',
      text: colors.text,
      secondary: colors.textSecondary,
      sectionLabel: colors.textSecondary,
      tint: colors.primary,
      accent: colors.accent,
    }),
    [isDark, colors]
  )

  const [contacts, setContacts] = useState<DeviceContact[]>([])
  const [permissionDenied, setPermissionDenied] = useState(false)

  useEffect(() => {
    getDeviceContacts().then(({ granted, contacts: list }) => {
      if (!granted) {
        setPermissionDenied(true)
        return
      }
      setContacts(list)
    })
  }, [])

  const handleInvite = useCallback(
    async (contact: DeviceContact) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await sendSMSInvite(t('bonds_invite_msg'), contact.phoneNumber ?? undefined)
    },
    [t]
  )

  // SectionList data structure
  type Section = { title: string; data: DeviceContact[] }
  const sections = useMemo<Section[]>(() => {
    if (contacts.length > 0) {
      return [{ title: t('contacts_invite_section'), data: contacts }]
    }
    return []
  }, [contacts, t])

  // O(1) layout — avoids measuring each row on scroll
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    []
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: ios.sectionLabel,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 8,
          backgroundColor: ios.bg,
        }}
      >
        {section.title}
      </Text>
    ),
    [ios]
  )

  const renderSectionFooter = useCallback(() => <View style={{ height: 8 }} />, [])

  const renderItem = useCallback(
    ({ item, index, section }: { item: DeviceContact; index: number; section: Section }) => {
      const isLast = index === section.data.length - 1
      const isFirst = index === 0
      return (
        <View
          style={{
            backgroundColor: ios.card,
            marginHorizontal: 16,
            // Round top corners of first row, bottom of last
            borderTopLeftRadius: isFirst ? 14 : 0,
            borderTopRightRadius: isFirst ? 14 : 0,
            borderBottomLeftRadius: isLast ? 14 : 0,
            borderBottomRightRadius: isLast ? 14 : 0,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 13,
              borderBottomWidth: isLast ? 0 : 0.5,
              borderBottomColor: ios.separator,
              minHeight: ROW_HEIGHT,
            }}
          >
            {/* Avatar */}
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: `${ios.tint}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: ios.tint }}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Name */}
            <Text style={{ flex: 1, fontSize: 16, color: ios.text }} numberOfLines={1}>
              {item.name}
            </Text>

            {/* Action */}
            <Pressable
              onPress={() => handleInvite(item)}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <UserPlus size={14} color={ios.tint} strokeWidth={1.2} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: ios.tint,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('contacts_invite_btn')}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      )
    },
    [ios, handleInvite, t]
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: ios.separator,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={ios.text} strokeWidth={1} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: '500',
            color: ios.text,
            letterSpacing: 4,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginRight: 22,
          }}
        >
          {t('contacts_title')}
        </Text>
      </View>

      {permissionDenied ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '300',
              color: ios.secondary,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {t('contacts_permission_denied')}
          </Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '300', color: ios.secondary }}>
            {t('contacts_loading')}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={renderSectionFooter}
          getItemLayout={getItemLayout}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          // Virtualisation tuning — keep window small for huge contact lists
          maxToRenderPerBatch={20}
          initialNumToRender={30}
          windowSize={10}
          removeClippedSubviews
        />
      )}

      {/* Bottom hint */}
      {!permissionDenied && contacts.length > 0 && (
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderTopWidth: 0.5,
            borderTopColor: ios.separator,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '300',
              color: ios.secondary,
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            {t('contacts_hint')}
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}
