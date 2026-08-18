import { z } from 'zod/v4'

export const LANTAI_TEMPLATE_IDS = ['journal', 'inbox', 'bookmark', 'habit', 'ledger'] as const
export type LantaiTemplateId = (typeof LANTAI_TEMPLATE_IDS)[number]

export const LANTAI_AI_TEMPLATES: ReadonlySet<LantaiTemplateId> = new Set(['ledger'])

export const LANTAI_SHORTCUT_NAME = 'Lantai'
export const LANTAI_SHORTCUT_VERSION = 1

export function modeForTemplate(templateId: LantaiTemplateId): 'manual' | 'ai' {
  return LANTAI_AI_TEMPLATES.has(templateId) ? 'ai' : 'manual'
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
