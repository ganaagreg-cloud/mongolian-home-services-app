'use client'

import { SWRConfig } from 'swr'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 5000,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
      }}
    >
      {children}
      <Toaster position="top-center" richColors />
    </SWRConfig>
  )
}
