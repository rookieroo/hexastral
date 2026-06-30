/**
 * In-app birth info — now the shared core-ui `BirthInfoForm` wizard (the same
 * multi-step flow Yuun/Yuel use), wired to Fēng's HMAC save/geocode. Feng only
 * needs year + gender for 命卦, but collecting the full 八字 set keeps parity with
 * the suite and gives the polished stepped UX. Replaces the old single screen.
 */

import {
  BirthInfoForm,
  type BirthInfoValue,
  birthInfoCopyForLocale,
  type CityRecord,
  useTheme,
} from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { FengMark } from '@/components/FengMark'
import { fetchBirthInfo, saveBirthInfo } from '@/lib/birth-info'
import { searchCity } from '@/lib/geocode'
import { resolveLocale } from '@/lib/i18n'
import { FENG_PALETTE } from '@/lib/theme'

async function searchCityRecords(query: string): Promise<CityRecord[]> {
  const results = await searchCity(query)
  return results.map((c) => ({
    name: c.name,
    country: c.countryCode,
    lat: c.lat,
    lng: c.lon,
    timezone: c.timezone,
    displayName: c.displayName,
  }))
}

export default function BirthInfoScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const locale = resolveLocale()
  const copy = birthInfoCopyForLocale(locale)

  const [value, setValue] = useState<Partial<BirthInfoValue>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const existing = await fetchBirthInfo()
        if (existing && !cancelled) {
          setValue({
            solarDate: existing.birthSolarDate,
            timeIndex: existing.birthTimeIndex as BirthInfoValue['timeIndex'],
            gender: existing.gender,
            city: existing.birthCity,
            lat: existing.birthLatitude ? Number(existing.birthLatitude) : undefined,
            lng: existing.birthLongitude ? Number(existing.birthLongitude) : undefined,
            timezone: existing.birthTimezoneId,
          })
        }
      } catch {
        // fresh entry — leave value empty
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (final: BirthInfoValue) => {
    await saveBirthInfo({
      birthSolarDate: final.solarDate,
      birthTimeIndex: final.timeIndex ?? 0,
      gender: final.gender,
      birthCity: final.city,
      birthLatitude: final.lat != null ? String(final.lat) : undefined,
      birthLongitude: final.lng != null ? String(final.lng) : undefined,
      birthTimezoneId: final.timezone ?? undefined,
    })
    router.back()
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusBar style='light' />
        <ActivityIndicator color={FENG_PALETTE.copperGold} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style='light' />
      <BirthInfoForm
        value={value}
        onChange={(next) => setValue((prev) => ({ ...prev, ...next }))}
        onSubmit={onSubmit}
        accent={FENG_PALETTE.copperGold}
        copy={copy}
        searchCity={searchCityRecords}
        locale={locale}
        requireTime
        placeOptional
        crown={<FengMark size={40} />}
      />
    </View>
  )
}
