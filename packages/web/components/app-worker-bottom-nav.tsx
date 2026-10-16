'use client'

import { Briefcase, ClipboardList, CalendarDays, Wallet, User } from 'lucide-react'
import { FloatingTabBar } from '@/components/floating-tab-bar'

const navItems = [
  { href: '/jobs',              icon: Briefcase,     label: 'Ажил'     },
  { href: '/worker-active',     icon: ClipboardList, label: 'Идэвхтэй' },
  { href: '/worker-schedule',   icon: CalendarDays,  label: 'Хуваарь'  },
  { href: '/worker-earnings',   icon: Wallet,        label: 'Орлого'   },
  { href: '/worker-profile',    icon: User,          label: 'Профайл'  },
] as const

export function AppWorkerBottomNav() {
  return <FloatingTabBar items={navItems} />
}
