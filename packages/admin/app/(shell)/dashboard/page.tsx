'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, ClipboardList, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type RecentOrder = {
  id: string
  customerName: string
  workerName: string
  service: string
  status: string
  totalAmount: number
  createdAt: string
}

type Stats = {
  todayOrders: number
  todayRevenue: number
  activeWorkers: number
  openDisputes: number
  pendingWorkers: number
  recentOrders: RecentOrder[]
}

const STATUS_LABEL: Record<string, string> = {
  pending:            'Хүлээгдэж буй',
  matched:            'Тохирсон',
  accepted:           'Хүлээн авсан',
  in_progress:        'Явагдаж байна',
  completed:          'Дууссан',
  rated:              'Үнэлэгдсэн',
  cancelled:          'Цуцлагдсан',
  cancelled_by_admin: 'Цуцлагдсан',
}

const STATUS_CLASS: Record<string, string> = {
  pending:            'bg-accent/10 text-accent',
  matched:            'bg-primary/10 text-primary',
  accepted:           'bg-primary/10 text-primary',
  in_progress:        'bg-primary/10 text-primary',
  completed:          'bg-success/10 text-success',
  rated:              'bg-success/10 text-success',
  cancelled:          'bg-destructive/10 text-destructive',
  cancelled_by_admin: 'bg-destructive/10 text-destructive',
}

function fmtMNT(v: number) {
  return '₮' + v.toLocaleString('mn-MN')
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Дөнгөж сая'
  if (m < 60) return `${m} минутын өмнө`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} цагийн өмнө`
  const d = Math.floor(h / 24)
  return `${d} өдрийн өмнө`
}

export default function DashboardPage() {
  const [stats, setStats]   = useState<Stats | null>(null)
  const [error, setError]   = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    fetch(`${BASE}/api/admin/stats`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: { success: boolean; data: Stats }) => {
        if (d.success) setStats(d.data)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const statCards = stats
    ? [
        { label: 'Өнөөдрийн захиалга',     value: String(stats.todayOrders),    icon: ClipboardList, color: 'text-success',     bg: 'bg-success/10'     },
        { label: 'Идэвхтэй ажилтан',        value: String(stats.activeWorkers),  icon: Users,         color: 'text-primary',     bg: 'bg-primary/10'     },
        { label: 'Хүлээгдэж буй маргаан',   value: String(stats.openDisputes),   icon: AlertTriangle, color: 'text-accent',      bg: 'bg-accent/10'      },
        { label: 'Шинэ баталгаажуулалт',    value: String(stats.pendingWorkers), icon: ShieldCheck,   color: 'text-primary',     bg: 'bg-primary/10'     },
      ]
    : [
        { label: 'Өнөөдрийн захиалга',     value: '—', icon: ClipboardList, color: 'text-success',  bg: 'bg-success/10'  },
        { label: 'Идэвхтэй ажилтан',       value: '—', icon: Users,         color: 'text-primary',  bg: 'bg-primary/10'  },
        { label: 'Хүлээгдэж буй маргаан',  value: '—', icon: AlertTriangle, color: 'text-accent',   bg: 'bg-accent/10'   },
        { label: 'Шинэ баталгаажуулалт',   value: '—', icon: ShieldCheck,   color: 'text-primary',  bg: 'bg-primary/10'  },
      ]

  return (
    <div className="px-8 pt-8 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Хянах самбар</h1>
        <button
          onClick={load}
          disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Revenue banner */}
      {stats && (
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 shadow-lg">
          <p className="text-sm text-primary-foreground/70">Өнөөдрийн орлого</p>
          <p className="mt-1 text-3xl font-bold text-primary-foreground">{fmtMNT(stats.todayRevenue)}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statCards.map(stat => (
          <div key={stat.label} className="rounded-2xl bg-card p-5 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            {loading
              ? <Skeleton className="mt-3 h-7 w-16" />
              : <p className="mt-3 text-2xl font-bold text-foreground">{stat.value}</p>
            }
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="mt-6 rounded-2xl bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Сүүлийн идэвхжил</h2>
        </div>

        {loading && (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Өгөгдөл ачаалахад алдаа гарлаа</p>
            <button onClick={load} className="mt-3 text-sm font-medium text-primary hover:underline active:scale-95 transition-all">
              Дахин оролдох
            </button>
          </div>
        )}

        {!loading && !error && stats?.recentOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Одоогоор захиалга байхгүй байна</p>
          </div>
        )}

        {!loading && !error && (stats?.recentOrders ?? []).length > 0 && (
          <div className="divide-y divide-border">
            {stats!.recentOrders.map(order => (
              <div key={order.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {order.customerName}
                    <span className="ml-1 font-normal text-muted-foreground">→</span>
                    <span className="ml-1 font-normal text-muted-foreground">{order.workerName}</span>
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {order.service || 'Үйлчилгээ'} · {fmtRelative(order.createdAt)}
                  </p>
                </div>
                <span className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  STATUS_CLASS[order.status] ?? 'bg-muted text-muted-foreground',
                )}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
                <p className="shrink-0 text-sm font-semibold text-foreground">
                  {fmtMNT(order.totalAmount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
