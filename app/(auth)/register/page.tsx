'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Registration is now handled by the main SPA at /
export default function RegisterPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/') }, [router])
  return null
}
