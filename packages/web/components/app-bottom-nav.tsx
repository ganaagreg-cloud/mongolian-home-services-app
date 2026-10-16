'use client'

import { Home, ClipboardList, User } from 'lucide-react'
import { FloatingTabBar } from '@/components/floating-tab-bar'

// Chat is a drill-down from an active order (/chat/[orderId]), not a top-level tab.
const navItems = [
  { href: '/home',    icon: Home,          label: 'Нүүр'     },
  { href: '/orders',  icon: ClipboardList, label: 'Захиалга' },
  { href: '/profile', icon: User,          label: 'Профайл'  },
] as const

export function AppBottomNav() {
  return <FloatingTabBar items={navItems} />
}
