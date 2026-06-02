import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function isAuthenticated(cookieHeader: string): Promise<boolean> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  try {
    const res = await fetch(`${apiBase}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const json = (await res.json()) as { success: boolean }
    return json.success
  } catch {
    return false
  }
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const authed = await isAuthenticated(cookieStore.toString())
  if (authed) redirect('/')

  return <>{children}</>
}
