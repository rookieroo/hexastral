import { signedApiFetch } from '@zhop/satellite-runtime'

import type { LantaiCommand } from './config-gen'

export interface LantaiConnection {
  id: string
  workspaceId: string
  workspaceName: string | null
  createdAt: string
}

export interface LantaiConfigRow {
  id: string
  connectionId: string
  databaseId: string
  mode: 'manual' | 'ai'
  command: LantaiCommand
  createdAt: string
  updatedAt: string
}

async function readJson<T>(res: Response | null): Promise<T | null> {
  if (!res?.ok) return null
  const body: unknown = await res.json()
  if (typeof body !== 'object' || body === null || !('ok' in body)) return null
  const envelope = body as { ok: boolean; data?: T }
  if (!envelope.ok || envelope.data === undefined) return null
  return envelope.data
}

export async function startNotionOauth(): Promise<string | null> {
  const res = await signedApiFetch({ method: 'POST', path: '/api/lantai/oauth/start', body: {} })
  const data = await readJson<{ url: string }>(res)
  return data?.url ?? null
}

export async function listConnections(): Promise<LantaiConnection[]> {
  const res = await signedApiFetch({ method: 'GET', path: '/api/lantai/connection' })
  const data = await readJson<{ connections: LantaiConnection[] }>(res)
  return data?.connections ?? []
}

export async function listConfigs(): Promise<LantaiConfigRow[]> {
  const res = await signedApiFetch({ method: 'GET', path: '/api/lantai/configs' })
  const data = await readJson<{ configs: LantaiConfigRow[] }>(res)
  return data?.configs ?? []
}

export async function createConfig(input: {
  connectionId: string
  command: LantaiCommand
}): Promise<{ id: string; mode: 'manual' | 'ai' } | null> {
  const res = await signedApiFetch({ method: 'POST', path: '/api/lantai/configs', body: input })
  return readJson<{ id: string; mode: 'manual' | 'ai' }>(res)
}

export async function updateConfig(
  id: string,
  command: LantaiCommand
): Promise<{ id: string; mode: 'manual' | 'ai' } | null> {
  const res = await signedApiFetch({
    method: 'PUT',
    path: `/api/lantai/configs/${encodeURIComponent(id)}`,
    body: { command },
  })
  return readJson<{ id: string; mode: 'manual' | 'ai' }>(res)
}

export async function revokeConfig(id: string): Promise<boolean> {
  const res = await signedApiFetch({ method: 'DELETE', path: `/api/lantai/configs/${id}` })
  return res?.ok === true
}

export interface NotionDatabaseOption {
  id: string
  title: string
}

export interface NotionDatabaseSchema {
  id: string
  title: string
  fields: LantaiCommand['fields']
}

export async function listDatabases(connectionId: string): Promise<NotionDatabaseOption[]> {
  const res = await signedApiFetch({
    method: 'GET',
    path: `/api/lantai/connections/${encodeURIComponent(connectionId)}/databases`,
  })
  const data = await readJson<{ databases: NotionDatabaseOption[] }>(res)
  return data?.databases ?? []
}

export async function getDatabaseSchema(
  connectionId: string,
  databaseId: string
): Promise<NotionDatabaseSchema | null> {
  const res = await signedApiFetch({
    method: 'GET',
    path: `/api/lantai/connections/${encodeURIComponent(connectionId)}/databases/${encodeURIComponent(databaseId)}`,
  })
  return readJson<NotionDatabaseSchema>(res)
}
