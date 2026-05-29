'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Check, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import { apiFetch } from '@/lib/api-fetch'
import type { AdminDispute } from '@/lib/types'

interface AdminDisputesScreenProps {
  onBack: () => void
}

export function AdminDisputesScreen({ onBack }: AdminDisputesScreenProps) {
  const { data: disputes, isLoading, mutate } = useSWR<AdminDispute[]>(
    '/api/admin/disputes', fetcher,
  )

  const [selected, setSelected] = useState<AdminDispute | null>(null)
  const [compensationAmount, setCompensationAmount] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const handleResolve = async () => {
    if (!selected) return
    setIsResolving(true)
    setResolveError(null)
    try {
      const amount = parseInt(compensationAmount) || 0
      const res = await apiFetch(`/api/admin/disputes/${selected.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compensationAmount: amount > 0 ? amount : undefined }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (!data.success) {
        setResolveError(data.error ?? 'Алдаа гарлаа')
        return
      }
      await mutate()
      setSelected(null)
      setCompensationAmount('')
    } finally {
      setIsResolving(false)
    }
  }

  const pendingCount = (disputes ?? []).filter((d) => d.status === 'open').length

  if (selected) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-12">
          <button
            onClick={() => { setSelected(null); setCompensationAmount(''); setResolveError(null) }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Гомдол шийдвэрлэх</h1>
        </div>

        {/* Dispute Info */}
        <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Захиалагч</p>
              <p className="font-semibold text-foreground">{selected.customerName}</p>
            </div>
            <Badge className={selected.status === 'open'
              ? 'bg-accent/10 text-accent border-0'
              : 'bg-success/10 text-success border-0'}
            >
              {selected.status === 'open' ? 'Шийдэгдэж байна' : 'Дууссан'}
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">Ажилтан</p>
            <p className="font-medium text-foreground">{selected.workerName}</p>
          </div>
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">Үйлчилгээ</p>
            <p className="font-medium text-foreground">{selected.service}</p>
          </div>
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">Захиалгын дүн</p>
            <p className="font-medium text-foreground">₮{selected.totalAmount.toLocaleString()}</p>
          </div>
          {selected.compensationAmount != null && (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">Барагдуулсан дүн</p>
              <p className="font-semibold text-success">₮{selected.compensationAmount.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Issue */}
        <div className="mt-4 mx-6">
          <h2 className="font-semibold text-foreground">Гомдлын утга</h2>
          <div className="mt-2 rounded-2xl bg-destructive/10 p-4">
            <p className="text-sm text-foreground">{selected.issue}</p>
          </div>
        </div>

        {/* Before/After placeholder */}
        <div className="mt-4 mx-6">
          <h2 className="font-semibold text-foreground">Өмнө / Дараа зураг</h2>
          <div className="mt-2 flex gap-3">
            <div className="flex-1 aspect-square rounded-2xl bg-card shadow-sm flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Өмнө</span>
            </div>
            <div className="flex-1 aspect-square rounded-2xl bg-card shadow-sm flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Дараа</span>
            </div>
          </div>
        </div>

        {/* Compensation input */}
        {selected.status === 'open' && (
          <div className="mt-4 mx-6">
            <h2 className="font-semibold text-foreground">Хохирол барагдуулах дүн</h2>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₮</span>
              <Input
                type="number"
                placeholder="0"
                value={compensationAmount}
                onChange={(e) => setCompensationAmount(e.target.value)}
                className="h-12 rounded-2xl border-border bg-card pl-8 text-lg shadow-sm"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Максимум: ₮{selected.totalAmount.toLocaleString()}
            </p>
          </div>
        )}

        {/* Resolve button */}
        {selected.status === 'open' && (
          <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
            {resolveError && (
              <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
                {resolveError}
              </p>
            )}
            <Button
              onClick={() => { void handleResolve() }}
              disabled={isResolving}
              className="h-14 w-full rounded-2xl bg-primary font-semibold shadow-md disabled:opacity-50 active:scale-95 transition-all"
            >
              {isResolving ? 'Хадгалж байна...' : 'Хохирол барагдуулах'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Гомдол шийдвэрлэх</h1>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="mt-6 mx-6 flex gap-3">
          <div className="flex-1 rounded-2xl bg-accent/10 p-4 text-center">
            <p className="text-2xl font-bold text-accent">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Шийдэгдэж байна</p>
          </div>
          <div className="flex-1 rounded-2xl bg-success/10 p-4 text-center">
            <p className="text-2xl font-bold text-success">{(disputes?.length ?? 0) - pendingCount}</p>
            <p className="text-xs text-muted-foreground">Дууссан</p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Бүх гомдол</h2>
        {isLoading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : (disputes?.length ?? 0) === 0 ? (
          <div className="mt-8 rounded-2xl bg-card p-8 shadow-sm text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto">
              <Check className="h-8 w-8 text-success" />
            </div>
            <p className="mt-4 font-medium text-foreground">Гомдол байхгүй байна</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {disputes!.map((dispute) => (
              <button
                key={dispute.id}
                onClick={() => setSelected(dispute)}
                className="flex w-full items-start gap-4 rounded-2xl bg-card p-4 shadow-sm text-left active:scale-95 transition-all"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  dispute.status === 'open' ? 'bg-accent/10' : 'bg-success/10'
                }`}>
                  {dispute.status === 'open' ? (
                    <Clock className="h-5 w-5 text-accent" />
                  ) : (
                    <Check className="h-5 w-5 text-success" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground truncate">{dispute.customerName}</p>
                    <Badge className={dispute.status === 'open'
                      ? 'shrink-0 bg-accent/10 text-accent border-0'
                      : 'shrink-0 bg-success/10 text-success border-0'}
                    >
                      {dispute.status === 'open' ? 'Шийдэгдэж байна' : 'Дууссан'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{dispute.service} - {dispute.workerName}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{dispute.issue}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
