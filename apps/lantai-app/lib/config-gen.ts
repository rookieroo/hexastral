/**
 * Custom database is the product. Official starters are optional presets.
 */

export const LANTAI_TEMPLATE_IDS = ['custom', 'journal', 'inbox', 'bookmark', 'habit'] as const
export type LantaiTemplateId = (typeof LANTAI_TEMPLATE_IDS)[number]

export type LantaiMode = 'manual' | 'ai'

export interface LantaiFieldSpec {
  id: string
  name: string
  type: string
  enabled: boolean
}

export interface LantaiCommand {
  schemaVersion: 1
  name: string
  templateId: LantaiTemplateId
  databaseId: string
  icon?: string
  theme?: string
  fields: LantaiFieldSpec[]
}

export interface LantaiTemplateMeta {
  id: Exclude<LantaiTemplateId, 'custom'>
  mode: LantaiMode
  defaultName: string
}

export const LANTAI_STARTER_TEMPLATES: readonly LantaiTemplateMeta[] = [
  { id: 'journal', mode: 'manual', defaultName: 'Journal' },
  { id: 'inbox', mode: 'manual', defaultName: 'Inbox' },
  { id: 'bookmark', mode: 'manual', defaultName: 'Links' },
  { id: 'habit', mode: 'manual', defaultName: 'Habits' },
]

export function isTemplateId(value: string | undefined): value is LantaiTemplateId {
  return Boolean(value && (LANTAI_TEMPLATE_IDS as readonly string[]).includes(value))
}

export function starterName(id: LantaiTemplateId): string | null {
  if (id === 'custom') return null
  return LANTAI_STARTER_TEMPLATES.find((t) => t.id === id)?.defaultName ?? null
}

export function mergeNotionFields(
  live: LantaiFieldSpec[],
  saved: LantaiFieldSpec[] | undefined
): LantaiFieldSpec[] {
  if (!saved?.length) return live
  const byId = new Map(saved.map((f) => [f.id, f]))
  const byName = new Map(saved.map((f) => [f.name, f]))
  return live.map((field) => {
    const prev = byId.get(field.id) ?? byName.get(field.name)
    if (!prev) return field
    return {
      ...field,
      enabled: field.type === 'title' ? true : prev.enabled,
    }
  })
}

export function buildCommand(input: {
  templateId: LantaiTemplateId
  databaseId: string
  name: string
  fields: LantaiFieldSpec[]
}): LantaiCommand {
  return {
    schemaVersion: 1,
    name: input.name,
    templateId: input.templateId,
    databaseId: input.databaseId,
    fields: input.fields,
  }
}
