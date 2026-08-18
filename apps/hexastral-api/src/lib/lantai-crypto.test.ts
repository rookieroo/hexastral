import { describe, expect, it } from 'bun:test'
import { configIdLogToken, decryptAesGcm, encryptAesGcm } from './lantai-crypto'

describe('lantai AES-GCM', () => {
  it('round-trips a Notion-shaped token', async () => {
    const secret = 'test-lantai-token-key'
    const token = 'secret_notion_access_token_value'
    const sealed = await encryptAesGcm(token, secret)
    expect(sealed.ciphertext).not.toContain(token)
    expect(sealed.nonce.length).toBeGreaterThan(8)
    const opened = await decryptAesGcm(sealed.ciphertext, sealed.nonce, secret)
    expect(opened).toBe(token)
  })

  it('hashes config ids for logs', async () => {
    const a = await configIdLogToken('11111111-1111-4111-8111-111111111111')
    const b = await configIdLogToken('11111111-1111-4111-8111-111111111111')
    expect(a).toBe(b)
    expect(a).toHaveLength(8)
    expect(a).not.toContain('11111111')
  })
})
