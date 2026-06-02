'use client'

import { useRouter } from 'next/navigation'
import { HomeScreen } from '@/components/screens/home-screen'
import { useSession } from '@/context/session-context'

export default function HomePage() {
  const session = useSession()
  const router = useRouter()

  return (
    <HomeScreen
      userName={session?.name ?? '...'}
      onCreateOrder={() => router.push('/orders/new')}
      hasActiveBooking={false}
    />
  )
}
