'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface SessionData {
  id: string
  name: string
  avatarUrl: string
  isWorker: boolean
  activeMode: 'user' | 'worker'
}

const SessionContext = createContext<SessionData | null>(null)

interface SessionProviderProps {
  initialData: SessionData | null
  children: React.ReactNode
}

export function SessionProvider({ initialData, children }: SessionProviderProps) {
  const [session, setSession] = useState<SessionData | null>(initialData)
  const [loading, setLoading] = useState(initialData === null)
  const router = useRouter()

  useEffect(() => {
    if (initialData !== null) return
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    fetch(`${api}/api/auth/me`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : { success: false })
      .then((json: { success: boolean; data?: SessionData }) => {
        if (json.success && json.data) {
          setSession(json.data)
          setLoading(false)
        } else {
          router.replace('/login')
        }
      })
      .catch(() => router.replace('/login'))
  }, [initialData, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionData | null {
  return useContext(SessionContext)
}
