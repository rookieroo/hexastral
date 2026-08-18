import { useTheme } from '@zhop/core-ui'
import { getPortfolioUserId } from '@zhop/satellite-runtime'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { createConfig, listConnections, listDatabases, type NotionDatabaseOption } from '@/lib/api'
import { buildDefaultCommand, LANTAI_TEMPLATE_IDS, type LantaiTemplateId } from '@/lib/config-gen'
import { useSatelliteI18n } from '@/lib/i18n'

function isTemplateId(value: string | undefined): value is LantaiTemplateId {
  return Boolean(value && (LANTAI_TEMPLATE_IDS as readonly string[]).includes(value))
}

export default function LantaiConfigScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t, templateLabel } = useSatelliteI18n()
  const { id, template } = useLocalSearchParams<{ id: string; template?: string }>()
  const templateId: LantaiTemplateId = isTemplateId(template) ? template : 'journal'

  const [name, setName] = useState(templateLabel(templateId))
  const [databases, setDatabases] = useState<NotionDatabaseOption[]>([])
  const [databaseId, setDatabaseId] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const userId = await getPortfolioUserId()
      if (!userId) {
        router.push('/connect')
        return
      }
      const connections = await listConnections()
      const first = connections[0]
      if (!first) {
        router.push('/connect')
        return
      }
      setConnectionId(first.id)
      setDatabases(await listDatabases(first.id))
    })()
  }, [router])

  const onSave = async () => {
    if (!connectionId || !databaseId) {
      setError(t('configNeedDb'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const created = await createConfig({
        connectionId,
        command: buildDefaultCommand(templateId, databaseId, name),
      })
      if (!created) {
        setError(t('connectFail'))
        return
      }
      router.replace(`/install?configId=${encodeURIComponent(created.id)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.md,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '600' }}>
        {t('configTitle')}
      </Text>
      <Text style={{ color: colors.secondary }}>{templateLabel(templateId)}</Text>
      {id !== 'new' ? <Text style={{ color: colors.dim, fontSize: 13 }}>{id}</Text> : null}

      <Text style={{ color: colors.secondary, fontSize: 13 }}>{t('configName')}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 0.5,
          borderRadius: 0,
          borderColor: colors.separator,
          color: colors.text,
          padding: spacing.md,
        }}
      />

      <Text style={{ color: colors.secondary, fontSize: 13 }}>{t('configDatabase')}</Text>
      {databases.map((db) => (
        <Pressable
          key={db.id}
          onPress={() => setDatabaseId(db.id)}
          style={{
            borderWidth: 0.5,
            borderRadius: 0,
            borderColor: databaseId === db.id ? colors.text : colors.separator,
            backgroundColor: colors.card,
            padding: spacing.md,
          }}
        >
          <Text style={{ color: colors.text }}>{db.title}</Text>
        </Pressable>
      ))}

      {error ? <Text style={{ color: colors.secondary }}>{error}</Text> : null}

      <Pressable
        disabled={busy}
        onPress={() => {
          void onSave()
        }}
        style={{
          borderWidth: 0.5,
          borderRadius: 0,
          borderColor: colors.separator,
          backgroundColor: colors.card,
          padding: spacing.md,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16 }}>{t('configSave')}</Text>
      </Pressable>
    </ScrollView>
  )
}
