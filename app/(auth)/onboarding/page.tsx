'use client'

import { useRouter } from 'next/navigation'
import { OnboardingScreen } from '@/components/onboarding-screen'

export default function OnboardingPage() {
  const router = useRouter()
  return <OnboardingScreen onComplete={() => router.push('/login')} />
}
