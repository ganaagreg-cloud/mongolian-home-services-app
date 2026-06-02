'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useSession } from '@/context/session-context'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export function ModeToggle() {
  const session = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  if (!session?.isWorker) return null

  const currentMode: 'user' | 'worker' =
    pathname.startsWith('/jobs') || pathname.startsWith('/worker') ? 'worker' : 'user'

  async function handleSwitch(target: 'user' | 'worker') {
    if (target === currentMode) return
    const revertPath = currentMode === 'user' ? '/home' : '/jobs'
    const targetPath = target === 'user' ? '/home' : '/jobs'

    router.push(targetPath)

    try {
      const res = await fetch(`${API_BASE}/api/me/mode`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: target }),
      })
      if (!res.ok) throw new Error('persist failed')
    } catch {
      toast({
        title: 'Алдаа гарлаа',
        description: 'Горимыг хадгалж чадсангүй',
      })
      router.push(revertPath)
    }
  }

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-48 -translate-x-1/2">
      <div className="flex rounded-2xl bg-card p-1 shadow-md">
        {(['user', 'worker'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { void handleSwitch(m) }}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95',
              currentMode === m
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'user' ? 'Хэрэглэгч' : 'Ажилтан'}
          </button>
        ))}
      </div>
    </div>
  )
}
