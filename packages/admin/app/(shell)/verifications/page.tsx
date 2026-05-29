'use client'

import { useCallback, useEffect, useState } from 'react'
import { User, ShieldCheck, ShieldX, FileX, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type PendingWorker = {
  id: string
  name: string
  phone: string
  specialty: string
  danVerified: boolean
  policeFile: string | null
  createdAt: string
}

type PageState = 'loading' | 'error' | 'ok'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('mn-MN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function VerificationsPage() {
  const [state, setState]     = useState<PageState>('loading')
  const [workers, setWorkers] = useState<PendingWorker[]>([])
  const [busy, setBusy]       = useState<Record<string, boolean>>({})

  const load = useCallback(() => {
    setState('loading')
    fetch(`${BASE}/api/admin/workers/pending`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: { success: boolean; data: PendingWorker[] }) => {
        if (d.success) { setWorkers(d.data); setState('ok') }
        else setState('error')
      })
      .catch(() => setState('error'))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleVerify(id: string, action: 'approve' | 'reject') {
    setBusy(b => ({ ...b, [id]: true }))
    try {
      const r = await fetch(`${BASE}/api/admin/workers/${id}/verify`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const d = await r.json()
      if (d.success) setWorkers(ws => ws.filter(w => w.id !== id))
    } finally {
      setBusy(b => { const n = { ...b }; delete n[id]; return n })
    }
  }

  return (
    <div className="px-8 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Баталгаажуулалтууд</h1>
          {state === 'ok' && workers.length > 0 && (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              {workers.length}
            </span>
          )}
        </div>
        {state !== 'loading' && (
          <button
            onClick={load}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm transition-colors hover:bg-card/80 active:scale-95"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Ажилтны DAN болон цагдаагийн тодорхойлолт шалгаж баталгаажуулна уу
      </p>

      <div className="mt-6 space-y-3">
        {/* Loading */}
        {state === 'loading' && [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl bg-card p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36 rounded-2xl" />
                <Skeleton className="h-3 w-24 rounded-2xl" />
                <Skeleton className="h-3 w-20 rounded-2xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
            </div>
          </div>
        ))}

        {/* Error */}
        {state === 'error' && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldX className="h-8 w-8 text-destructive" />
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
        {state === 'ok' && workers.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <ShieldCheck className="h-8 w-8 text-success" />
            </div>
            <p className="mt-4 font-semibold text-foreground">Хүлээгдэж буй баталгаажуулалт байхгүй</p>
            <p className="mt-1 text-sm text-muted-foreground">Шинэ хүсэлт ирэхэд энд харагдана</p>
          </div>
        )}

        {/* Worker cards */}
        {state === 'ok' && workers.map(worker => {
          const isBusy    = !!busy[worker.id]
          const hasPolice = !!worker.policeFile

          return (
            <div key={worker.id} className="rounded-2xl bg-card p-5 shadow-sm">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>

                {/* Name + meta */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{worker.name}</p>
                  {worker.specialty && (
                    <p className="text-sm text-muted-foreground">{worker.specialty}</p>
                  )}
                  <div className="mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{fmtDate(worker.createdAt)}</span>
                  </div>
                </div>

                {/* DAN + Police badges */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    worker.danVerified
                      ? 'bg-success/10 text-success'
                      : 'bg-accent/10 text-accent',
                  )}>
                    {worker.danVerified ? 'DAN баталгаатай' : 'DAN хүлээгдэж байна'}
                  </span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    hasPolice
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive',
                  )}>
                    {hasPolice ? 'Цагдаа баталгаатай' : 'Цагдаа байхгүй'}
                  </span>
                </div>
              </div>

              {/* Police file link */}
              {worker.policeFile && (
                <a
                  href={worker.policeFile}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <FileX className="h-3.5 w-3.5" />
                  Цагдаагийн тодорхойлолт харах
                </a>
              )}

              {/* Approve / Reject */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  disabled={isBusy}
                  onClick={() => handleVerify(worker.id, 'reject')}
                  className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-border text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:scale-95 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4 shrink-0" />
                  Татгалзах
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => handleVerify(worker.id, 'approve')}
                  className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Зөвшөөрөх
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
