/**
 * (new-site)/address — step 1 of 4: locate + orient (address geocode + facing).
 *
 * Phase 1: name + address geocode.
 * Phase 2: satellite facing calibrator (merged from former facing step).
 */

import { Button, useHaptic } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { LocateFixed } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { NewSiteFacingStep } from '@/components/NewSiteFacingStep'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t, useStrings } from '@/lib/i18n'
import { loadDraft, patchDraft } from '@/lib/siteDraft'
import { spacing, useFengTheme } from '@/lib/theme'

type Phase = 'address' | 'orient'

export default function AddressScreen() {
  const router = useRouter()
  const { colors } = useFengTheme()
  const locale = resolveLocale()
  const strings = useStrings(locale)
  const haptic = useHaptic()
  const insets = useSafeAreaInsets()
  const [phase, setPhase] = useState<Phase>('address')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const d = await loadDraft()
      if (d.name) setName(d.name)
      if (d.formattedAddress) setAddress(d.formattedAddress)
      if (typeof d.lat === 'number' && typeof d.lng === 'number' && d.formattedAddress) {
        setPhase('orient')
      }
    })()
  }, [])

  const captureCurrentLocation = async () => {
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
        // reverse geocode is best-effort
      }
      setAddress(formatted)
      await patchDraft({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        geocodeLat: pos.coords.latitude,
        geocodeLng: pos.coords.longitude,
        buildingCenterNorm: { x: 0.5, y: 0.5 },
        formattedAddress: formatted,
      })
    } finally {
      setBusy(false)
    }
  }

  const confirmAddress = async () => {
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
        name: name.trim() || strings.new_site_default_name,
        formattedAddress: address.trim(),
        lat,
        lng,
        geocodeLat: lat,
        geocodeLng: lng,
        buildingCenterNorm: { x: 0.5, y: 0.5 },
      })
      setPhase('orient')
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
      {phase === 'address' ? (
        <>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>
            {strings.new_site_address_title}
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMute }}>
            {strings.new_site_address_subtitle}
          </Text>

          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                fontSize: 12,
                color: colors.textMute,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {strings.new_site_address_name_label}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={strings.new_site_address_name_placeholder}
              placeholderTextColor={colors.textMute}
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: spacing.lg,
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
              {strings.new_site_address_field_label}
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
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                color: colors.text,
                fontSize: 16,
                minHeight: 88,
                textAlignVertical: 'top',
              }}
            />
          </View>

          {geocodeError ? (
            <Text style={{ color: colors.warning, fontSize: 13 }}>{geocodeError}</Text>
          ) : null}

          <Pressable
            onPress={() => {
              void haptic('light')
              void captureCurrentLocation()
            }}
            disabled={busy}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.accent,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator size='small' color={colors.accent} />
            ) : (
              <LocateFixed size={16} color={colors.accent} />
            )}
            <Text style={{ color: colors.accent, fontWeight: '600' }}>
              {strings.new_site_address_use_location}
            </Text>
          </Pressable>

          <Button
            variant='primary'
            size='lg'
            fullWidth
            loading={busy}
            disabled={!address.trim() || busy}
            onPress={confirmAddress}
          >
            {busy ? strings.new_site_address_geocoding : strings.new_site_facing_next}
          </Button>
        </>
      ) : (
        <NewSiteFacingStep onComplete={() => router.push('/(new-site)/building')} />
      )}
    </ScrollView>
  )
}
