import { z } from 'zod/v4'

export const LANTAI_TEMPLATE_IDS = ['custom', 'journal', 'inbox', 'bookmark', 'habit'] as const
export type LantaiTemplateId = (typeof LANTAI_TEMPLATE_IDS)[number]

/** Empty: Lantai v1 is manual Shortcuts only. AI ingest is a separate app. */
export const LANTAI_AI_TEMPLATES: ReadonlySet<LantaiTemplateId> = new Set()

export const LANTAI_SHORTCUT_NAME = 'Lantai'
export const LANTAI_SHORTCUT_VERSION = 1

/** Property types the shortcut can write. Formula / rollup / relation stay out of v1. */
export const LANTAI_WRITABLE_PROPERTY_TYPES = [
  'title',
  'rich_text',
  'number',
  'select',
  'multi_select',
  'status',
  'date',
  'checkbox',
  'url',
  'email',
  'phone_number',
  'files',
] as const

export type LantaiWritablePropertyType = (typeof LANTAI_WRITABLE_PROPERTY_TYPES)[number]

const WRITABLE = new Set<string>(LANTAI_WRITABLE_PROPERTY_TYPES)

export function modeForTemplate(templateId: LantaiTemplateId): 'manual' | 'ai' {
  return LANTAI_AI_TEMPLATES.has(templateId) ? 'ai' : 'manual'
}

export function isWritableNotionPropertyType(type: string): type is LantaiWritablePropertyType {
  return WRITABLE.has(type)
}

export interface NotionPropertyInput {
  id: string
  type: string
  name?: string
}

/**
 * Map a Notion database `properties` object onto shortcut fields.
 * Keys are property names (2022-06-28 retrieve). Title stays first and enabled.
 */
export function fieldsFromNotionProperties(
  properties: Record<string, NotionPropertyInput>
): Array<{ id: string; name: string; type: string; enabled: boolean }> {
  const fields: Array<{ id: string; name: string; type: string; enabled: boolean }> = []
  for (const [key, prop] of Object.entries(properties)) {
    if (!isWritableNotionPropertyType(prop.type)) continue
    const name = (prop.name ?? key).trim() || key
    fields.push({
      id: prop.id.slice(0, 64),
      name: name.slice(0, 80),
      type: prop.type,
      enabled: true,
    })
  }
  fields.sort((a, b) => {
    if (a.type === 'title' && b.type !== 'title') return -1
    if (b.type === 'title' && a.type !== 'title') return 1
    return a.name.localeCompare(b.name)
  })
  return fields
}

const lantaiFieldSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  type: z.string().min(1).max(40),
  enabled: z.boolean(),
})

export const lantaiCommandSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(80),
  templateId: z.enum(LANTAI_TEMPLATE_IDS),
  databaseId: z.string().min(1).max(64),
  icon: z.string().max(40).optional(),
  theme: z.string().max(40).optional(),
  fields: z.array(lantaiFieldSchema).max(50),
})

export type LantaiCommand = z.infer<typeof lantaiCommandSchema>

export const lantaiCreateSchema = z.object({
  connectionId: z.string().min(1).max(64),
  command: lantaiCommandSchema,
})

export const lantaiUpdateSchema = z.object({
  command: lantaiCommandSchema,
})

export const lantaiDatabaseIdParam = z
  .string()
  .regex(/^[a-fA-F0-9-]{32,36}$/, 'Invalid Notion database id')
