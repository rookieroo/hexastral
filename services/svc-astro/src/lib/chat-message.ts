/** Chat turn shape for svc-astro multi-turn routes (ai-router + /chat). */
export type ChatMessage = {
  role: 'user' | 'model' | 'system' | 'assistant'
  content: string
}
