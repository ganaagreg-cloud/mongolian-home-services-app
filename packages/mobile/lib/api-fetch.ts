import { authClient } from './auth-client'

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'

/**
 * RN has no cookie jar — the session cookie lives in the Better Auth expo
 * virtual cookie jar (SecureStore). Attach it manually; credentials must be
 * 'omit' so fetch does not interfere with the manual Cookie header.
 */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const cookie = authClient.getCookie()
  return fetch(`${API_BASE}${url}`, {
    ...init,
    credentials: 'omit',
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...init?.headers,
    },
  })
}
