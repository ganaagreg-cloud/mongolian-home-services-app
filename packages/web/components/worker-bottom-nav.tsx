'use client'

import { Briefcase, ClipboardList, MessageCircle, Wallet, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkerBottomNavProps {
  active: 'jobs' | 'active' | 'chat' | 'earnings' | 'profile'
  onNavigate: (screen: 'jobs' | 'active' | 'chat' | 'earnings' | 'profile') => void
}

const navItems = [
  { id: 'jobs'     as const, icon: Briefcase,     label: 'Ажил' },
  { id: 'active'   as const, icon: ClipboardList,  label: 'Идэвхтэй' },
  { id: 'chat'     as const, icon: MessageCircle,  label: 'Чат' },
  { id: 'earnings' as const, icon: Wallet,         label: 'Орлого' },
  { id: 'profile'  as const, icon: User,           label: 'Профайл' },
]

export function WorkerBottomNav({ active, onNavigate }: WorkerBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-border bg-background px-2 pb-6 pt-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
