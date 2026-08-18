import type { LantaiCommand } from './lantai-command'
import { LANTAI_SHORTCUT_NAME, LANTAI_SHORTCUT_VERSION } from './lantai-command'

export interface LantaiSecretLinkPayload {
  id: string
  mode: 'manual' | 'ai'
  shortcutName: typeof LANTAI_SHORTCUT_NAME
  shortcutVersion: typeof LANTAI_SHORTCUT_VERSION
  command: LantaiCommand
  /** Present only for manual mode. Never attach for AI configs. */
  notionToken?: string
}

export function buildSecretLinkPayload(input: {
  id: string
  mode: 'manual' | 'ai'
  command: LantaiCommand
  notionToken: string | null
}): LantaiSecretLinkPayload {
  const base: LantaiSecretLinkPayload = {
    id: input.id,
    mode: input.mode,
    shortcutName: LANTAI_SHORTCUT_NAME,
    shortcutVersion: LANTAI_SHORTCUT_VERSION,
    command: input.command,
  }
  if (input.mode === 'ai') return base
  if (!input.notionToken) return base
  return { ...base, notionToken: input.notionToken }
}
