'use client'

import { useState } from 'react'
import { Home, Building2, Briefcase, Camera } from 'lucide-react'
import type { PricingModel, PropertyType } from '@/lib/types'

// Shape of a service type row as returned by GET /api/service-types
export interface ServicePricing {
  pricing_model:          PricingModel
  base_rate:              number
  min_charge:             number
  unit_label:             string
  requires_property_type: boolean
}

// What BookingFields emits upward to the order screen
export interface BookingFieldsValue {
  quantity:            number          // м² for area, unit count for unit, 0 otherwise
  propertyType?:       PropertyType
  estimatedHours:      number          // for the API `hours` field
  isValid:             boolean
  problemDescription?: string         // inspection: required problem description
  scheduledDate?:      string         // inspection: ISO datetime chosen in-form
}

interface BookingFieldsProps {
  service:    ServicePricing
  onChange:   (v: BookingFieldsValue) => void
  submitted:  boolean             // true once user tried to advance past step 1
}

// ── Area form ──────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { type: 'house'     as PropertyType, Icon: Home,      label: 'Байшин',    sub: 'Хувийн байшин, гэр' },
  { type: 'apartment' as PropertyType, Icon: Building2, label: 'Орон сууц', sub: 'Блок, нийтийн байр'  },
  { type: 'office'    as PropertyType, Icon: Briefcase, label: 'Оффис',     sub: 'Ажлын байр, студи'   },
] as const

function AreaForm({ service, onChange, submitted }: BookingFieldsProps) {
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null)
  const [areaSqm,      setAreaSqm]      = useState('')

  function emit(pt: PropertyType | null, sqm: string) {
    const qty    = Math.max(0, parseInt(sqm) || 0)
    const isValid =
      (service.requires_property_type ? !!pt : true) &&
      qty > 0
    onChange({
      quantity:       qty,
      propertyType:   pt ?? undefined,
      estimatedHours: Math.max(1, Math.ceil(qty / 30)),
      isValid,
    })
  }

  const handlePropertyType = (pt: PropertyType) => { setPropertyType(pt); emit(pt, areaSqm) }
  const handleArea         = (v: string)         => { setAreaSqm(v);      emit(propertyType, v) }

  const showPropertyError = submitted && service.requires_property_type && !propertyType
  const showAreaError     = submitted && (!areaSqm.trim() || parseInt(areaSqm) <= 0)

  return (
    <>
      {service.requires_property_type && (
        <div className="mt-6 px-6">
          <h2 className="font-semibold text-foreground">Үл хөдлөхийн төрөл</h2>
          <div className="mt-3 space-y-3">
            {PROPERTY_TYPES.map(({ type, Icon, label, sub }) => (
              <button
                key={type}
                onClick={() => handlePropertyType(type)}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 transition-all active:scale-95 ${
                  propertyType === type
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border bg-card shadow-sm'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground">{sub}</p>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 transition-colors ${
                  propertyType === type ? 'border-primary bg-primary' : 'border-border'
                }`} />
              </button>
            ))}
          </div>
          {showPropertyError && (
            <p className="mt-2 text-sm text-destructive">Үл хөдлөхийн төрлийг сонгоно уу</p>
          )}
        </div>
      )}

      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Талбай</h2>
        <div className="relative mt-2">
          <input
            type="number"
            min={10}
            max={1000}
            placeholder="60"
            value={areaSqm}
            onChange={(e) => handleArea(e.target.value)}
            className="h-12 w-full rounded-2xl border border-border bg-card pl-4 pr-14 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {service.unit_label}
          </span>
        </div>
        {showAreaError && (
          <p className="mt-1 text-sm text-destructive">Талбайг оруулна уу</p>
        )}
      </div>
    </>
  )
}

// ── Inspection form ────────────────────────────────────────────────────────────

const INSPECTION_TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']

function InspectionForm({ service, onChange, submitted }: BookingFieldsProps) {
  const [description,   setDescription]   = useState('')
  const [selectedDay,   setSelectedDay]   = useState<number | null>(null)
  const [selectedTime,  setSelectedTime]  = useState<string | null>(null)

  // Next 14 days starting tomorrow (same day is too short notice for inspection)
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return {
      day:  d.toLocaleDateString('mn-MN', { weekday: 'short' }),
      date: d.getDate(),
      full: d.toISOString().split('T')[0] as string,
    }
  })

  function emit(desc: string, day: number | null, time: string | null) {
    const dateEntry = day !== null ? dates[day] : null
    const scheduledDate =
      dateEntry && time ? `${dateEntry.full}T${time}:00` : undefined
    onChange({
      quantity:           0,
      estimatedHours:     1,
      isValid:            desc.trim().length > 0 && day !== null && time !== null,
      problemDescription: desc.trim() || undefined,
      scheduledDate,
    })
  }

  const handleDesc = (v: string)  => { setDescription(v); emit(v, selectedDay, selectedTime) }
  const handleDay  = (i: number)  => { setSelectedDay(i);  emit(description, i, selectedTime) }
  const handleTime = (t: string)  => { setSelectedTime(t); emit(description, selectedDay, t) }

  const showDescError = submitted && !description.trim()
  const showDateError = submitted && (selectedDay === null || selectedTime === null)

  return (
    <>
      {/* Problem description — first visible field, above the fold */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Асуудлын тайлбар</h2>
        <textarea
          placeholder="Яг юу болсныг товч тайлбарлана уу. Жишээ: Угаалтуурын шугам дусалж байна..."
          value={description}
          onChange={(e) => handleDesc(e.target.value)}
          rows={4}
          className="mt-3 w-full resize-none rounded-2xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {showDescError && (
          <p className="mt-1 text-sm text-destructive">Асуудлын тайлбарыг оруулна уу</p>
        )}
      </div>

      {/* Issue photos */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Асуудлын зураг</h2>
        <p className="mt-1 text-xs text-muted-foreground">Асуудлыг харуулах 1–3 зураг нэмнэ үү (заавал биш)</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card transition-all active:scale-95 hover:border-primary/50"
            >
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="mt-1 text-xs text-muted-foreground">Зураг нэмэх</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date picker */}
      <div className="mt-6">
        <h2 className="px-6 font-semibold text-foreground">Ажилтан ирэх өдөр</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide">
          {dates.map((d, i) => (
            <button
              key={d.full}
              onClick={() => handleDay(i)}
              className={`flex min-w-[60px] flex-col items-center rounded-2xl py-3 transition-colors active:scale-95 ${
                selectedDay === i
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-foreground shadow-sm'
              }`}
            >
              <span className="text-xs font-medium opacity-80">{d.day}</span>
              <span className="mt-1 text-lg font-bold">{d.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time picker */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Ажилтан ирэх цаг</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {INSPECTION_TIME_SLOTS.map((time) => (
            <button
              key={time}
              onClick={() => handleTime(time)}
              className={`rounded-2xl py-3 text-sm font-medium transition-colors active:scale-95 ${
                selectedTime === time
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-foreground shadow-sm'
              }`}
            >
              {time}
            </button>
          ))}
        </div>
        {showDateError && (
          <p className="mt-2 text-sm text-destructive">Өдөр болон цагаа сонгоно уу</p>
        )}
      </div>

      {/* Callout fee banner — at bottom, after required fields */}
      <div className="mt-6 mx-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
        <p className="text-sm font-semibold text-primary">
          Дуудлагын хураамж: ₮{service.base_rate.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ажилтан үзээд засварын үнийг гаргана.
        </p>
      </div>
    </>
  )
}

// ── Stubs ──────────────────────────────────────────────────────────────────────

function ComingSoonStub() {
  return (
    <div className="mt-6 mx-6 flex flex-col items-center justify-center rounded-2xl bg-card py-10 shadow-sm">
      <p className="text-lg font-semibold text-foreground">Тун удахгүй</p>
      <p className="mt-1 text-sm text-muted-foreground">Энэ үйлчилгээний маягт бэлдэж байна</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UnitForm(_props: BookingFieldsProps)  { return <ComingSoonStub /> }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SurveyForm(_props: BookingFieldsProps) { return <ComingSoonStub /> }

// ── Router (type-exhaustive) ───────────────────────────────────────────────────

export function BookingFields(props: BookingFieldsProps) {
  const model: PricingModel = props.service.pricing_model
  switch (model) {
    case 'area':       return <AreaForm       {...props} />
    case 'unit':       return <UnitForm       {...props} />
    case 'inspection': return <InspectionForm {...props} />
    case 'survey':     return <SurveyForm     {...props} />
  }
  // TypeScript makes this unreachable if PricingModel is complete
  const _: never = model
  throw new Error(`Unknown pricing model: ${_}`)
}
