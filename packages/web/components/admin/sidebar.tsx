'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Briefcase, ClipboardList,
  Scale, Wallet, Database, LogOut, Home,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin',             label: 'Хяналтын самбар', icon: LayoutDashboard },
  { href: '/admin/workers',     label: 'Ажилтнууд',        icon: Briefcase },
  { href: '/admin/users',       label: 'Хэрэглэгчид',      icon: Users },
  { href: '/admin/orders',      label: 'Захиалгууд',        icon: ClipboardList },
  { href: '/admin/disputes',    label: 'Маргаан',           icon: Scale },
  { href: '/admin/finance',     label: 'Санхүү',            icon: Wallet },
  { href: '/admin/master-data', label: 'Лавлах өгөгдөл',   icon: Database },
]

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/sign-out', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    '{}',
    })
    router.push('/')
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="border-b border-gray-700 px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Home className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none">HomeService</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/20 text-primary'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-700 px-4 py-4">
        <p className="mb-2 truncate text-xs text-gray-400">{adminName}</p>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Гарах
        </button>
      </div>
    </aside>
  )
}
