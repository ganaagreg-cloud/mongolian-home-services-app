'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Check, X, CreditCard, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import type { AdminBankingWorker } from '@/lib/types'

interface AdminBankingScreenProps {
  onBack: () => void
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Харилцах данс',
  savings:  'Хадгаламж',
}

export function AdminBankingScreen({ onBack }: AdminBankingScreenProps) {
  const { data: workers, isLoading, mutate } = useSWR<AdminBankingWorker[]>(
    '/api/admin/banking', fetcher,
  )

  const [selected, setSelected] = useState<AdminBankingWorker | null>(null)
  const [isActing, setIsActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const act = async (action: 'approve' | 'reject') => {
    if (!selected) return
    setIsActing(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/banking/${selected.workerId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (!data.success) {
        setActionError(data.error ?? 'Алдаа гарлаа')
        return
      }
      await mutate()
      setSelected(null)
    } finally {
      setIsActing(false)
    }
  }

  if (selected) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-12">
          <button
            onClick={() => { setSelected(null); setActionError(null) }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Банкны мэдээлэл</h1>
        </div>

        {/* Worker Info */}
        <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                {selected.workerName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-foreground">{selected.workerName}</p>
              <p className="text-sm text-muted-foreground">{selected.phone}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(selected.submittedAt).toLocaleDateString('mn-MN')}
              </p>
            </div>
          </div>
        </div>

        {/* Banking Details */}
        <div className="mt-4 mx-6">
          <h2 className="font-semibold text-foreground">Данс мэдээлэл</h2>
          <div className="mt-2 rounded-2xl bg-card shadow-sm overflow-hidden">
            {[
              { label: 'Банк',           value: selected.bankName },
              { label: 'Данс',           value: selected.accountNumber },
              { label: 'Данс эзэмшигч', value: selected.accountHolderName },
              { label: 'IBAN',           value: selected.iban },
              { label: 'Данс төрөл',    value: ACCOUNT_TYPE_LABELS[selected.accountType] ?? selected.accountType },
            ].map((item, index, arr) => (
              <div
                key={item.label}
                className={`flex items-center justify-between px-4 py-3 ${
                  index !== arr.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
          {actionError && (
            <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
              {actionError}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              onClick={() => { void act('reject') }}
              variant="outline"
              disabled={isActing}
              className="h-14 flex-1 rounded-2xl border-destructive text-destructive font-semibold hover:bg-destructive/10 active:scale-95 transition-all"
            >
              <X className="mr-2 h-5 w-5" />
              Татгалзах
            </Button>
            <Button
              onClick={() => { void act('approve') }}
              disabled={isActing}
              className="h-14 flex-1 rounded-2xl bg-success font-semibold text-white shadow-md hover:bg-success/90 disabled:opacity-50 active:scale-95 transition-all"
            >
              <Check className="mr-2 h-5 w-5" />
              {isActing ? 'Хадгалж байна...' : 'Зөвшөөрөх'}
            </Button>
          </div>
        </div>
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
        <h1 className="text-xl font-bold text-foreground">Банкны мэдээлэл баталгаажуулалт</h1>
      </div>

      {/* List */}
      <div className="mt-6 px-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : (workers?.length ?? 0) === 0 ? (
          <div className="mt-8 rounded-2xl bg-card p-8 shadow-sm text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto">
              <Check className="h-8 w-8 text-success" />
            </div>
            <p className="mt-4 font-medium text-foreground">Бүгд баталгаажсан!</p>
            <p className="mt-1 text-sm text-muted-foreground">Хүлээгдэж буй хүсэлт байхгүй байна</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{workers!.length} хүлээгдэж байна</p>
            <div className="mt-4 space-y-3">
              {workers!.map((worker) => (
                <button
                  key={worker.id}
                  onClick={() => setSelected(worker)}
                  className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-sm text-left active:scale-95 transition-all"
                >
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {worker.workerName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{worker.workerName}</p>
                    <p className="text-sm text-muted-foreground">{worker.phone}</p>
                    <p className="text-xs text-muted-foreground">{worker.bankName} · {worker.accountNumber}</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
