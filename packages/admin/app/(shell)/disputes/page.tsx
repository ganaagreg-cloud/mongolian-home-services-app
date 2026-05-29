'use client'

import { useCallback, useEffect, useState } from 'react'
import { Scale, AlertTriangle, CheckCircle, ImageIcon, X, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Dispute = {
  id: string
  orderId: string
  customerName: string
  workerName: string
  service: string
  issue: string
  status: string
  totalAmount: number
  compensationAmount: number | null
  createdAt: string
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
  disputePhotoUrls: string[]
}

type PageState = 'loading' | 'error' | 'ok'

function toAbsolute(url: string | null): string | null {
  if (!url) return null
  return url.startsWith('/') ? `${BASE}${url}` : url
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('mn-MN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function DisputesPage() {
  const [state, setState]         = useState<PageState>('loading')
  const [disputes, setDisputes]   = useState<Dispute[]>([])
  const [filter, setFilter]       = useState<'open' | 'all'>('open')
  const [resolving, setResolving] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts]     = useState<Record<string, string>>({})
  const [busy, setBusy]           = useState<Record<string, boolean>>({})

  const load = useCallback(() => {
    setState('loading')
    fetch(`${BASE}/api/admin/disputes`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: { success: boolean; data: Dispute[] }) => {
        if (d.success) { setDisputes(d.data); setState('ok') }
        else setState('error')
      })
      .catch(() => setState('error'))
  }, [])

  useEffect(() => { load() }, [load])

  const visible   = filter === 'open' ? disputes.filter(d => d.status === 'open') : disputes
  const openCount = disputes.filter(d => d.status === 'open').length

  async function handleResolve(id: string) {
    const raw          = (amounts[id] ?? '').trim()
    const compensation = raw === '' ? undefined : Number(raw)
    if (compensation !== undefined && (!Number.isInteger(compensation) || compensation < 0)) return

    setBusy(b => ({ ...b, [id]: true }))
    try {
      const r = await fetch(`${BASE}/api/admin/disputes/${id}/resolve`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compensationAmount: compensation }),
      })
      const d = await r.json()
      if (d.success) {
        setDisputes(ds => ds.map(dispute =>
          dispute.id === id
            ? { ...dispute, status: 'resolved', compensationAmount: compensation ?? null }
            : dispute
        ))
        setResolving(r => { const n = { ...r }; delete n[id]; return n })
      }
    } finally {
      setBusy(b => { const n = { ...b }; delete n[id]; return n })
    }
  }

  return (
    <div className="px-8 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Маргаанууд</h1>
          {state === 'ok' && openCount > 0 && (
            <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
              {openCount}
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
      <p className="mt-1 text-sm text-muted-foreground">
        Хэрэглэгч болон ажилтны хоорондох маргааныг зурган нотолгоотой хамт шийдвэрлэнэ үү
      </p>

      {/* Filter chips */}
      {state === 'ok' && (
        <div className="mt-4 flex gap-2">
          {(['open', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors active:scale-95',
                filter === f
                  ? 'bg-primary/10 text-primary'
                  : 'bg-card text-muted-foreground shadow-sm hover:bg-card/80',
              )}
            >
              {f === 'open' ? 'Нээлттэй' : 'Бүгд'}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {/* Loading skeletons */}
        {state === 'loading' && [1, 2, 3].map(i => (
          <div key={i} className="space-y-3 rounded-2xl bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-2xl" />
            </div>
            <Skeleton className="h-5 w-40 rounded-2xl" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-28 rounded-2xl" />
              <Skeleton className="h-4 w-28 rounded-2xl" />
            </div>
            <Skeleton className="h-4 w-3/4 rounded-2xl" />
            <div className="flex gap-2">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <Skeleton className="h-20 w-20 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-full rounded-2xl" />
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
        {state === 'ok' && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Scale className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-4 font-semibold text-foreground">
              {filter === 'open' ? 'Нээлттэй маргаан байхгүй' : 'Маргаан бүртгэгдээгүй байна'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === 'open' ? 'Шинэ маргаан ирэхэд энд харагдана' : ''}
            </p>
          </div>
        )}

        {/* Dispute cards */}
        {state === 'ok' && visible.map(dispute => {
          const isOpen      = dispute.status === 'open'
          const isResolving = !!resolving[dispute.id]
          const isBusy      = !!busy[dispute.id]

          // Collect all evidence photos — absolute URLs, labelled
          const photos = [
            dispute.beforePhotoUrl && { url: toAbsolute(dispute.beforePhotoUrl)!, label: 'Өмнө' },
            dispute.afterPhotoUrl  && { url: toAbsolute(dispute.afterPhotoUrl)!,  label: 'Дараа' },
            ...dispute.disputePhotoUrls.map(u => ({ url: toAbsolute(u)!, label: 'Нотолгоо' })),
          ].filter(Boolean) as { url: string; label: string }[]

          return (
            <div key={dispute.id} className="rounded-2xl bg-card p-5 shadow-sm">
              {/* Status + date */}
              <div className="flex items-center justify-between gap-3">
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                  isOpen
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-success/10 text-success',
                )}>
                  {isOpen ? 'Нээлттэй' : 'Шийдэгдсэн'}
                </span>
                <span className="text-xs text-muted-foreground">{fmtDate(dispute.createdAt)}</span>
              </div>

              {/* Service */}
              <p className="mt-2 font-semibold text-foreground">{dispute.service}</p>

              {/* Parties — names only, no phone numbers */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  Хэрэглэгч: <span className="font-medium text-foreground">{dispute.customerName}</span>
                </span>
                <span className="text-border">·</span>
                <span className="text-muted-foreground">
                  Ажилтан: <span className="font-medium text-foreground">{dispute.workerName}</span>
                </span>
              </div>

              {/* Issue */}
              <p className="mt-2 text-sm text-foreground">{dispute.issue}</p>

              {/* Amounts */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  Захиалгын дүн:{' '}
                  <span className="font-semibold text-foreground">
                    ₮{dispute.totalAmount.toLocaleString()}
                  </span>
                </span>
                {dispute.compensationAmount !== null && (
                  <span className="text-muted-foreground">
                    Нөхөн олговор:{' '}
                    <span className="font-semibold text-primary">
                      ₮{dispute.compensationAmount.toLocaleString()}
                    </span>
                  </span>
                )}
              </div>

              {/* Photo evidence */}
              {photos.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Зурган нотолгоо</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {photos.map((photo, idx) => (
                      <a
                        key={idx}
                        href={photo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative shrink-0"
                      >
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="h-20 w-20 rounded-xl object-cover transition-opacity group-hover:opacity-80"
                          onError={e => {
                            const el = e.target as HTMLImageElement
                            el.style.display = 'none'
                          }}
                        />
                        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/50 px-1 py-0.5 text-[10px] font-medium text-white">
                          {photo.label}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
                  <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Зурган нотолгоо оруулаагүй</span>
                </div>
              )}

              {/* Resolve CTA */}
              {isOpen && !isResolving && (
                <button
                  onClick={() => setResolving(r => ({ ...r, [dispute.id]: true }))}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90 active:scale-95"
                >
                  <CheckCircle className="h-4 w-4" />
                  Шийдвэрлэх
                </button>
              )}

              {/* Resolve form */}
              {isOpen && isResolving && (
                <div className="mt-4 rounded-2xl border border-border p-4">
                  <p className="text-sm font-medium text-foreground">
                    Нөхөн олговор (MNT)
                    <span className="ml-1 text-xs text-muted-foreground">— заавал биш</span>
                  </p>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={amounts[dispute.id] ?? ''}
                    onChange={e => setAmounts(a => ({ ...a, [dispute.id]: e.target.value }))}
                    placeholder="0"
                    className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setResolving(r => { const n = { ...r }; delete n[dispute.id]; return n })}
                      className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-border text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 active:scale-95"
                    >
                      <X className="h-4 w-4" />
                      Болих
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => handleResolve(dispute.id)}
                      className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-success text-sm font-medium text-white shadow-md transition-colors hover:bg-success/90 active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Баталгаажуулах
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
