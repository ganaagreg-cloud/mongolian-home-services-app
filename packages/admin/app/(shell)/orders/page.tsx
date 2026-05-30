'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, AlertTriangle, RefreshCw, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Order = {
  id: string
  service: string
  status: string
  address: string
  total_amount: number
  payment_status: string
  scheduled_date: string
  created_at: string
  matching_strategy: string
  urgent: boolean
  customer_name: string
  worker_name: string | null
}

type ServiceType = { id: number; name_mn: string }
type PageState = 'loading' | 'error' | 'ok'

const STATUS_LABELS: Record<string, string> = {
  pending_acceptances:       'Хүлээж байна',
  searching_worker:          'Хайж байна',
  pending_worker_acceptance: 'Ажилтан хүлээж байна',
  pending_payment:           'Төлбөр хүлээж байна',
  worker_assigned:           'Ажилтан томилогдсон',
  worker_on_the_way:         'Ажилтан замд байна',
  in_progress:               'Хийгдэж байна',
  completed:                 'Дууссан',
  rated:                     'Үнэлгээ өгсөн',
  cancelled_by_user:         'Хэрэглэгч цуцалсан',
  cancelled_by_worker:       'Ажилтан цуцалсан',
  no_workers_found:          'Ажилтан олдсонгүй',
}

const STATUS_COLORS: Record<string, string> = {
  completed:   'bg-success/10 text-success',
  rated:       'bg-success/10 text-success',
  in_progress: 'bg-primary/10 text-primary',
  worker_on_the_way: 'bg-primary/10 text-primary',
  worker_assigned:   'bg-primary/10 text-primary',
  cancelled_by_user:   'bg-destructive/10 text-destructive',
  cancelled_by_worker: 'bg-destructive/10 text-destructive',
  no_workers_found:    'bg-destructive/10 text-destructive',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('mn-MN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('mn-MN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function OrdersPage() {
  const [state, setState]           = useState<PageState>('loading')
  const [orders, setOrders]         = useState<Order[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [total, setTotal]           = useState(0)
  const [pages, setPages]           = useState(1)
  const [page, setPage]             = useState(1)

  const [q, setQ]                   = useState('')
  const [status, setStatus]         = useState('')
  const [serviceId, setServiceId]   = useState('')

  const load = useCallback(() => {
    setState('loading')
    const params = new URLSearchParams()
    if (q)         params.set('q', q)
    if (status)    params.set('status', status)
    if (serviceId) params.set('service', serviceId)
    params.set('page', String(page))

    fetch(`${BASE}/api/admin/orders?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: { success: boolean; data: Order[]; total: number; pages: number }) => {
        if (d.success) {
          setOrders(d.data)
          setTotal(d.total)
          setPages(d.pages)
          setState('ok')
        } else {
          setState('error')
        }
      })
      .catch(() => setState('error'))
  }, [q, status, serviceId, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch(`${BASE}/api/service-types`)
      .then(r => r.json())
      .then((d: { success: boolean; data?: ServiceType[] }) => {
        if (d.success && d.data) setServiceTypes(d.data)
      })
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  return (
    <div className="px-8 pt-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Захиалгууд</h1>
          {state === 'ok' && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {total}
            </span>
          )}
        </div>
        {state !== 'loading' && (
          <button
            onClick={load}
            aria-label="Шинэчлэх"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm transition-colors hover:bg-card/80 active:scale-95"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Бүх захиалгыг харах, шүүх</p>

      {/* Filters */}
      <form onSubmit={handleSearch} className="mt-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Хэрэглэгч, ажилтан, хаяг..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            className="h-10 w-full rounded-2xl border border-border bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="h-10 rounded-2xl border border-border bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">Бүх төлөв</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select
          value={serviceId}
          onChange={e => { setServiceId(e.target.value); setPage(1) }}
          className="h-10 rounded-2xl border border-border bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">Бүх үйлчилгээ</option>
          {serviceTypes.map(s => (
            <option key={s.id} value={String(s.id)}>{s.name_mn}</option>
          ))}
        </select>
      </form>

      <div className="mt-4 space-y-2">
        {/* Loading */}
        {state === 'loading' && [1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48 rounded-2xl" />
              <Skeleton className="h-3 w-32 rounded-2xl" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}

        {/* Error */}
        {state === 'error' && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <p className="mt-4 font-semibold text-foreground">Өгөгдөл ачаалахад алдаа гарлаа</p>
            <button
              onClick={load}
              className="mt-4 flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-card/80 active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Дахин оролдох
            </button>
          </div>
        )}

        {/* Empty */}
        {state === 'ok' && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-4 font-semibold text-foreground">Захиалга олдсонгүй</p>
            <p className="mt-1 text-sm text-muted-foreground">Шүүлтүүрийг өөрчилж дахин хайна уу</p>
          </div>
        )}

        {/* Order rows */}
        {state === 'ok' && orders.map(order => (
          <div key={order.id} className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{order.service || '—'}</span>
                  {order.urgent && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      Яаралтай
                    </span>
                  )}
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    STATUS_COLORS[order.status] ?? 'bg-muted/50 text-muted-foreground',
                  )}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{order.address}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>
                    Хэрэглэгч: <span className="font-medium text-foreground">{order.customer_name}</span>
                  </span>
                  {order.worker_name && (
                    <span>
                      Ажилтан: <span className="font-medium text-foreground">{order.worker_name}</span>
                    </span>
                  )}
                  <span>
                    {order.matching_strategy === 'instant' ? 'Шуурхай' : `Цаг: ${fmtDateTime(order.scheduled_date)}`}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold text-primary">₮{order.total_amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(order.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {state === 'ok' && pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-card/80 disabled:opacity-40 active:scale-95"
          >
            ‹
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage(p => p + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-card/80 disabled:opacity-40 active:scale-95"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
