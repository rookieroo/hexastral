export type PalmfaceMode = 'face' | 'palm'

export type PalmfacePreviewOutput = {
  features?: Record<string, string>
  aiInterpretation?: Record<string, string>
}

export type PalmfacePreviewSuccess = {
  readingId: string
  output: PalmfacePreviewOutput
}

export type PalmfaceScenarioApi = {
  runPreview: (input: { imageUri?: string; locale: string; mode: PalmfaceMode }) => Promise<PalmfacePreviewSuccess>
}

export type PalmfaceScenarioPalette = {
  background: string
  text: string
  textSecondary: string
  border: string
  accent: string
  card: string
}

export type PalmfaceCaptureStrings = {
  title: string
  body: string
  openCamera: string
  back: string
  statusIdle: string
  statusDenied: string
  statusCancelled: string
  statusWorking: string
  errorGeneric: string
}
