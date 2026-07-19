/**
 * Shared preflight before starting a Xingqi reading — no API if photos unchanged.
 */

import { Alert } from 'react-native'

import { isCjkZh, pickZh } from './locale-zh'
import type { ReadingDraft } from './reading-draft'
import {
  loadLastReadingPhotoSnapshot,
  localPhotosUnchangedSinceLastReading,
  saveLastReadingPhotoSnapshot,
} from './reading-photo-stamp'

/** Seed stamp from current files when we have feature ids but no snap yet (upgrade path). */
export async function ensureReadingPhotoSnapshotSeeded(
  draft: ReadingDraft,
  latestReadingId?: string
): Promise<void> {
  const existing = await loadLastReadingPhotoSnapshot()
  if (existing) return
  if (!draft.faceFeatureId || !draft.palmLeftFeatureId || !draft.palmRightFeatureId) return
  if (!draft.palmLeftUri || !draft.palmRightUri || !draft.faceUri) return
  await saveLastReadingPhotoSnapshot({
    draft,
    readingId: latestReadingId ?? 'seed',
  })
}

/**
 * @returns true if the caller should abort (user was prompted / blocked).
 */
export async function alertIfPhotosUnchanged(opts: {
  draft: ReadingDraft
  locale: string
  onUpdatePhotos: () => void
}): Promise<boolean> {
  const { locale } = opts
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const unchanged = await localPhotosUnchangedSinceLastReading(opts.draft)
  if (!unchanged) return false
  Alert.alert(
    s('照片未更新', '照片未更新', 'Photos unchanged'),
    s(
      '本期本机照片与上次解读相同（按文件时间与大小比对）。请先替换左掌 / 右掌 / 面部至少一张，再发起新解读。',
      '本期本機照片與上次解讀相同（按檔案時間與大小比對）。請先替換左掌 / 右掌 / 面部至少一張，再發起新解讀。',
      'On-device photos match your last reading (file time + size). Replace at least one of left palm, right palm, or face before starting again.'
    ),
    [
      { text: s('好', '好', 'OK'), style: 'cancel' },
      {
        text: s('去更新照片', '去更新照片', 'Update photos'),
        onPress: opts.onUpdatePhotos,
      },
    ]
  )
  return true
}
