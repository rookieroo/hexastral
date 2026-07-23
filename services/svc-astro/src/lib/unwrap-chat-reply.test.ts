import { describe, expect, it } from 'bun:test'
import { unwrapChatReply } from './unwrap-chat-reply'

describe('unwrapChatReply', () => {
  it('returns plain prose unchanged', () => {
    expect(unwrapChatReply('咖啡午前少量可，忌午后浓缩。')).toBe('咖啡午前少量可，忌午后浓缩。')
  })

  it('unwraps fenced {"response":...} envelope (Syel chat bug)', () => {
    const raw = `\`\`\`json
{
  "response": "Coffee can dredge liver qi if taken black before noon."
}
\`\`\``
    expect(unwrapChatReply(raw)).toBe('Coffee can dredge liver qi if taken black before noon.')
  })

  it('unwraps bare {"reply":...} without fence', () => {
    expect(unwrapChatReply('{"reply":"宜留意熬夜与酒酪。"}')).toBe('宜留意熬夜与酒酪。')
  })

  it('leaves non-prose JSON as-is when no known key', () => {
    const raw = '{"foo":"bar"}'
    expect(unwrapChatReply(raw)).toBe(raw)
  })
})
