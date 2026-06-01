import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    RESEND_FROM: z.string().min(1).email().optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_SES_FROM: z.string().optional(),
  },
  runtimeEnv: {
    RESEND_FROM: process.env['RESEND_FROM'],
    RESEND_API_KEY: process.env['RESEND_API_KEY'],
    AWS_ACCESS_KEY_ID: process.env['AWS_ACCESS_KEY_ID'],
    AWS_SECRET_ACCESS_KEY: process.env['AWS_SECRET_ACCESS_KEY'],
    AWS_REGION: process.env['AWS_REGION'],
    AWS_SES_FROM: process.env['AWS_SES_FROM'],
  },
})
