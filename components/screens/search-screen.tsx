'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, Star, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

interface Worker {
  id: string
  name: string
  rating: number
  reviews: number
  pricePerHour: number
  specialty: string
  image: string
  verified: boolean
}

interface SearchScreenProps {
  onBack: () => void
  onBookWorker: (workerId: string) => void
  initialCategory?: string
}

const mockWorkers: Worker[] = [
  { id: '1', name: 'Батболд Д.', rating: 4.9, reviews: 124, pricePerHour: 25000, specialty: 'Цэвэрлэгээ', image: '', verified: true },
  { id: '2', name: 'Ганзориг Б.', rating: 4.8, reviews: 89, pricePerHour: 35000, specialty: 'Сантехник', image: '', verified: true },
  { id: '3', name: 'Түвшинбаяр О.', rating: 4.9, reviews: 156, pricePerHour: 40000, specialty: 'Цахилгаан', image: '', verified: true },
  { id: '4', name: 'Эрдэнэбат М.', rating: 4.7, reviews: 67, pricePerHour: 30000, specialty: 'Жижиг засвар', image: '', verified: true },
]

const filterChips = [
  { id: 'price', label: 'Үнэ' },
  { id: 'time', label: 'Цаг' },
  { id: 'rating', label: 'Үнэлгээ' },
]

export function SearchScreen({ onBack, onBookWorker, initialCategory }: SearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [workers, setWorkers] = useState<Worker[]>(mockWorkers)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setIsLoading(true)
    // Simulate search
    setTimeout(() => {
      setWorkers(mockWorkers.filter(w => 
        w.name.toLowerCase().includes(query.toLowerCase()) ||
        w.specialty.toLowerCase().includes(query.toLowerCase())
      ))
      setIsLoading(false)
    }, 500)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-background px-6 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Үйлчилгээ хайх..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-12 rounded-2xl border-border bg-card pl-12 pr-12 shadow-sm"
              autoFocus
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-primary/10 p-1.5">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="mt-4 flex gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(activeFilter === chip.id ? null : chip.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeFilter === chip.id
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
        ) : workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-semibold text-foreground">Илэрц олдсонгүй</p>
            <p className="mt-1 text-sm text-muted-foreground">Өөр түлхүүр үгээр хайна уу</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="overflow-hidden rounded-2xl bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarImage src={worker.image} />
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {worker.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{worker.name}</p>
                      {worker.verified && (
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
                      <span className="text-sm text-muted-foreground">({worker.reviews})</span>
                      <span className="text-sm font-semibold text-primary">
                        ₮{worker.pricePerHour.toLocaleString()}/цаг
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    onClick={() => onBookWorker(worker.id)}
                    className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-foreground shadow-md hover:bg-accent/90"
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
