/**
 * (new-site)/address — step 1 of 4.
 *
 * V1 keeps this simple: text input + a "Use current location" button. The
 * draft accumulates `lat`, `lng`, `formattedAddress`. Mapbox forward
 * geocoding is wired through /api/geocode in V1.1; for now the user can
 * type any address and we forward-geocode via expo-location on iOS.
 */

import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t, useStrings } from '@/lib/i18n'
import { loadDraft, patchDraft } from '@/lib/siteDraft'
import { spacing, useFengTheme } from '@/lib/theme'

export default function AddressScreen() {
  const router = useRouter()
  const { colors } = useFengTheme()
  const locale = resolveLocale()
  const strings = useStrings(locale)
  const insets = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)

  const useCurrentLocation = async () => {
    setBusy(true)
    setGeocodeError(null)
    try {
      const perm = await Location.requestForegroundPermissionsAsync()
      if (perm.status !== 'granted') return
      const pos = await Location.getCurrentPositionAsync({})
      let formatted = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        const first = reverse[0]
        if (first) {
          formatted = [first.streetNumber, first.street, first.city, first.region, first.country]
            .filter(Boolean)
            .join(', ')
        }
      } catch {
        // reverse geocode is best-effort; fall back to raw coords
      }
      setAddress(formatted)
      await patchDraft({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        formattedAddress: formatted,
      })
    } finally {
      setBusy(false)
    }
  }

  const next = async () => {
    if (!address.trim()) return
    setGeocodeError(null)
    setBusy(true)
    try {
      const existing = await loadDraft()
      let lat = existing.lat
      let lng = existing.lng

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        const results = await Location.geocodeAsync(address.trim())
        const first = results[0]
        if (!first) {
          setGeocodeError(t(locale, 'new_site_address_geocode_error'))
          return
        }
        lat = first.latitude
        lng = first.longitude
      }

      await patchDraft({
        name: name.trim() || 'My site',
        formattedAddress: address.trim(),
        lat,
        lng,
      })
      router.push('/(new-site)/facing')
    } catch {
      setGeocodeError(t(locale, 'new_site_address_geocode_error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
        backgroundColor: colors.bg,
        flexGrow: 1,
      }}
    >
      <ProgressIndicator step={1} total={4} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>
        {strings.new_site_address_title}
      </Text>
      <Text style={{ fontSize: 15, color: colors.textMute }}>{strings.new_site_address_subtitle}</Text>

      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            fontSize: 12,
            color: colors.textMute,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder='Home / Office / 父母家'
          placeholderTextColor={colors.textMute}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            color: colors.text,
            fontSize: 16,
          }}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            fontSize: 12,
            color: colors.textMute,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Address
        </Text>
        <TextInput
          value={address}
          onChangeText={(text) => {
            setAddress(text)
            setGeocodeError(null)
          }}
          placeholder={strings.new_site_address_placeholder}
          placeholderTextColor={colors.textMute}
          multiline
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            color: colors.text,
            fontSize: 16,
            minHeight: 72,
          }}
        />
      </View>

      {geocodeError ? (
        <Text style={{ color: colors.warning, fontSize: 13 }}>{geocodeError}</Text>
      ) : null}

      <Pressable
        onPress={useCurrentLocation}
        disabled={busy}
        style={{
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.accent,
        }}
      >
        <Text style={{ color: colors.accent, fontWeight: '600' }}>
          {busy ? '…' : 'Use current location'}
        </Text>
      </Pressable>

      <View style={{ flex: 1 }} />

      <Pressable
        onPress={next}
        disabled={!address.trim() || busy}
        style={{
          backgroundColor: address.trim() && !busy ? colors.accent : colors.surfaceMute,
          paddingVertical: spacing.lg,
          borderRadius: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 16 }}>
          {busy ? strings.new_site_address_geocoding : strings.new_site_facing_next}
        </Text>
      </Pressable>
    </ScrollView>
  )
}
