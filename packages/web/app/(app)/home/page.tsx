'use client'

import { HomeScreen } from '@/components/screens/home-screen'
import { useSession } from '@/context/session-context'

// Reference migration for M1.
// Navigation callbacks are no-ops here; M2 will wire router.push for each.
export default function HomePage() {
  const session = useSession()

  return (
    <HomeScreen
      userName={session?.name ?? '...'}
      onCreateOrder={() => {}}
      hasActiveBooking={false}
      isWorker={session?.isWorker ?? false}
      activeMode={session?.activeMode ?? 'user'}
      onModeToggle={() => {}}
    />
  )
}
