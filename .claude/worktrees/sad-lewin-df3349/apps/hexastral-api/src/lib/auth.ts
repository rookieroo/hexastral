/**
 * 认证辅助函数
 *
 * 所有需要认证的路由处理函数应通过 requireUserId() 获取用户身份,
 * 而非从 request body / query / URL param 中读取。
 *
 * userId 由 HMAC 中间件验证后注入 c.set('userId', ...)。
 */

import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { CloudflareBindings, ContextVariables } from '../infra-types'

type AppContext = Context<{ Bindings: CloudflareBindings; Variables: ContextVariables }>

/** Extract the authenticated userId from context or throw 401. */
export function requireUserId(c: AppContext): string {
  const userId = c.get('userId')
  if (!userId) {
    throw new HTTPException(401, { message: 'Authentication required' })
  }
  return userId
}
