'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useSession } from '@/context/session-context'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Inline segmented switch, placed in the header of the mode's root screen
// (/home and /jobs). It used to float above the tab bar, where it covered
// page content and fixed CTAs.
export function ModeToggle({ className }: { className?: string }) {
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
    <div
      role="radiogroup"
      aria-label="Горим"
      className={cn('relative grid grid-cols-2 rounded-full bg-card p-1 shadow-card', className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary shadow-brand transition-transform duration-300 ease-[var(--ease-out-soft)]',
          currentMode === 'worker' && 'translate-x-full',
        )}
      />
      {(['user', 'worker'] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={currentMode === m}
          onClick={() => { void handleSwitch(m) }}
          className={cn(
            'relative z-10 h-8 rounded-full px-3 text-[13px] font-bold transition-colors duration-300',
            currentMode === m ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {m === 'user' ? 'Хэрэглэгч' : 'Ажилтан'}
        </button>
      ))}
    </div>
  )
}
