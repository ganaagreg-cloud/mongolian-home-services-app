'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, History, Heart, Bell, HelpCircle, Shield, LogOut, Briefcase, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSession } from '@/context/session-context'
import { authClient } from '@/lib/auth-client'

const menuItems: Array<{ id: string; icon: React.ComponentType<{ className?: string }>; label: string; href: string | null }> = [
  { id: 'settings',      icon: UserCircle, label: 'Хувийн мэдээлэл',     href: '/settings'      },
  { id: 'orders',        icon: History,    label: 'Захиалгын түүх',       href: '/orders'        },
  { id: 'saved-workers', icon: Heart,      label: 'Хадгалсан ажилтнууд', href: '/saved-workers' },
  { id: 'notifications', icon: Bell,       label: 'Мэдэгдэл',            href: null             },
  { id: 'help',          icon: HelpCircle, label: 'Тусламж',             href: '/help'          },
  { id: 'privacy',       icon: Shield,     label: 'Нууцлал',             href: '/privacy'       },
]

export function ProfileScreen() {
  const router = useRouter()
  const session = useSession()
  const userName = session?.name ?? ''
  const isWorker = session?.isWorker ?? false

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Профайл</h1>
      </div>

      {/* Profile Card */}
      <div className="mt-6 mx-6 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <Avatar className="h-16 w-16">
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
            {userName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-lg font-semibold text-foreground">{userName}</p>
          <p className="text-sm text-muted-foreground">
            Утас нэмааг?й
          </p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="mt-6 mx-6 rounded-2xl bg-card shadow-sm overflow-hidden">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => { if (item.href) router.push(item.href) }}
              className={`flex w-full items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 ${
                index !== menuItems.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          )
        })}
      </div>

      {/* Become Worker Button — hidden once already a worker */}
      {!isWorker && (
        <div className="mt-6 mx-6">
          <Button
            onClick={() => router.push('/worker-register')}
            variant="outline"
            className="h-14 w-full rounded-2xl border-accent text-accent font-semibold shadow-sm hover:bg-accent/10"
          >
            <Briefcase className="mr-2 h-5 w-5" />
            Ажилтнаар бүртгүүлэх
          </Button>
        </div>
      )}

      {/* Logout Button */}
      <div className="mt-4 mx-6">
        <Button
          onClick={() => { void handleLogout() }}
          variant="ghost"
          className="h-14 w-full rounded-2xl text-destructive font-semibold hover:bg-destructive/10"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Гарах
        </Button>
      </div>
    </div>
  )
}
