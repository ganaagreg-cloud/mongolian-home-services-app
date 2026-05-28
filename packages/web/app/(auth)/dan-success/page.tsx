'use client'

import { useRouter } from 'next/navigation'
import { DANSuccessScreen } from '@/components/dan-success-screen'

export default function DANSuccessPage() {
  const router = useRouter()
  return <DANSuccessScreen onContinue={() => router.push('/')} />
}
