'use client'

import { Bell, Search, Sparkles, Droplets, Zap, Wrench, Paintbrush, Wind, Star, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface HomeScreenProps {
  userName: string
  onSearch: () => void
  onCategorySelect: (category: string) => void
  onActiveBookingClick?: () => void
  onWorkerSelect?: (workerId: string) => void
  hasActiveBooking?: boolean
}

const categories = [
  { id: 'cleaning', icon: Sparkles, label: 'Цэвэрлэгээ' },
  { id: 'plumbing', icon: Droplets, label: 'Сантехник' },
  { id: 'electrical', icon: Zap, label: 'Цахилгаан' },
  { id: 'repair', icon: Wrench, label: 'Жижиг засвар' },
  { id: 'painting', icon: Paintbrush, label: 'Будаг' },
  { id: 'hvac', icon: Wind, label: 'Агааржуулалт' },
]

const featuredWorkers = [
  { id: '1', name: 'Батболд', rating: 4.9, reviews: 124, specialty: 'Цэвэрлэгээ', image: '' },
  { id: '2', name: 'Ганзориг', rating: 4.8, reviews: 89, specialty: 'Сантехник', image: '' },
  { id: '3', name: 'Түвшинбаяр', rating: 4.9, reviews: 156, specialty: 'Цахилгаан', image: '' },
]

export function HomeScreen({
  userName,
  onSearch,
  onCategorySelect,
  onActiveBookingClick,
  onWorkerSelect,
  hasActiveBooking = false,
}: HomeScreenProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Сайн байна уу, {userName} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Өнөөдөр юу хийх вэ?</p>
        </div>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            2
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mt-6 px-6">
        <div className="relative" onClick={onSearch}>
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Үйлчилгээ хайх..."
            className="h-12 cursor-pointer rounded-2xl border-border bg-card pl-12 shadow-sm"
            readOnly
          />
        </div>
      </div>

      {/* Active Booking Banner */}
      {hasActiveBooking && (
        <div className="mt-4 px-6">
          <button
            onClick={onActiveBookingClick}
            className="flex w-full items-center justify-between rounded-2xl bg-primary p-4 text-left shadow-md"
          >
            <div>
              <p className="text-sm font-medium text-primary-foreground/80">Идэвхтэй захиалга</p>
              <p className="text-base font-bold text-primary-foreground">Цэвэрлэгээ - Ирж байна</p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>
      )}

      {/* Promo Banner */}
      <div className="mt-4 px-6">
        <div className="rounded-2xl bg-accent p-4 shadow-md">
          <p className="text-sm font-medium text-white/90">Шинэ хэрэглэгчдэд</p>
          <p className="text-lg font-bold text-white">Анхны захиалгадаа 20% хөнгөлөлт</p>
        </div>
      </div>

      {/* Categories Section */}
      <div className="mt-6 px-6">
        <h2 className="text-lg font-bold text-foreground">Үйлчилгээ сонгох</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{category.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Featured Workers Section */}
      <div className="mt-6">
        <div className="flex items-center justify-between px-6">
          <h2 className="text-lg font-bold text-foreground">Шилдэг ажилтнууд</h2>
          <button className="text-sm font-medium text-primary">Бүгдийг харах</button>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide">
          {featuredWorkers.map((worker) => (
            <button
              key={worker.id}
              onClick={() => onWorkerSelect?.(worker.id)}
              className="flex min-w-[140px] flex-col items-center rounded-2xl bg-card p-4 shadow-sm"
            >
              <Avatar className="h-16 w-16">
                <AvatarImage src={worker.image} />
                <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                  {worker.name[0]}
                </AvatarFallback>
              </Avatar>
              <p className="mt-2 font-semibold text-foreground">{worker.name}</p>
              <p className="text-xs text-muted-foreground">{worker.specialty}</p>
              <div className="mt-1 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                <span className="text-xs font-medium text-foreground">{worker.rating}</span>
                <span className="text-xs text-muted-foreground">({worker.reviews})</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
