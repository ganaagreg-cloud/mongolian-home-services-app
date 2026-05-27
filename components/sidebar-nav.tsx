'use client'

import { Home, ClipboardList, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarNavProps {
  active: 'home' | 'orders' | 'chat' | 'profile'
  onNavigate: (screen: 'home' | 'orders' | 'chat' | 'profile') => void
}

const navItems = [
  { id: 'home'    as const, icon: Home,          label: 'Нүүр' },
  { id: 'orders'  as const, icon: ClipboardList,  label: 'Захиалга' },
  { id: 'chat'    as const, icon: MessageCircle,  label: 'Чат' },
  { id: 'profile' as const, icon: User,           label: 'Профайл' },
]

export function SidebarNav({ active, onNavigate }: SidebarNavProps) {
  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-card border-r border-border fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">HomeService</h1>
        <p className="text-sm text-muted-foreground">Гэрийн Үйлчилгээ</p>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all active:scale-95',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
