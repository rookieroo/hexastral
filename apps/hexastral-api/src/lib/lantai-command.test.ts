import { describe, expect, it } from 'bun:test'
import { fieldsFromNotionProperties, lantaiCommandSchema } from './lantai-command'

describe('fieldsFromNotionProperties', () => {
  it('keeps writable properties, drops formula, and puts title first', () => {
    const fields = fieldsFromNotionProperties({
      Tags: { id: 'abc', type: 'multi_select' },
      Name: { id: 'title', type: 'title' },
      Score: { id: 'sc', type: 'formula' },
      Amount: { id: 'amt', type: 'number' },
    })
    expect(fields.map((f) => f.name)).toEqual(['Name', 'Amount', 'Tags'])
    expect(fields.every((f) => f.enabled)).toBe(true)
    expect(fields[0]?.type).toBe('title')
  })

  it('accepts a custom-database command with live fields', () => {
    const parsed = lantaiCommandSchema.parse({
      schemaVersion: 1,
      name: 'Field notes',
      templateId: 'custom',
      databaseId: 'a'.repeat(32),
      fields: [{ id: 'title', name: 'Name', type: 'title', enabled: true }],
    })
    expect(parsed.templateId).toBe('custom')
  })
})
