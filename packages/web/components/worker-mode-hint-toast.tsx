'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

export function WorkerModeHintToast() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()
  const { toast }    = useToast()

  useEffect(() => {
    if (searchParams.get('hint') === 'worker_mode') {
      toast({ description: 'Ажилтны горимд шилжинэ үү' })
      router.replace(pathname, { scroll: false })
    }
  }, [searchParams, toast, router, pathname])

  return null
}
