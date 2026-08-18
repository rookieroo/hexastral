import { useTheme } from '@zhop/core-ui'
import { getPortfolioUserId } from '@zhop/satellite-runtime'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  createConfig,
  getDatabaseSchema,
  listConfigs,
  listConnections,
  listDatabases,
  updateConfig,
  type NotionDatabaseOption,
} from '@/lib/api'
import {
  buildCommand,
  isTemplateId,
  mergeNotionFields,
  starterName,
  type LantaiFieldSpec,
  type LantaiTemplateId,
} from '@/lib/config-gen'
import { useSatelliteI18n } from '@/lib/i18n'

export default function LantaiConfigScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t, templateLabel } = useSatelliteI18n()
  const { id, template } = useLocalSearchParams<{ id: string; template?: string }>()
  const isNew = id === 'new'
  const templateId: LantaiTemplateId = isTemplateId(template) ? template : 'custom'

  const [name, setName] = useState(starterName(templateId) ?? '')
  const [nameTouched, setNameTouched] = useState(Boolean(starterName(templateId)))
  const [savedTemplateId, setSavedTemplateId] = useState<LantaiTemplateId>(templateId)
  const [databases, setDatabases] = useState<NotionDatabaseOption[]>([])
  const [databaseId, setDatabaseId] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [fields, setFields] = useState<LantaiFieldSpec[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const savedFieldsRef = useRef<LantaiFieldSpec[] | undefined>(undefined)
  const nameTouchedRef = useRef(nameTouched)
  nameTouchedRef.current = nameTouched

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

      if (!isNew) {
        const existing = (await listConfigs()).find((row) => row.id === id)
        if (existing) {
          savedFieldsRef.current = existing.command.fields
          setSavedTemplateId(existing.command.templateId)
          setName(existing.command.name)
          setNameTouched(true)
          setDatabaseId(existing.databaseId)
        }
      }
    })()
  }, [id, isNew, router])

  useEffect(() => {
    if (!connectionId || !databaseId) {
      setFields([])
      return
    }
    void (async () => {
      const schema = await getDatabaseSchema(connectionId, databaseId)
      if (!schema) {
        setFields([])
        setError(t('configNeedDb'))
        return
      }
      setError(null)
      setFields(mergeNotionFields(schema.fields, savedFieldsRef.current))
      if (!nameTouchedRef.current) setName(schema.title)
    })()
  }, [connectionId, databaseId, t])

  const onSave = async () => {
    if (!connectionId || !databaseId) {
      setError(t('configNeedDb'))
      return
    }
    if (!name.trim()) {
      setError(t('configNeedName'))
      return
    }
    if (!fields.some((f) => f.enabled)) {
      setError(t('configNeedFields'))
      return
    }
    setBusy(true)
    setError(null)
    const command = buildCommand({
      templateId: isNew ? templateId : savedTemplateId,
      databaseId,
      name: name.trim(),
      fields,
    })
    try {
      const saved = isNew
        ? await createConfig({ connectionId, command })
        : await updateConfig(id, command)
      if (!saved) {
        setError(t('connectFail'))
        return
      }
      router.replace(`/install?configId=${encodeURIComponent(saved.id)}`)
    } finally {
      setBusy(false)
    }
  }

  const toggleField = (fieldId: string) => {
    setFields((current) =>
      current.map((field) => {
        if (field.id !== fieldId) return field
        if (field.type === 'title') return field
        return { ...field, enabled: !field.enabled }
      })
    )
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
      <Text style={{ color: colors.secondary, fontSize: 15 }}>{t('configLead')}</Text>
      {templateId !== 'custom' ? (
        <Text style={{ color: colors.dim, fontSize: 13 }}>{templateLabel(templateId)}</Text>
      ) : null}

      <Text style={{ color: colors.secondary, fontSize: 13 }}>{t('configName')}</Text>
      <TextInput
        value={name}
        onChangeText={(value) => {
          setNameTouched(true)
          setName(value)
        }}
        style={{
          borderWidth: 0.5,
          borderRadius: 0,
          borderColor: colors.separator,
          color: colors.text,
          padding: spacing.md,
        }}
      />

      <Text style={{ color: colors.secondary, fontSize: 13 }}>{t('configDatabase')}</Text>
      {databases.length === 0 ? (
        <Text style={{ color: colors.secondary }}>{t('configNoDb')}</Text>
      ) : null}
      {databases.map((db) => (
        <Pressable
          key={db.id}
          onPress={() => {
            savedFieldsRef.current = undefined
            setDatabaseId(db.id)
          }}
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

      {fields.length > 0 ? (
        <Text style={{ color: colors.secondary, fontSize: 13 }}>{t('configFields')}</Text>
      ) : null}
      {fields.map((field) => (
        <Pressable
          key={field.id}
          onPress={() => toggleField(field.id)}
          style={{
            borderWidth: 0.5,
            borderRadius: 0,
            borderColor: colors.separator,
            backgroundColor: colors.card,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
            opacity: field.enabled ? 1 : 0.55,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 16 }}>{field.name}</Text>
            <Text style={{ color: colors.dim, fontSize: 13 }}>{field.type}</Text>
          </View>
          {field.enabled ? <Check color={colors.text} size={18} /> : null}
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
