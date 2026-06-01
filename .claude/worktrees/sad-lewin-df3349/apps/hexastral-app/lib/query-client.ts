import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { logError } from './logger'
import { mmkvStorage } from './storage'
import { showError } from './ux/toast'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 2,
    },
    mutations: {
      onError: (err) => {
        logError('mutation', err)
        showError(err)
      },
    },
  },
})

export const queryPersister = createSyncStoragePersister({
  storage: mmkvStorage,
  key: 'hexastral_rq_cache',
})
