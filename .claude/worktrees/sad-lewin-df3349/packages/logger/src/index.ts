/**
 * @zhop/logger — Structured JSON logger for Cloudflare Workers
 *
 * Emits newline-delimited JSON to console (consumed by Workers Trace Events / Tail Workers).
 * Zero dependencies, <1KB.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  service: string
  msg: string
  requestId?: string
  [key: string]: unknown
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void
  info(msg: string, data?: Record<string, unknown>): void
  warn(msg: string, data?: Record<string, unknown>): void
  error(msg: string, data?: Record<string, unknown>): void
  child(extra: Record<string, unknown>): Logger
}

export function createLogger(opts: {
  service: string
  requestId?: string
  minLevel?: LogLevel
  extra?: Record<string, unknown>
}): Logger {
  const { service, requestId, extra } = opts
  const minPriority = LEVEL_PRIORITY[opts.minLevel ?? 'debug']

  function emit(level: LogLevel, msg: string, data?: Record<string, unknown>) {
    if (LEVEL_PRIORITY[level] < minPriority) return
    const entry: LogEntry = {
      level,
      service,
      msg,
      ts: new Date().toISOString(),
      ...(requestId && { requestId }),
      ...extra,
      ...data,
    }
    const line = JSON.stringify(entry)
    switch (level) {
      case 'error':
        console.error(line)
        break
      case 'warn':
        console.warn(line)
        break
      default:
        console.log(line)
    }
  }

  return {
    debug: (msg, data) => emit('debug', msg, data),
    info: (msg, data) => emit('info', msg, data),
    warn: (msg, data) => emit('warn', msg, data),
    error: (msg, data) => emit('error', msg, data),
    child: (childExtra) =>
      createLogger({
        service,
        requestId,
        minLevel: opts.minLevel,
        extra: { ...extra, ...childExtra },
      }),
  }
}
