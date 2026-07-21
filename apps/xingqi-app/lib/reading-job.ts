/**
 * Background face reading job — extract (sync) → enqueue → poll.
 * After enqueue, interpretation is quit-safe on Cloudflare Queues.
 * Home restores via GET /jobs/active + stored jobId.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getPushPermissionStatus, requestPushPermission } from '@zhop/satellite-runtime'
import { Alert, AppState, Linking, type AppStateStatus } from 'react-native'

import {
  type FaceoracleJobPoll,
  type FaceReadingProgress,
  fetchActiveFaceReadingJob,
  getFaceReadingJob,
  isTransientNetworkError,
  pollFaceReadingJob,
  runFaceReading,
} from './api'
import { syncReadingPhotosToICloudIfEnabled } from './icloud-sync-preference'
import { isCjkZh, pickZh } from './locale-zh'
import { getXingqiPushPrefs, setXingqiPushPrefs } from './push-preference'
import { isXingqiPushEnabled, scheduleXingqiPush } from './push-schedule'
import {
  clearReadingDraft,
  getReadingDraft,
  patchReadingDraft,
  type ReadingDraft,
} from './reading-draft'
import { saveLastReadingPhotoSnapshot } from './reading-photo-stamp'
import { snapshotReadingPhotos } from './reading-photos'
import { registerXingqiServerPush } from './server-push'

function zhCopy(locale: string, hans: string, hant: string, en: string): string {
  return isCjkZh(locale) ? pickZh(locale, hans, hant) : en
}

const PENDING_KEY = 'xingqi_reading_job_pending_v1'
const JOB_ID_KEY = 'xingqi_reading_job_id_v1'

export type ReadingJobStatus = 'idle' | 'running' | 'done' | 'error'
export type ReadingJobPhase = 'idle' | 'extracting' | 'queued' | 'interpreting' | 'done' | 'failed'

export interface ReadingJobState {
  status: ReadingJobStatus
  phase: ReadingJobPhase
  startedAt: string | null
  jobId: string | null
  readingId: string | null
  /** Encoded result JSON for /result navigation. */
  resultPayload: string | null
  error: string | null
  progress: number
}

type Listener = (state: ReadingJobState) => void

const listeners = new Set<Listener>()

let state: ReadingJobState = {
  status: 'idle',
  phase: 'idle',
  startedAt: null,
  jobId: null,
  readingId: null,
  resultPayload: null,
  error: null,
  progress: 0,
}

let inFlight: Promise<void> | null = null

function emit() {
  const snap = { ...state }
  for (const fn of listeners) {
    try {
      fn(snap)
    } catch {
      // ignore listener errors
    }
  }
}

function setState(patch: Partial<ReadingJobState>) {
  state = { ...state, ...patch }
  emit()
}

export function getReadingJobState(): ReadingJobState {
  return { ...state }
}

export function subscribeReadingJob(fn: Listener): () => void {
  listeners.add(fn)
  fn({ ...state })
  return () => {
    listeners.delete(fn)
  }
}

async function setPendingFlag(on: boolean, jobId?: string | null): Promise<void> {
  try {
    if (on) {
      await AsyncStorage.setItem(PENDING_KEY, '1')
      if (jobId) await AsyncStorage.setItem(JOB_ID_KEY, jobId)
    } else {
      await AsyncStorage.multiRemove([PENDING_KEY, JOB_ID_KEY])
    }
  } catch {
    // best-effort
  }
}

export async function wasReadingJobPending(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PENDING_KEY)) === '1'
  } catch {
    return false
  }
}

async function loadStoredJobId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(JOB_ID_KEY)
  } catch {
    return null
  }
}

// Local completion banners removed — server Expo push handles reading_ready.

export async function enableReadingCompletionPush(_locale: string): Promise<boolean> {
  const status = await getPushPermissionStatus()
  if (status === 'denied') return false
  const ok = status === 'granted' ? true : await requestPushPermission()
  if (!ok) return false
  await setXingqiPushPrefs({ remindersOn: true })
  return true
}

/**
 * Post-start handoff. Only offers "Notify me" when reminders are off and iOS
 * permission is not already denied.
 */
export async function showReadingStartedHandoff(opts: {
  locale: string
  onDismiss?: () => void
}): Promise<void> {
  const loc = opts.locale
  const prefs = await getXingqiPushPrefs()
  const perm = await getPushPermissionStatus()

  if (prefs.remindersOn || perm === 'granted') {
    if (prefs.remindersOn === false && perm === 'granted') {
      await setXingqiPushPrefs({ remindersOn: true })
    }
    Alert.alert(
      zhCopy(loc, '解读已开始', '解讀已開始', 'Reading started'),
      zhCopy(
        loc,
        '可离开应用。特征提取后会在云端继续解读，完成后通知你。',
        '可離開應用。特徵提取後會在雲端繼續解讀，完成後通知你。',
        'You can leave the app. After extract, interpretation continues in the cloud — we will notify you when ready.'
      ),
      [{ text: zhCopy(loc, '好', '好', 'OK'), onPress: opts.onDismiss }]
    )
    return
  }

  if (perm === 'denied') {
    Alert.alert(
      zhCopy(loc, '解读已开始', '解讀已開始', 'Reading started'),
      zhCopy(
        loc,
        '可离开应用。如需完成后通知，请在系统设置中开启通知。',
        '可離開應用。如需完成後通知，請在系統設定中開啟通知。',
        'You can leave the app. To get a completion alert, enable Notifications in Settings.'
      ),
      [
        { text: zhCopy(loc, '好', '好', 'OK'), style: 'cancel', onPress: opts.onDismiss },
        {
          text: zhCopy(loc, '打开设置', '打開設定', 'Open Settings'),
          onPress: () => {
            void Linking.openSettings()
            opts.onDismiss?.()
          },
        },
      ]
    )
    return
  }

  Alert.alert(
    zhCopy(loc, '解读已开始', '解讀已開始', 'Reading started'),
    zhCopy(
      loc,
      '可离开应用。需要完成后通知吗？',
      '可離開應用。需要完成後通知嗎？',
      'You can leave the app. Want a notification when it finishes?'
    ),
    [
      {
        text: zhCopy(loc, '不用了', '不用了', 'Not now'),
        style: 'cancel',
        onPress: opts.onDismiss,
      },
      {
        text: zhCopy(loc, '开启通知', '開啟通知', 'Notify me'),
        onPress: () => {
          void enableReadingCompletionPush(opts.locale).finally(() => {
            opts.onDismiss?.()
          })
        },
      },
    ]
  )
}

function mapJobError(msg: string, locale: string): string {
  let error = zhCopy(
    locale,
    '解读失败，请稍后重试',
    '解讀失敗，請稍後重試',
    'Reading failed. Try again.'
  )
  if (msg === 'signin_required') error = 'signin_required'
  else if (msg === 'biometric_consent_required') error = 'biometric_consent_required'
  else if (msg === 'features_unchanged') {
    error = zhCopy(
      locale,
      '照片特征未变化。请先更新左掌 / 右掌 / 面部至少一张照片，再发起新解读。',
      '照片特徵未變化。請先更新左掌 / 右掌 / 面部至少一張照片，再發起新解讀。',
      'Photos unchanged. Update at least one of left palm, right palm, or face before a new reading.'
    )
  } else if (msg === 'features_incomplete' || msg === 'birth_incomplete') {
    error = zhCopy(
      locale,
      '请先完成三张照片与出生信息，再发起解读。',
      '請先完成三張照片與出生資訊，再發起解讀。',
      'Complete three photos and birth info before starting a reading.'
    )
  } else if (
    msg === 'purchase_required' ||
    msg.toLowerCase().includes('purchase_required') ||
    msg.toLowerCase().includes('quota')
  ) {
    error = zhCopy(
      locale,
      '需要有效订阅或单次购买（DEV Pro 仅客户端无效，请在设置里再点一次 Force entitlement → PRO）',
      '需要有效訂閱或單次購買（DEV Pro 僅客戶端無效，請在設定裡再點一次 Force entitlement → PRO）',
      'Purchase or Pro required (DEV client Pro is not enough — cycle Force entitlement → PRO in Settings)'
    )
  } else if (msg.includes('photo_slot_exhausted')) {
    error = zhCopy(
      locale,
      '本月照片额度已用尽',
      '本月照片額度已用盡',
      'Monthly photo slots exhausted'
    )
  } else if (msg.includes('report_regen_exhausted')) {
    error = zhCopy(
      locale,
      '本月报告重生成额度已用尽',
      '本月報告重新生成額度已用盡',
      'Monthly report regenerations exhausted'
    )
  } else if (msg === 'extract_not_pro' || msg.includes('extract_not_pro')) {
    error = zhCopy(
      locale,
      '特征提取需要 Pro（Settings → Force entitlement → PRO，需已登录）',
      '特徵提取需要 Pro（Settings → Force entitlement → PRO，需已登入）',
      'Feature extract needs Pro (Settings → Force entitlement → PRO while signed in)'
    )
  } else if (msg.includes('request_timeout') || msg.includes('extract_timeout')) {
    error = zhCopy(
      locale,
      '特征提取超时。请检查网络后重试；必要时重拍更清晰的照片。',
      '特徵提取超時。請檢查網絡後重試；必要時重拍更清晰的照片。',
      'Feature extract timed out. Check network and retry; retake clearer photos if needed.'
    )
  } else if (msg.includes('extract_image_encode_failed') || msg.includes('photo_encode_failed')) {
    error = zhCopy(
      locale,
      '无法处理该照片。请用相机重新拍摄。',
      '無法處理該照片。請用相機重新拍攝。',
      'Could not process this photo. Retake with the camera.'
    )
  } else if (msg.includes('extract_photo_quality_low') || msg.includes('photo_quality_low')) {
    error = zhCopy(
      locale,
      '照片不够清晰完整。请重拍：正脸五官清晰，或掌纹全掌入镜、光线均匀。',
      '照片不夠清晰完整。請重拍：正臉五官清晰，或掌紋全掌入鏡、光線均勻。',
      'Photo too unclear. Retake: sharp full face, or full palm with even light.'
    )
  } else if (msg.includes('extract_modality_mismatch') || msg.includes('modality_mismatch')) {
    error = zhCopy(
      locale,
      '这张图不像当前步骤要求的部位（左掌 / 右掌 / 面部）。请按步骤重拍。',
      '這張圖不像目前步驟要求的部位（左掌 / 右掌 / 面部）。請按步驟重拍。',
      'This image does not match the expected part (left palm / right palm / face). Retake for this step.'
    )
  } else if (msg.includes('extract_failed:502') || msg.includes('VLM')) {
    error = zhCopy(
      locale,
      '图像特征服务暂不可用，请稍后重试',
      '圖像特徵服務暫不可用，請稍後重試',
      'Vision extract service unavailable — try again shortly'
    )
  } else if (msg.includes('extract_failed') || msg.includes('extract_forbidden')) {
    error = zhCopy(
      locale,
      `特征提取失败（${msg}）`,
      `特徵提取失敗（${msg}）`,
      `Feature extract failed (${msg})`
    )
  } else if (msg === 'job_poll_timeout') {
    error = zhCopy(
      locale,
      '解读仍在云端处理中，完成后会通知你',
      '解讀仍在雲端處理中，完成後會通知你',
      'Still processing in the cloud — we will notify you when ready'
    )
  } else if (
    msg === 'network_error' ||
    msg === 'request_timeout' ||
    isTransientNetworkError(msg)
  ) {
    error = zhCopy(
      locale,
      '网络中断。若已开始解读，云端会继续处理，完成后会通知你。',
      '網絡中斷。若已開始解讀，雲端會繼續處理，完成後會通知你。',
      'Network interrupted. If the reading already started, it continues in the cloud — we will notify you when ready.'
    )
  } else if (msg.length > 0 && msg.length < 200) {
    error = msg
  }
  return error
}

/** After enqueue, client poll failures must not fail the job — queue owns it. */
function isQuitSafeAfterEnqueue(msg: string, jobId: string | null): boolean {
  if (!jobId) return false
  if (msg === 'job_poll_timeout' || msg === 'job_poll_aborted') return true
  if (msg === 'network_error' || msg === 'request_timeout') return true
  return isTransientNetworkError(msg)
}

function keepQueuedAfterDisconnect(notifyQueued?: () => void): void {
  notifyQueued?.()
  setState({
    status: 'running',
    phase: state.phase === 'extracting' ? 'queued' : state.phase === 'idle' ? 'queued' : state.phase,
    error: null,
    progress: Math.max(state.progress, 50),
  })
}

function applyProgress(p: FaceReadingProgress): void {
  if (p.phase === 'extracting') {
    setState({
      status: 'running',
      phase: 'extracting',
      progress: Math.max(p.progress, 5),
    })
    return
  }
  const job = p.job
  void setPendingFlag(true, job.jobId)
  const floor = p.phase === 'queued' ? 10 : p.phase === 'interpreting' ? 20 : 0
  setState({
    status: 'running',
    phase: p.phase === 'failed' ? 'failed' : p.phase,
    jobId: p.job.jobId,
    progress: Math.max(state.progress, job.progress, floor),
  })
}

async function finishSuccess(opts: {
  locale: string
  isPro: boolean
  outputKind: 'oneshot' | 'period_brief'
  readingId: string
  output: Record<string, unknown>
  jobId: string | null
}): Promise<void> {
  const events = Array.isArray(opts.output.events)
    ? (opts.output.events as Array<{ startMonth?: string; theme?: string; note?: string }>)
    : []

  const proActive = opts.isPro || opts.outputKind === 'period_brief'
  if (proActive && (await isXingqiPushEnabled())) {
    const lastReadingAt = new Date().toISOString()
    const serverOk = await registerXingqiServerPush({
      locale: opts.locale,
      isPro: true,
      lastReadingAt,
      allowWithoutPro: false,
    })
    if (!serverOk) {
      await scheduleXingqiPush({
        locale: opts.locale,
        isPro: true,
        events,
        preferServer: false,
      })
    }
  }

  // Keep feature IDs so identical photos cannot silently re-bill a new reading.
  const kept = getReadingDraft()
  await clearReadingDraft()
  patchReadingDraft({
    faceFeatureId: kept.faceFeatureId,
    palmLeftFeatureId: kept.palmLeftFeatureId,
    palmRightFeatureId: kept.palmRightFeatureId,
    palmLeftUri: kept.palmLeftUri,
    palmRightUri: kept.palmRightUri,
    faceUri: kept.faceUri,
    solarDate: kept.solarDate,
    timeIndex: kept.timeIndex,
    gender: kept.gender,
    city: kept.city,
    horizonMonths: kept.horizonMonths,
  })
  await saveLastReadingPhotoSnapshot({
    draft: {
      ...kept,
      faceFeatureId: kept.faceFeatureId,
      palmLeftFeatureId: kept.palmLeftFeatureId,
      palmRightFeatureId: kept.palmRightFeatureId,
    },
    readingId: opts.readingId,
  })
  try {
    await snapshotReadingPhotos(opts.readingId)
    await syncReadingPhotosToICloudIfEnabled()
  } catch (err) {
    console.warn('[xingqi.reading-job] snapshot_photos_failed', err)
  }
  const payload = encodeURIComponent(JSON.stringify(opts.output))
  setState({
    status: 'done',
    phase: 'done',
    jobId: opts.jobId,
    readingId: opts.readingId,
    resultPayload: payload,
    error: null,
    progress: 100,
  })
  await setPendingFlag(false)

  // Completion alert: server Expo push when notifyOnComplete was set at enqueue.
  // Do not also fire a local notification (double tap / double banner).
}

async function attachAndPollJob(jobId: string, locale: string, isPro: boolean): Promise<void> {
  await setPendingFlag(true, jobId)
  setState({
    status: 'running',
    phase: 'queued',
    jobId,
    startedAt: state.startedAt ?? new Date().toISOString(),
    readingId: null,
    resultPayload: null,
    error: null,
    progress: Math.max(state.progress, 40),
  })

  const snap = await getFaceReadingJob(jobId).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === 'network_error' || isTransientNetworkError(msg) || msg === 'request_timeout') {
      // Still queued on server — fall through to poll loop.
      return {
        jobId,
        stage: 'queued' as const,
        progress: Math.max(state.progress, 40),
        readingId: null,
        errorMessage: null,
        resultPayload: null,
      }
    }
    throw err
  })
  if (snap.stage === 'done' && snap.readingId && snap.resultPayload) {
    let output: Record<string, unknown>
    try {
      output = JSON.parse(snap.resultPayload) as Record<string, unknown>
    } catch {
      setState({
        status: 'error',
        phase: 'failed',
        error: mapJobError('job_bad_result', locale),
      })
      await setPendingFlag(false)
      return
    }
    await finishSuccess({
      locale,
      isPro,
      outputKind: 'oneshot',
      readingId: snap.readingId,
      output,
      jobId,
    })
    return
  }
  if (snap.stage === 'failed') {
    setState({
      status: 'error',
      phase: 'failed',
      error: mapJobError(snap.errorMessage || 'job_failed', locale),
    })
    await setPendingFlag(false)
    return
  }

  setState({
    phase: snap.stage === 'interpreting' ? 'interpreting' : 'queued',
    progress: snap.progress,
  })

  const done = await pollFaceReadingJob(jobId, {
    onProgress: (p: FaceoracleJobPoll) => {
      setState({
        jobId: p.jobId,
        progress: p.progress,
        phase: p.stage === 'interpreting' ? 'interpreting' : 'queued',
      })
    },
  })
  if (done.stage === 'failed') {
    setState({
      status: 'error',
      phase: 'failed',
      error: mapJobError(done.errorMessage || 'job_failed', locale),
    })
    await setPendingFlag(false)
    return
  }
  if (!done.readingId || !done.resultPayload) {
    setState({
      status: 'error',
      phase: 'failed',
      error: mapJobError('job_missing_result', locale),
    })
    await setPendingFlag(false)
    return
  }
  let output: Record<string, unknown>
  try {
    output = JSON.parse(done.resultPayload) as Record<string, unknown>
  } catch {
    setState({
      status: 'error',
      phase: 'failed',
      error: mapJobError('job_bad_result', locale),
    })
    await setPendingFlag(false)
    return
  }
  await finishSuccess({
    locale,
    isPro,
    outputKind: 'oneshot',
    readingId: done.readingId,
    output,
    jobId,
  })
}

export interface StartReadingJobInput {
  locale: string
  outputKind: 'oneshot' | 'period_brief'
  isPro: boolean
  draft?: ReadingDraft
  /** Same photos — new body/locale; consumes report regen meter. */
  regen?: boolean
  /**
   * Fires only after the job is safely queued (or an existing cloud job is attached).
   * Callers must NOT show "Reading started" before this — early extract/enqueue
   * failures should surface as "Reading incomplete" only.
   */
  onQueued?: () => void
}

/**
 * Start extract + enqueue + poll without blocking the UI. Returns false if already running.
 */
export function startReadingJob(input: StartReadingJobInput): boolean {
  if (state.status === 'running' || inFlight) return false

  const locale = input.locale
  patchReadingDraft({ outputKind: input.outputKind, updateKind: 'full' })
  const draft = input.draft ?? getReadingDraft()

  setState({
    status: 'running',
    phase: 'extracting',
    startedAt: new Date().toISOString(),
    jobId: null,
    readingId: null,
    resultPayload: null,
    error: null,
    progress: 0,
  })
  void setPendingFlag(true)

  let queuedNotified = false
  const notifyQueued = () => {
    if (queuedNotified) return
    queuedNotified = true
    try {
      input.onQueued?.()
    } catch {
      // ignore handoff errors
    }
  }

  inFlight = (async () => {
    try {
      // Prefer attaching an existing cloud job over starting a duplicate.
      const active = await fetchActiveFaceReadingJob()
      if (active?.jobId) {
        notifyQueued()
        await attachAndPollJob(active.jobId, locale, input.isPro)
        return
      }

      const prefs = await getXingqiPushPrefs()
      const notifyOnComplete = prefs.remindersOn
      if (notifyOnComplete) {
        await registerXingqiServerPush({
          locale,
          isPro: input.isPro,
          allowWithoutPro: true,
        })
      }

      const res = await runFaceReading(draft, locale, {
        notifyOnComplete,
        regen: input.regen ?? false,
        onProgress: (p) => {
          applyProgress(p)
          if (p.phase === 'queued' || p.phase === 'interpreting' || p.phase === 'done') {
            notifyQueued()
          }
        },
      })

      notifyQueued()
      await finishSuccess({
        locale,
        isPro: input.isPro,
        outputKind: input.outputKind,
        readingId: res.readingId,
        output: res.output,
        jobId: res.jobId,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      console.warn('[xingqi-reading-job]', msg || err)
      if (isQuitSafeAfterEnqueue(msg, state.jobId)) {
        // Quit-safe: cloud queue owns the LLM stage; push / resume will finish it.
        keepQueuedAfterDisconnect(notifyQueued)
        return
      }
      setState({
        status: 'error',
        phase: 'failed',
        error: mapJobError(msg, locale),
      })
      await setPendingFlag(false)
    } finally {
      inFlight = null
    }
  })()

  return true
}

/**
 * Restore in-progress cloud job after cold start / focus.
 * Prefers server /active, then local jobId.
 * Allows re-attach when status is still `running` but poll timed out (`inFlight` null).
 */
export function resumeReadingJobIfNeeded(locale: string, isPro: boolean): boolean {
  if (inFlight) return false

  inFlight = (async () => {
    try {
      const active = await fetchActiveFaceReadingJob()
      const storedId = await loadStoredJobId()
      const jobId = active?.jobId ?? storedId ?? state.jobId
      if (!jobId) {
        if (await wasReadingJobPending()) await setPendingFlag(false)
        return
      }
      await attachAndPollJob(jobId, locale, isPro)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      console.warn('[xingqi-reading-job/resume]', msg || err)
      const jobId = state.jobId ?? (await loadStoredJobId())
      if (isQuitSafeAfterEnqueue(msg, jobId)) {
        if (jobId) await setPendingFlag(true, jobId)
        keepQueuedAfterDisconnect()
        return
      }
      setState({
        status: 'error',
        phase: 'failed',
        error: mapJobError(msg, locale),
      })
      await setPendingFlag(false)
    } finally {
      inFlight = null
    }
  })()

  return true
}

let appStateSub: { remove: () => void } | null = null
let lifecycleLocale = 'zh'
let lifecycleIsPro = false

/**
 * Resume poll when returning from background. Safe to call multiple times
 * (home + paywall); only one AppState subscription is kept.
 */
export function bindReadingJobLifecycle(locale: string, isPro: boolean): () => void {
  lifecycleLocale = locale
  lifecycleIsPro = isPro
  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active') return
      // Cold focus already covered by useFocusEffect; this catches background→foreground
      // without a navigation focus change (common after home-button exit).
      void (async () => {
        const pending = await wasReadingJobPending()
        if (!pending && state.status !== 'running') return
        resumeReadingJobIfNeeded(lifecycleLocale, lifecycleIsPro)
      })()
    })
  }
  return () => {
    // Keep the global listener; unbind only clears nothing — callers may remount.
    // Explicit teardown when last screen unmounts is optional; module lifetime is fine.
  }
}

/** Acknowledge done/error so home can return to idle. */
export function acknowledgeReadingJob(): void {
  if (state.status === 'running') return
  setState({
    status: 'idle',
    phase: 'idle',
    startedAt: null,
    jobId: null,
    readingId: null,
    resultPayload: null,
    error: null,
    progress: 0,
  })
}

/**
 * Atomically claim a completed job for navigation (home / paywall / deeplink).
 * Only the first caller wins — prevents stacking /result three times when
 * home + paywall + push notification all react to the same `done` state.
 */
export function consumeReadingJobDone(): {
  readingId: string
  resultPayload: string
} | null {
  if (state.status !== 'done' || !state.readingId || !state.resultPayload) return null
  const readingId = state.readingId
  const resultPayload = state.resultPayload
  acknowledgeReadingJob()
  markReadingOpened(readingId)
  return { readingId, resultPayload }
}

/** Short-lived guard so a late push tap doesn't re-open the same report. */
let lastOpenedReadingId: string | null = null
let lastOpenedAt = 0

export function markReadingOpened(readingId: string): void {
  lastOpenedReadingId = readingId
  lastOpenedAt = Date.now()
}

export function wasReadingOpenedRecently(readingId: string, withinMs = 45_000): boolean {
  return lastOpenedReadingId === readingId && Date.now() - lastOpenedAt < withinMs
}

/**
 * Atomically take the current error (if any) and clear job state.
 */
export function consumeReadingJobError(): string | null {
  if (state.status !== 'error' || !state.error) return null
  const err = state.error
  setState({
    status: 'idle',
    phase: 'idle',
    startedAt: null,
    jobId: null,
    readingId: null,
    resultPayload: null,
    error: null,
    progress: 0,
  })
  return err
}

/** Step labels for the in-list staged loader. */
export function readingJobSteps(
  phase: ReadingJobPhase,
  locale: string
): Array<{ key: string; label: string; done: boolean; active: boolean }> {
  const order = ['extracting', 'queued', 'interpreting', 'done'] as const
  const labels: Record<(typeof order)[number], string> = {
    extracting: zhCopy(locale, '提取特征', '提取特徵', 'Extract features'),
    queued: zhCopy(locale, '云端排队', '雲端排隊', 'Queued in cloud'),
    interpreting: zhCopy(locale, '生成解读', '生成解讀', 'Writing reading'),
    done: zhCopy(locale, '完成', '完成', 'Done'),
  }
  const activeKey: (typeof order)[number] =
    phase === 'failed'
      ? 'interpreting'
      : phase === 'idle'
        ? 'extracting'
        : phase === 'done'
          ? 'done'
          : phase === 'extracting' || phase === 'queued' || phase === 'interpreting'
            ? phase
            : 'extracting'
  const idx = order.indexOf(activeKey)
  return order.map((key, i) => ({
    key,
    label: labels[key],
    done: idx > i || phase === 'done',
    active: idx === i && phase !== 'done' && phase !== 'failed' && phase !== 'idle',
  }))
}
