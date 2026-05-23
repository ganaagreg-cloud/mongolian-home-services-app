import type { ApiResponse } from './types'

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const json = (await res.json()) as ApiResponse<T>
  if (!json.success) throw new Error(json.error)
  return json.data
}
