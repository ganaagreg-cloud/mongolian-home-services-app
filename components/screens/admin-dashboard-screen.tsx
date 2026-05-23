'use client'

import useSWR from 'swr'
import { ClipboardList, DollarSign, Users, AlertTriangle, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import type { AdminStats } from '@/lib/types'

interface AdminDashboardScreenProps {
  onViewVerifications: () => void
  onViewDisputes: () => void
}

const orderStatusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: 'Дууссан',          className: 'bg-success/10 text-success border-0' },
  working:   { label: 'Явагдаж байна',    className: 'bg-accent/10 text-accent border-0' },
  arriving:  { label: 'Ирж байна',        className: 'bg-accent/10 text-accent border-0' },
  accepted:  { label: 'Зөвшөөрсөн',      className: 'bg-primary/10 text-primary border-0' },
  pending:   { label: 'Хүлээгдэж байна', className: 'bg-primary/10 text-primary border-0' },
  cancelled: { label: 'Цуцлагдсан',      className: 'bg-destructive/10 text-destructive border-0' },
}

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) return `₮${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)     return `₮${(amount / 1_000).toFixed(0)}K`
  return `₮${amount.toLocaleString()}`
}

export function AdminDashboardScreen({ onViewVerifications, onViewDisputes }: AdminDashboardScreenProps) {
  const { data: stats, isLoading } = useSWR<AdminStats>('/api/admin/stats', fetcher, { refreshInterval: 30000 })

  return (
    <div className="flex min-h-screen flex-col bg-background pb-8">
      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Админ самбар</h1>
        <p className="text-sm text-muted-foreground">HomeService удирдлагын систем</p>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 px-6">
        <div className="grid grid-cols-2 gap-3">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl bg-card p-4 shadow-sm">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="mt-3 h-7 w-12" />
                <Skeleton className="mt-1 h-3 w-24" />
              </div>
            ))
          ) : (
            <>
              <div className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">{stats?.todayOrders ?? 0}</p>
                <p className="text-xs text-muted-foreground">Өнөөдрийн захиалга</p>
              </div>
              <div className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">{formatRevenue(stats?.totalRevenue ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Нийт орлого</p>
              </div>
              <div className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">{stats?.activeWorkers ?? 0}</p>
                <p className="text-xs text-muted-foreground">Идэвхтэй ажилтан</p>
              </div>
              <div className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">{stats?.openDisputes ?? 0}</p>
                <p className="text-xs text-muted-foreground">Шийдэгдээгүй гомдол</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 px-6 space-y-3">
        <button
          onClick={onViewVerifications}
          className="flex w-full items-center justify-between rounded-2xl bg-primary/10 p-4 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">Ажилтан баталгаажуулалт</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        <button
          onClick={onViewDisputes}
          className="flex w-full items-center justify-between rounded-2xl bg-destructive/10 p-4 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-medium text-foreground">Гомдол шийдвэрлэх</span>
          </div>
          {(stats?.openDisputes ?? 0) > 0 && (
            <Badge className="bg-destructive text-white">{stats!.openDisputes} шийдэгдээгүй</Badge>
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Recent Orders */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Сүүлийн захиалгууд</h2>
        {isLoading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : (stats?.recentOrders?.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Захиалга байхгүй байна</p>
        ) : (
          <div className="mt-4 rounded-2xl bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Захиалагч</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ажилтан</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Үйлчилгээ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Төлөв</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Дүн</th>
                  </tr>
                </thead>
                <tbody>
                  {stats!.recentOrders.map((order, index) => {
                    const cfg = orderStatusConfig[order.status] ?? { label: order.status, className: 'bg-muted text-foreground border-0' }
                    return (
                      <tr key={order.id} className={index !== stats!.recentOrders.length - 1 ? 'border-b border-border' : ''}>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{order.customerName}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{order.workerName}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{order.service}</td>
                        <td className="px-4 py-3">
                          <Badge className={cfg.className}>{cfg.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                          ₮{order.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
