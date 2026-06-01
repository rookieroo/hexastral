export interface ChapterUserTraits {
  dayMasterStem?: string | null
  dayMasterStrength?: string | null
  favorableElement?: string | null
  unfavorableElement?: string | null
  ziweiMingPalaceStar?: string | null
  birthBranch?: string | null
}

export interface ChapterTimeContext {
  liunian?: string | null
  dayun?: string | null
}

export interface ChapterPromptContext {
  user: ChapterUserTraits
  timeContext: ChapterTimeContext | null
  perspectiveSeed?: string
  /**
   * Pre-built rich facts block (multi-line Chinese) covering the full natal +
   * stellar chart. When present, supersedes the thin `user`/`timeContext`
   * blocks so chapter prompts can quote concrete star/pillar/dayun details
   * instead of emitting `[具体X]` placeholders.
   */
  richFacts?: string
}
