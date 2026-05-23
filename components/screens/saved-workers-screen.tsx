'use client'

import { useState } from 'react'
import { ArrowLeft, Star, Heart, Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface SavedWorkersScreenProps {
  onBack: () => void
  onBookWorker: (workerId: string) => void
}

const savedWorkers = [
  {
    id: '1',
    name: 'Дулмаа Б.',
    service: 'Гэрийн цэвэрлэгч',
    rating: 4.9,
    reviews: 128,
    price: 25000,
    verified: true,
  },
  {
    id: '2',
    name: 'Нарантуяа О.',
    service: 'Гэрийн цэвэрлэгч',
    rating: 4.8,
    reviews: 97,
    price: 22000,
    verified: true,
  },
  {
    id: '3',
    name: 'Эрдэнэчимэг Д.',
    service: 'Угаалгын өрөө цэвэрлэгч',
    rating: 4.7,
    reviews: 54,
    price: 20000,
    verified: false,
  },
]

export function SavedWorkersScreen({ onBack, onBookWorker }: SavedWorkersScreenProps) {
  const [workers, setWorkers] = useState(savedWorkers)

  const handleRemove = (id: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== id))
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

      {workers.length === 0 ? (
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
                      {worker.verified && (
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                          ДАН
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(worker.id)}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full hover:bg-destructive/10 transition-colors active:scale-95"
                    >
                      <Heart className="h-4 w-4 fill-accent text-accent" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{worker.service}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      <span className="text-sm font-medium text-foreground">{worker.rating}</span>
                      <span className="text-xs text-muted-foreground">({worker.reviews})</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      ₮{worker.price.toLocaleString()}/цаг
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => onBookWorker(worker.id)}
                className="mt-3 h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-foreground shadow-md hover:bg-accent/90 active:scale-95 transition-all"
              >
                Захиалах
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
