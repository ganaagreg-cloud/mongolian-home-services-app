'use client'

import useSWR from 'swr'
import { ArrowLeft, Star, Heart, Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import { apiFetch } from '@/lib/api-fetch'
import type { Worker } from '@/lib/types'

interface SavedWorkersScreenProps {
  onBack: () => void
}

export function SavedWorkersScreen({ onBack }: SavedWorkersScreenProps) {
  const { data: workers, isLoading, mutate } = useSWR<Worker[]>('/api/me/saved-workers', fetcher)

  const handleRemove = async (workerId: string) => {
    // Optimistic remove
    await mutate((prev) => prev?.filter((w) => w.id !== workerId) ?? [], { revalidate: false })
    try {
      await apiFetch(`/api/me/saved-workers/${workerId}`, { method: 'DELETE' })
    } finally {
      void mutate()
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Хадгалсан ажилтнууд</h1>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3 px-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : !workers || workers.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card shadow-sm">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="mt-4 text-lg font-semibold text-foreground">Хадгалсан ажилтан байхгүй</p>
          <p className="mt-1 text-sm text-muted-foreground">Таалагдсан ажилтнаа хадгалаарай</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3 px-6">
          {workers.map((worker) => (
            <div key={worker.id} className="overflow-hidden rounded-2xl bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                    {worker.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="truncate font-semibold text-foreground">{worker.name}</p>
                      {worker.danVerified && (
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                          ДАН
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { void handleRemove(worker.id) }}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full hover:bg-destructive/10 transition-colors active:scale-95"
                    >
                      <Heart className="h-4 w-4 fill-accent text-accent" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{worker.specialty}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      <span className="text-sm font-medium text-foreground">{worker.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({worker.reviewCount})</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      ₮{worker.pricePerHour.toLocaleString()}/цаг
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
