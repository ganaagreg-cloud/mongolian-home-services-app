'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { ChevronLeft, ChevronRight, CalendarDays, MapPin } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { fetcher } from '@/lib/fetcher'

// ── Constants ────────────────────────────────────────────────────────────────
const PX_PER_HOUR = 64
const START_HOUR  = 7   // 07:00
const END_HOUR    = 22  // 22:00
const TOTAL_HOURS = END_HOUR - START_HOUR

const HOUR_LABELS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)
const DAY_INITIALS = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'] // Mon–Sun

// ── Types ────────────────────────────────────────────────────────────────────
type ScheduleEntry = {
  id:          number
  orderId:     number
  status:      'booked' | 'pending_payment'
  rangeStart:  string
  rangeEnd:    string
  jobHours:    number
  serviceName: string
  address:     string
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function getWeekStart(date: Date): Date {
  const d   = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

function fmtHHMM(date: Date): string {
  return date.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ── Pixel helpers ─────────────────────────────────────────────────────────────
function topPx(iso: string): number {
  const d = new Date(iso)
  return Math.max(0, (d.getHours() + d.getMinutes() / 60 - START_HOUR) * PX_PER_HOUR)
}

// ── ScheduleBlock ─────────────────────────────────────────────────────────────
function ScheduleBlock({ entry }: { entry: ScheduleEntry }) {
  const isBooked   = entry.status === 'booked'
  const start      = new Date(entry.rangeStart)
  const jobEnd     = new Date(start.getTime() + entry.jobHours * 3_600_000)
  const top        = topPx(entry.rangeStart)
  const totalPx    = ((new Date(entry.rangeEnd).getTime() - start.getTime()) / 3_600_000) * PX_PER_HOUR
  const jobPx      = entry.jobHours * PX_PER_HOUR
  const bufPx      = Math.max(0, totalPx - jobPx)

  if (top >= TOTAL_HOURS * PX_PER_HOUR || top + totalPx <= 0) return null

  return (
    <div
      className="absolute left-1 right-1 overflow-hidden rounded-xl shadow-sm"
      style={{ top, height: Math.max(totalPx, 20) }}
    >
      {/* Job duration — solid */}
      <div
        className={cn('absolute inset-x-0 top-0 overflow-hidden px-2 py-1',
          isBooked ? 'bg-primary' : 'bg-accent')}
        style={{ height: Math.max(jobPx, totalPx - bufPx) }}
      >
        {jobPx >= 28 && (
          <p className="truncate text-[11px] font-semibold leading-tight text-white">
            {entry.serviceName}
          </p>
        )}
        {jobPx >= 44 && (
          <p className="mt-0.5 truncate text-[10px] leading-tight text-white/80">
            {fmtHHMM(start)}–{fmtHHMM(jobEnd)}
          </p>
        )}
        {jobPx >= 60 && (
          <p className="mt-0.5 flex items-center gap-0.5 truncate text-[10px] leading-tight text-white/70">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            {entry.address.slice(0, 30)}
          </p>
        )}
      </div>

      {/* 60-min transport buffer — lighter shade */}
      {bufPx > 0 && (
        <div
          className={cn(
            'absolute inset-x-0 flex items-center justify-center border-t',
            isBooked
              ? 'border-primary/30 bg-primary/15'
              : 'border-accent/30 bg-accent/15',
          )}
          style={{ top: Math.max(jobPx, totalPx - bufPx), height: bufPx }}
        >
          {bufPx >= 18 && (
            <span className={cn('text-[9px] font-medium', isBooked ? 'text-primary' : 'text-accent')}>
              +60мин буфер
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function WorkerScheduleScreen() {
  const todayMidnight = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [weekStart,   setWeekStart]   = useState(() => getWeekStart(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const from = weekStart.toISOString()
  const to   = addDays(weekStart, 7).toISOString()

  const { data, isLoading } = useSWR<{ success: boolean; data: ScheduleEntry[] }>(
    `/api/workers/me/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    fetcher,
  )

  const entries = data?.data ?? []

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const entriesForDay = useMemo(
    () => entries.filter((e) => isSameDay(new Date(e.rangeStart), selectedDay)),
    [entries, selectedDay],
  )

  const dayHasBooking = useMemo(() => {
    const keys = new Set(
      entries.map((e) => {
        const d = new Date(e.rangeStart)
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      }),
    )
    return (day: Date) => keys.has(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`)
  }, [entries])

  const weekLabel = (() => {
    const end = addDays(weekStart, 6)
    const sm  = weekStart.getMonth() + 1
    const em  = end.getMonth() + 1
    const sd  = weekStart.getDate()
    const ed  = end.getDate()
    return sm === em
      ? `${weekStart.getFullYear()}.${sm}.${sd}–${ed}`
      : `${sm}.${sd} – ${em}.${ed}`
  })()

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Хуваарь</h1>
        {/* Week navigator */}
        <div className="flex h-9 items-center gap-1 rounded-full bg-card px-2 shadow-sm">
          <button
            aria-label="Өмнөх долоо хоног"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="flex h-6 w-6 items-center justify-center rounded-full transition-all active:scale-95 hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <span className="min-w-[120px] text-center text-xs font-medium text-foreground">
            {weekLabel}
          </span>
          <button
            aria-label="Дараагийн долоо хоног"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="flex h-6 w-6 items-center justify-center rounded-full transition-all active:scale-95 hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* ── Day strip ── */}
      <div className="mt-4 flex gap-1 px-4">
        {weekDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDay)
          const isToday    = isSameDay(day, todayMidnight)
          const hasDot     = dayHasBooking(day)
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(day)}
              className={cn(
                'flex flex-1 flex-col items-center rounded-2xl py-2 transition-all active:scale-95',
                isSelected ? 'bg-primary shadow-md' : 'bg-card shadow-sm',
              )}
            >
              <span className={cn(
                'text-[10px] font-medium',
                isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground',
              )}>
                {DAY_INITIALS[i]}
              </span>
              <span className={cn(
                'text-sm font-bold leading-tight',
                isSelected     ? 'text-primary-foreground'
                : isToday      ? 'text-primary'
                :                'text-foreground',
              )}>
                {day.getDate()}
              </span>
              {/* Booking dot indicator */}
              <span className={cn(
                'mt-0.5 h-1.5 w-1.5 rounded-full',
                hasDot
                  ? isSelected ? 'bg-primary-foreground' : 'bg-accent'
                  : 'invisible',
              )} />
            </button>
          )
        })}
      </div>

      {/* ── Legend ── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-6">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          <span className="text-xs text-muted-foreground">Баталгаажсан</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
          <span className="text-xs text-muted-foreground">Төлбөр хүлээж байна</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/20" />
          <span className="text-xs text-muted-foreground">60мин буфер</span>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="relative mt-3 overflow-x-hidden">
        {isLoading ? (
          <div className="space-y-3 px-6 pt-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex">
            {/* Hour labels */}
            <div className="w-10 shrink-0 select-none">
              {HOUR_LABELS.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end pr-2"
                  style={{ height: PX_PER_HOUR }}
                >
                  <span className="translate-y-[-6px] text-[10px] text-muted-foreground">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Grid column */}
            <div className="relative flex-1 pr-4">
              {/* Horizontal hour lines */}
              {HOUR_LABELS.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-4 border-t border-border/50"
                  style={{ top: (h - START_HOUR) * PX_PER_HOUR }}
                />
              ))}

              {/* Content area */}
              <div
                className="relative"
                style={{ height: TOTAL_HOURS * PX_PER_HOUR }}
              >
                {entriesForDay.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card">
                      <CalendarDays className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="mt-3 font-semibold text-foreground">Хуваарь байхгүй</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Энэ өдөр захиалга байхгүй байна
                    </p>
                  </div>
                ) : (
                  entriesForDay.map((entry) => (
                    <ScheduleBlock key={entry.id} entry={entry} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
