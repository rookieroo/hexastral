/**
 * Background face reading job — extract (sync) → enqueue → poll.
 * After enqueue, interpretation is quit-safe on Cloudflare Queues.
 * Home restores via GET /jobs/active + stored jobId.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getPushPermissionStatus, requestPushPermission } from '@zhop/satellite-runtime'
import { Alert, Linking } from 'react-native'

import {
  type FaceoracleJobPoll,
  type FaceReadingProgress,
  fetchActiveFaceReadingJob,
  getFaceReadingJob,
  pollFaceReadingJob,
  runFaceReading,
} from './api'
import { getXingqiPushPrefs, setXingqiPushPrefs } from './push-preference'
import { isXingqiPushEnabled, scheduleXingqiPush } from './push-schedule'
import {
  clearReadingDraft,
  getReadingDraft,
  patchReadingDraft,
  type ReadingDraft,
} from './reading-draft'
import { saveLastReadingPhotoSnapshot } from './reading-photo-stamp'
import { registerXingqiServerPush } from './server-push'

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
  const zh = opts.locale.startsWith('zh')
  const prefs = await getXingqiPushPrefs()
  const perm = await getPushPermissionStatus()

  if (prefs.remindersOn || perm === 'granted') {
    if (prefs.remindersOn === false && perm === 'granted') {
      await setXingqiPushPrefs({ remindersOn: true })
    }
    Alert.alert(
      zh ? '解读已开始' : 'Reading started',
      zh
        ? '可离开应用。特征提取后会在云端继续解读，完成后通知你。'
        : 'You can leave the app. After extract, interpretation continues in the cloud — we will notify you when ready.',
      [{ text: zh ? '好' : 'OK', onPress: opts.onDismiss }]
    )
    return
  }

  if (perm === 'denied') {
    Alert.alert(
      zh ? '解读已开始' : 'Reading started',
      zh
        ? '可离开应用。如需完成后通知，请在系统设置中开启通知。'
        : 'You can leave the app. To get a completion alert, enable Notifications in Settings.',
      [
        { text: zh ? '好' : 'OK', style: 'cancel', onPress: opts.onDismiss },
        {
          text: zh ? '打开设置' : 'Open Settings',
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
    zh ? '解读已开始' : 'Reading started',
    zh
      ? '可离开应用。需要完成后通知吗？'
      : 'You can leave the app. Want a notification when it finishes?',
    [
      { text: zh ? '不用了' : 'Not now', style: 'cancel', onPress: opts.onDismiss },
      {
        text: zh ? '开启通知' : 'Notify me',
        onPress: () => {
          void enableReadingCompletionPush(opts.locale).finally(() => {
            opts.onDismiss?.()
          })
        },
      },
    ]
  )
}

function mapJobError(msg: string, zh: boolean): string {
  let error = zh ? '解读失败，请稍后重试' : 'Reading failed. Try again.'
  if (msg === 'signin_required') error = 'signin_required'
  else if (msg === 'biometric_consent_required') error = 'biometric_consent_required'
  else if (msg === 'features_unchanged') {
    error = zh
      ? '照片特征未变化。请先更新左掌 / 右掌 / 面部至少一张照片，再发起新解读。'
      : 'Photos unchanged. Update at least one of left palm, right palm, or face before a new reading.'
  } else if (msg === 'features_incomplete' || msg === 'birth_incomplete') {
    error = zh
      ? '请先完成三张照片与出生信息，再发起解读。'
      : 'Complete three photos and birth info before starting a reading.'
  } else if (
    msg === 'purchase_required' ||
    msg.toLowerCase().includes('purchase_required') ||
    msg.toLowerCase().includes('quota')
  ) {
    error = zh
      ? '需要有效订阅或单次购买（DEV Pro 仅客户端无效，请在设置里再点一次 Force entitlement → PRO）'
      : 'Purchase or Pro required (DEV client Pro is not enough — cycle Force entitlement → PRO in Settings)'
  } else if (msg.includes('photo_slot_exhausted')) {
    error = zh ? '本月照片额度已用尽' : 'Monthly photo slots exhausted'
  } else if (msg.includes('report_regen_exhausted')) {
    error = zh ? '本月报告重生成额度已用尽' : 'Monthly report regenerations exhausted'
  } else if (msg === 'extract_not_pro' || msg.includes('extract_not_pro')) {
    error = zh
      ? '特征提取需要 Pro（Settings → Force entitlement → PRO，需已登录）'
      : 'Feature extract needs Pro (Settings → Force entitlement → PRO while signed in)'
  } else if (msg.includes('extract_failed:502') || msg.includes('VLM')) {
    error = zh
      ? '图像特征服务暂不可用，请稍后重试'
      : 'Vision extract service unavailable — try again shortly'
  } else if (msg.includes('extract_failed') || msg.includes('extract_forbidden')) {
    error = zh ? `特征提取失败（${msg}）` : `Feature extract failed (${msg})`
  } else if (msg === 'job_poll_timeout') {
    error = zh
      ? '解读仍在云端处理中，完成后会通知你'
      : 'Still processing in the cloud — we will notify you when ready'
  } else if (msg.length > 0 && msg.length < 200) {
    error = msg
  }
  return error
}

function applyProgress(p: FaceReadingProgress): void {
  if (p.phase === 'extracting') {
    setState({
      status: 'running',
      phase: 'extracting',
      progress: p.progress,
    })
    return
  }
  const job = p.job
  void setPendingFlag(true, job.jobId)
  setState({
    status: 'running',
    phase: p.phase === 'failed' ? 'failed' : p.phase,
    jobId: p.job.jobId,
    progress: p.job.progress,
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

  const snap = await getFaceReadingJob(jobId)
  if (snap.stage === 'done' && snap.readingId && snap.resultPayload) {
    let output: Record<string, unknown>
    try {
      output = JSON.parse(snap.resultPayload) as Record<string, unknown>
    } catch {
      setState({
        status: 'error',
        phase: 'failed',
        error: mapJobError('job_bad_result', locale.startsWith('zh')),
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
      error: mapJobError(snap.errorMessage || 'job_failed', locale.startsWith('zh')),
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
      error: mapJobError(done.errorMessage || 'job_failed', locale.startsWith('zh')),
    })
    await setPendingFlag(false)
    return
  }
  if (!done.readingId || !done.resultPayload) {
    setState({
      status: 'error',
      phase: 'failed',
      error: mapJobError('job_missing_result', locale.startsWith('zh')),
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
      error: mapJobError('job_bad_result', locale.startsWith('zh')),
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
  const zh = locale.startsWith('zh')
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
      if (msg === 'job_poll_timeout' && state.jobId) {
        // Quit-safe: keep list row; push / resume will finish it.
        notifyQueued()
        setState({
          status: 'running',
          phase: state.phase === 'extracting' ? 'queued' : state.phase,
          error: null,
          progress: Math.max(state.progress, 50),
        })
        return
      }
      setState({
        status: 'error',
        phase: 'failed',
        error: mapJobError(msg, zh),
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
 */
export function resumeReadingJobIfNeeded(locale: string, isPro: boolean): boolean {
  if (state.status === 'running' || inFlight) return false

  inFlight = (async () => {
    try {
      const active = await fetchActiveFaceReadingJob()
      const storedId = await loadStoredJobId()
      const jobId = active?.jobId ?? storedId
      if (!jobId) {
        if (await wasReadingJobPending()) await setPendingFlag(false)
        return
      }
      await attachAndPollJob(jobId, locale, isPro)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      console.warn('[xingqi-reading-job/resume]', msg || err)
      if (msg === 'job_poll_timeout') {
        setState({ status: 'running', error: null })
        return
      }
      setState({
        status: 'error',
        phase: 'failed',
        error: mapJobError(msg, locale.startsWith('zh')),
      })
      await setPendingFlag(false)
    } finally {
      inFlight = null
    }
  })()

  return true
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
  zh: boolean
): Array<{ key: string; label: string; done: boolean; active: boolean }> {
  const order = ['extracting', 'queued', 'interpreting', 'done'] as const
  const labels: Record<(typeof order)[number], string> = zh
    ? { extracting: '提取特征', queued: '云端排队', interpreting: '生成解读', done: '完成' }
    : {
        extracting: 'Extract features',
        queued: 'Queued in cloud',
        interpreting: 'Writing reading',
        done: 'Done',
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
