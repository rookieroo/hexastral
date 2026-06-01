/**
 * Contacts — Request permission + fetch device contacts
 *
 * Used by Bonds tab to match existing HexAstral users and invite non-users.
 * Phone numbers are normalized to E.164 before matching.
 */

import * as Contacts from 'expo-contacts'

export interface DeviceContact {
  id: string
  name: string
  phoneNumber: string | null
  image: string | null
}

/** Normalize phone number to digits-only for matching */
function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9+]/g, '')
}

/** Request permission and return device contacts with phone numbers */
export async function getDeviceContacts(): Promise<{
  granted: boolean
  contacts: DeviceContact[]
}> {
  const { status } = await Contacts.requestPermissionsAsync()
  if (status !== 'granted') {
    return { granted: false, contacts: [] }
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
    sort: Contacts.SortTypes.FirstName,
  })

  const result: DeviceContact[] = []
  for (const c of data) {
    const phone = c.phoneNumbers?.[0]?.number
    if (!phone) continue
    result.push({
      id: c.id ?? `${c.name}-${phone}`,
      name: c.name ?? '',
      phoneNumber: normalizePhone(phone),
      image: c.image?.uri ?? null,
    })
  }

  return { granted: true, contacts: result }
}
