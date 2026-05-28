'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingCart, TrendingUp, Briefcase, Scale } from 'lucide-react'

type Stats = {
  todayOrders:  number
  totalRevenue: number
  activeWorkers: number
  openDisputes: number
  recentOrders: {
    id: string; customerName: string; workerName: string
    service: string; status: string; totalAmount: number
  }[]
}

type OrderDetail = {
  id: string; service: string; status: string; address: string
  total_amount: number; scheduled_date: string; customer_name: string
  worker_name: string; payment_status: string; matching_strategy: string
  messages: { sender_name: string; text: string; created_at: string }[]
  transactions: { amount: number; type: string; created_at: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  searching_worker:       'bg-yellow-100 text-yellow-800',
  pending_worker_acceptance: 'bg-blue-100 text-blue-800',
  worker_assigned:        'bg-indigo-100 text-indigo-800',
  worker_on_the_way:      'bg-purple-100 text-purple-800',
  in_progress:            'bg-orange-100 text-orange-800',
  completed:              'bg-green-100 text-green-800',
  rated:                  'bg-green-200 text-green-900',
  cancelled_by_user:      'bg-red-100 text-red-800',
  cancelled_by_admin:     'bg-red-200 text-red-900',
  no_workers_found:       'bg-gray-100 text-gray-700',
}

function fmt(n: number) { return n.toLocaleString('mn-MN') }

export default function AdminDashboard() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail]   = useState<OrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((j) => { if (j.success) setStats(j.data) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    setDetailLoading(true)
    fetch(`/api/admin/orders/${selected}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setDetail(j.data) })
      .finally(() => setDetailLoading(false))
  }, [selected])

  const STAT_CARDS = stats ? [
    { label: 'Өнөөдрийн захиалга', value: stats.todayOrders, icon: ShoppingCart, color: 'text-blue-600' },
    { label: 'Нийт орлого (₮)',     value: fmt(stats.totalRevenue), icon: TrendingUp, color: 'text-green-600' },
    { label: 'Идэвхтэй ажилтан',   value: stats.activeWorkers, icon: Briefcase, color: 'text-purple-600' },
    { label: 'Нээлттэй маргаан',   value: stats.openDisputes, icon: Scale, color: 'text-red-600' },
  ] : []

  return (
    <div className="px-8 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Хяналтын самбар</h1>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))
          : STAT_CARDS.map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-4 p-6">
                  <s.icon className={`h-8 w-8 ${s.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{String(s.value)}</p>
                    <p className="text-sm text-gray-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Сүүлийн захиалгууд</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Харилцагч</TableHead>
                  <TableHead>Үйлчилгээ</TableHead>
                  <TableHead>Ажилтан</TableHead>
                  <TableHead>Төлөв</TableHead>
                  <TableHead className="text-right">Дүн (₮)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.recentOrders.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelected(o.id)}
                  >
                    <TableCell className="font-mono text-sm">#{o.id}</TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell>{o.service}</TableCell>
                    <TableCell>{o.workerName}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {o.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmt(o.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order detail modal */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Захиалга #{selected}</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Харилцагч', detail.customer_name],
                  ['Ажилтан',   detail.worker_name ?? '—'],
                  ['Үйлчилгээ', detail.service],
                  ['Төлөв',     detail.status],
                  ['Хаяг',      detail.address],
                  ['Дүн',       `₮${fmt(detail.total_amount)}`],
                  ['Төлбөр',    detail.payment_status],
                  ['Стратеги',  detail.matching_strategy],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="font-medium text-gray-900">{v}</p>
                  </div>
                ))}
              </div>
              {detail.messages.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-gray-700">Чат ({detail.messages.length})</p>
                  <div className="max-h-32 overflow-y-auto rounded border p-2 text-xs space-y-1">
                    {detail.messages.map((m, i) => (
                      <p key={i}><span className="font-medium">{m.sender_name}:</span> {m.text}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
