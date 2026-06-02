'use client'

import { usePathname, useRouter } from 'next/navigation'
import { WorkerBottomNav } from '@/components/worker-bottom-nav'

const PATH_TO_TAB: Record<string, 'jobs' | 'active' | 'chat' | 'earnings' | 'profile'> = {
  '/jobs':         'jobs',
  '/worker-active':   'active',
  '/chat':         'chat',
  '/worker-earnings': 'earnings',
  '/worker-profile':  'profile',
}

export function AppWorkerBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const active = PATH_TO_TAB[pathname] ?? 'jobs'

  return (
    <WorkerBottomNav
      active={active}
      onNavigate={(tab) => {
        if (tab === 'jobs')     router.push('/jobs')
        else if (tab === 'active')   router.push('/worker-active')
        else if (tab === 'chat')     router.push('/chat')
        else if (tab === 'earnings') router.push('/worker-earnings')
        else if (tab === 'profile')  router.push('/worker-profile')
      }}
    />
  )
}
