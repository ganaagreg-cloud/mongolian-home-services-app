'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabItem = { href: string; icon: LucideIcon; label: string }

// Floating pill tab bar. Rendered only on tab roots: drill-down screens own the
// bottom edge (fixed CTAs, chat composer) and carry their own back button, so the
// bar must never sit on top of them.
export function FloatingTabBar({ items }: { items: readonly TabItem[] }) {
  const pathname = usePathname()
  if (!items.some((item) => item.href === pathname)) return null

  return (
    <nav
      aria-label="Үндсэн цэс"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[390px] px-4 pb-[max(env(safe-area-inset-bottom),16px)]"
    >
      <div className="pointer-events-auto flex h-[68px] items-center justify-between rounded-[26px] bg-card/95 px-2.5 shadow-float backdrop-blur-xl">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'pressable flex h-12 items-center justify-center gap-2 rounded-[18px] text-[13px] font-extrabold',
                active
                  ? 'bg-primary px-4 text-primary-foreground shadow-brand'
                  : 'w-12 text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.2 : 2} />
              {active && <span className="animate-in fade-in slide-in-from-left-1 duration-300">{label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
