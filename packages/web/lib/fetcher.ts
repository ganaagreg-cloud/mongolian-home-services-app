import type { ApiResponse } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, { credentials: 'include' })
  const json = (await res.json()) as ApiResponse<T>
  if (!json.success) throw new Error(json.error)
  return json.data
}
