'use client'

import { ShieldX, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export default function BlockedState() {
  async function handleSignOut() {
    await authClient.signOut()
    window.location.href = '/'
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-foreground">Хандах эрх байхгүй</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Энэ хуудсыг зөвхөн администратор харж болно
      </p>
      <Button
        variant="outline"
        className="mt-6 rounded-2xl"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" />
        Гарах
      </Button>
    </div>
  )
}
