/**
 * Official v1 templates (4 manual + 1 AI). Extra JSON packs stay out of IA.
 */

export const LANTAI_TEMPLATE_IDS = ['journal', 'inbox', 'bookmark', 'habit', 'ledger'] as const
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
  id: LantaiTemplateId
  mode: LantaiMode
  defaultName: string
  defaultFields: LantaiFieldSpec[]
}

export const LANTAI_TEMPLATES: readonly LantaiTemplateMeta[] = [
  {
    id: 'journal',
    mode: 'manual',
    defaultName: 'Journal',
    defaultFields: [
      { id: 'title', name: 'Title', type: 'title', enabled: true },
      { id: 'body', name: 'Body', type: 'rich_text', enabled: true },
      { id: 'tags', name: 'Tags', type: 'multi_select', enabled: true },
    ],
  },
  {
    id: 'inbox',
    mode: 'manual',
    defaultName: 'Inbox',
    defaultFields: [
      { id: 'title', name: 'Task', type: 'title', enabled: true },
      { id: 'due', name: 'Due', type: 'date', enabled: true },
    ],
  },
  {
    id: 'bookmark',
    mode: 'manual',
    defaultName: 'Links',
    defaultFields: [
      { id: 'title', name: 'Title', type: 'title', enabled: true },
      { id: 'url', name: 'URL', type: 'url', enabled: true },
      { id: 'note', name: 'Note', type: 'rich_text', enabled: true },
    ],
  },
  {
    id: 'habit',
    mode: 'manual',
    defaultName: 'Habits',
    defaultFields: [
      { id: 'title', name: 'Habit', type: 'title', enabled: true },
      { id: 'date', name: 'Date', type: 'date', enabled: true },
    ],
  },
  {
    id: 'ledger',
    mode: 'ai',
    defaultName: 'Ledger',
    defaultFields: [
      { id: 'title', name: 'Merchant', type: 'title', enabled: true },
      { id: 'amount', name: 'Amount', type: 'number', enabled: true },
      { id: 'date', name: 'Date', type: 'date', enabled: true },
    ],
  },
]

export function templateById(id: LantaiTemplateId): LantaiTemplateMeta {
  const found = LANTAI_TEMPLATES.find((t) => t.id === id)
  if (!found) {
    const fallback = LANTAI_TEMPLATES[0]
    if (!fallback) throw new Error('LANTAI_TEMPLATES empty')
    return fallback
  }
  return found
}

export function buildDefaultCommand(
  templateId: LantaiTemplateId,
  databaseId: string,
  name?: string
): LantaiCommand {
  const meta = templateById(templateId)
  return {
    schemaVersion: 1,
    name: name ?? meta.defaultName,
    templateId,
    databaseId,
    fields: meta.defaultFields.map((f) => ({ ...f })),
  }
}
