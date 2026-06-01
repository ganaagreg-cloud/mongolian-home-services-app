'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShieldCheck, Scale, ClipboardList, Users, Database, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'

const navItems = [
  { href: '/dashboard',      label: 'Хянах самбар',      icon: LayoutDashboard },
  { href: '/workers',        label: 'Ажилтнууд',          icon: Users },
  { href: '/verifications',  label: 'Баталгаажуулалт',   icon: ShieldCheck },
  { href: '/disputes',       label: 'Маргаанууд',         icon: Scale },
  { href: '/orders',         label: 'Захиалгууд',         icon: ClipboardList },
  { href: '/master-data',   label: 'Мастер дата',        icon: Database },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  async function handleSignOut() {
    await Promise.allSettled([
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/admin/logout`,
        { method: 'POST', credentials: 'include' },
      ),
      authClient.signOut(),
    ])
    window.location.href = '/login'
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <LayoutDashboard className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-foreground">HS Admin</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors active:scale-95',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-border px-3 py-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Гарах
        </button>
      </div>
    </aside>
  )
}
