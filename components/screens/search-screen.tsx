'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Search, SlidersHorizontal, Star, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import type { Worker } from '@/lib/types'

interface SearchScreenProps {
  onBack: () => void
  onBookWorker: (workerId: string) => void
  initialCategory?: string
}

const filterChips = [
  { id: 'rating',     label: 'Үнэлгээ',   sort: 'rating' },
  { id: 'price_asc',  label: 'Хямд эхэлж', sort: 'price_asc' },
  { id: 'price_desc', label: 'Үнэтэй эхэлж', sort: 'price_desc' },
]

export function SearchScreen({ onBack, onBookWorker }: SearchScreenProps) {
  const [searchQuery, setSearchQuery]     = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeSort, setActiveSort]       = useState<string | null>(null)

  // 350 ms debounce — avoid hammering the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 350)
    return () => clearTimeout(t)
  }, [searchQuery])

  const sort = activeSort ?? 'rating'
  const url  = `/api/workers?q=${encodeURIComponent(debouncedQuery)}&sort=${sort}`

  const { data: workers, isLoading, error } = useSWR<Worker[]>(url, fetcher)

  const list = workers ?? []

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Sticky search header */}
      <div className="sticky top-0 z-10 bg-background px-6 pb-4 pt-12">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm active:scale-95 transition-all"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Үйлчилгээ хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-2xl border-border bg-card pl-12 pr-12 shadow-sm"
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-primary/10 p-1.5">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>

        {/* Sort chips */}
        <div className="mt-4 flex gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveSort(activeSort === chip.id ? null : chip.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeSort === chip.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground shadow-sm'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-10 w-24 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-destructive">Мэдээлэл ачааллахад алдаа гарлаа</p>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-semibold text-foreground">Илэрц олдсонгүй</p>
            <p className="mt-1 text-sm text-muted-foreground">Өөр түлхүүр үгээр хайна уу</p>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((worker) => (
              <div key={worker.id} className="overflow-hidden rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {worker.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{worker.name}</p>
                      {worker.danVerified && (
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                          ДАН
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{worker.specialty}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        <span className="text-sm font-medium text-foreground">{worker.rating}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">({worker.reviewCount})</span>
                      <span className="text-sm font-semibold text-primary">
                        ₮{worker.pricePerHour.toLocaleString()}/цаг
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    onClick={() => onBookWorker(worker.id)}
                    className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-foreground shadow-md hover:bg-accent/90 active:scale-95 transition-all"
                  >
                    Захиалах
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
