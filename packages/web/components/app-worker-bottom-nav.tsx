'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, ClipboardList, CalendarDays, Wallet, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/jobs',              icon: Briefcase,    label: 'Ажил'    },
  { href: '/worker-active',     icon: ClipboardList, label: 'Идэвхтэй' },
  { href: '/worker-schedule',   icon: CalendarDays,  label: 'Хуваарь' },
  { href: '/worker-earnings',   icon: Wallet,        label: 'Орлого'  },
  { href: '/worker-profile',    icon: User,          label: 'Профайл' },
] as const

export function AppWorkerBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-border bg-background px-2 pb-6 pt-2">
      <div className="flex items-center justify-around">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 transition-colors',
              pathname.startsWith(href) ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
