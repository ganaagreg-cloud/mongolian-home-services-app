import { useCallback, useEffect, useState } from 'react'

import type { ApiResponse } from '@homeservices/shared'

import { apiFetch } from './api-fetch'

export function useApi<T>(path: string, intervalMs?: number) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    try {
      const res = await apiFetch(path)
      const body = (await res.json()) as ApiResponse<T>
      if (body.success) {
        setData(body.data)
        setError('')
      } else {
        setError(body.error)
      }
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    void refetch()
    if (!intervalMs) return
    const interval = setInterval(() => void refetch(), intervalMs)
    return () => clearInterval(interval)
  }, [refetch, intervalMs])

  return { data, loading, error, refetch }
}
