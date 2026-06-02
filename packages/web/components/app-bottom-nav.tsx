'use client'

import { usePathname, useRouter } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'

const PATH_TO_TAB: Record<string, 'home' | 'orders' | 'chat' | 'profile'> = {
  '/home':    'home',
  '/orders':  'orders',
  '/chat':    'chat',
  '/profile': 'profile',
}

export function AppBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const active = PATH_TO_TAB[pathname] ?? 'home'

  return (
    <BottomNav
      active={active}
      onNavigate={(tab) => router.push(`/${tab}`)}
    />
  )
}
