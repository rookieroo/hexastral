export type DreamPreviewOutput = {
  interpretation?: string
}

export type DreamPreviewSuccess = {
  readingId: string
  output: DreamPreviewOutput
}

export type DreamScenarioApi = {
  runPreview: (dreamText: string, locale: string) => Promise<DreamPreviewSuccess>
}

export type DreamDescribeStrings = {
  title: string
  placeholder: string
  cta: string
  back: string
  minHint: string
  loading: string
  errorGeneric: string
}

export type DreamScenarioPalette = {
  background: string
  text: string
  textSecondary: string
  border: string
  accent: string
  card: string
  /** Text on filled accent CTA (e.g. from `tintFg`); improves contrast on cinnabar/accent fills. */
  ctaOnAccent?: string
}
