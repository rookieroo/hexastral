import { createLogger } from '@zhop/logger'

export const apiLogger = createLogger({ service: 'hexastral-api' })

export const fengLogger = apiLogger.child({ domain: 'feng' })
