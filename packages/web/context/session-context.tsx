'use client'

import { createContext, useContext } from 'react'

export interface SessionData {
  id: string
  name: string
  avatarUrl: string
  isWorker: boolean
  activeMode: 'user' | 'worker'
}

const SessionContext = createContext<SessionData | null>(null)

interface SessionProviderProps {
  initialData: SessionData
  children: React.ReactNode
}

/**
 * Seeded server-side in each layout's auth gate.
 * Client components read session via useSession() with no refetch flash.
 */
export function SessionProvider({ initialData, children }: SessionProviderProps) {
  return (
    <SessionContext.Provider value={initialData}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionData | null {
  return useContext(SessionContext)
}
