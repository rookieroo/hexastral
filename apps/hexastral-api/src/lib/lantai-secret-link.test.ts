import { describe, expect, it } from 'bun:test'
import type { LantaiCommand } from './lantai-command'
import { buildSecretLinkPayload } from './lantai-secret-link'

const command: LantaiCommand = {
  schemaVersion: 1,
  name: 'Inbox',
  templateId: 'inbox',
  databaseId: 'abc',
  fields: [{ id: 'title', name: 'Name', type: 'title', enabled: true }],
}

describe('lantai secret-link payload', () => {
  it('omits the Notion token for AI mode even when a token is present', () => {
    const payload = buildSecretLinkPayload({
      id: 'cfg',
      mode: 'ai',
      command: { ...command, templateId: 'ledger' },
      notionToken: 'secret_should_not_leak',
    })
    expect(payload.notionToken).toBeUndefined()
    expect(payload.mode).toBe('ai')
  })

  it('includes the token for manual mode', () => {
    const payload = buildSecretLinkPayload({
      id: 'cfg',
      mode: 'manual',
      command,
      notionToken: 'secret_ok_for_shortcut',
    })
    expect(payload.notionToken).toBe('secret_ok_for_shortcut')
    expect(payload.shortcutName).toBe('Lantai')
  })
})
