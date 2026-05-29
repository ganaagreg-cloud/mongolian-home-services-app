const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${url}`, { credentials: 'include', ...init })
}
