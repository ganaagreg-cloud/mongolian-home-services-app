'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, AlertTriangle, RefreshCw, Search, Plus, X, Edit2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Worker = {
  id: string
  name: string
  phone: string | null
  specialty: string
  price_per_hour: number
  rating: number
  review_count: number
  is_active: boolean
  is_available: boolean
  rejected_at: string | null
  banking_verified: boolean
  dan_verified: boolean
  police_file: string | null
  created_at: string
}

type WorkerDetail = {
  id: string
  service_type_id: number | null
  name: string
  phone: string | null
  email: string
  dan_verified: boolean
  price_per_hour: number
  is_active: boolean
  is_available: boolean
  rejected_at: string | null
  police_file: string | null
  bank_name: string | null
  account_number: string | null
  account_holder_name: string | null
  iban: string | null
  account_type: string | null
}

type ServiceType = { id: number; name_mn: string }
type PageState = 'loading' | 'error' | 'ok'

const STATUS_FILTERS = ['all', 'active', 'pending', 'suspended'] as const
const STATUS_LABELS: Record<string, string> = {
  all: 'Бүгд', active: 'Идэвхтэй', pending: 'Хүлээгдэж байна', suspended: 'Түдгэлзүүлсэн',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('mn-MN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmtMNT(n: number) {
  return `₮${n.toLocaleString()}`
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  service_type_id: '' as string | number,
  price_per_hour: '' as string | number,
  is_available: true,
  is_active: false,
  dan_verified: false,
  police_clearance_verified: false,
  bank_name: '',
  account_number: '',
  account_holder_name: '',
  iban: '',
  account_type: 'checking',
}
type FormState = typeof EMPTY_FORM

export default function WorkersPage() {
  const [state, setState]   = useState<PageState>('loading')
  const [workers, setWorkers] = useState<Worker[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [pages, setPages]   = useState(1)
  const [q, setQ]           = useState('')
  const [status, setStatus] = useState('all')

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [modalMode, setModalMode]       = useState<'edit' | 'add' | null>(null)
  const [editId, setEditId]             = useState<string | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalSaving, setModalSaving]   = useState(false)
  const [modalError, setModalError]     = useState('')
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM)

  const load = useCallback(() => {
    setState('loading')
    const params = new URLSearchParams({ page: String(page), status })
    if (q) params.set('q', q)
    fetch(`${BASE}/api/admin/workers?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: { success: boolean; data: Worker[]; total: number; pages: number }) => {
        if (d.success) { setWorkers(d.data); setTotal(d.total); setPages(d.pages); setState('ok') }
        else setState('error')
      })
      .catch(() => setState('error'))
  }, [page, status, q])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch(`${BASE}/api/service-types`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: { success: boolean; data: ServiceType[] }) => {
        if (d.success) setServiceTypes(d.data)
      })
      .catch(() => {})
  }, [])

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setModalError('')
    setModalMode('add')
  }

  async function openEdit(id: string) {
    setEditId(id)
    setModalError('')
    setModalLoading(true)
    setModalMode('edit')
    try {
      const r = await fetch(`${BASE}/api/admin/workers/${id}`, { credentials: 'include' })
      const d = await r.json() as { success: boolean; data: WorkerDetail }
      if (d.success) {
        const w = d.data
        setForm({
          name:                      w.name,
          phone:                     w.phone ?? '',
          service_type_id:           w.service_type_id ?? '',
          price_per_hour:            w.price_per_hour,
          is_available:              w.is_available,
          is_active:                 w.is_active,
          dan_verified:              w.dan_verified,
          police_clearance_verified: !!w.police_file,
          bank_name:                 w.bank_name ?? '',
          account_number:            w.account_number ?? '',
          account_holder_name:       w.account_holder_name ?? '',
          iban:                      w.iban ?? '',
          account_type:              w.account_type ?? 'checking',
        })
      }
    } finally {
      setModalLoading(false)
    }
  }

  async function handleSave() {
    setModalSaving(true)
    setModalError('')
    try {
      const stId = form.service_type_id !== '' ? Number(form.service_type_id) : undefined
      const price = form.price_per_hour !== '' ? Number(form.price_per_hour) : undefined

      const body = {
        name:                      form.name || undefined,
        phone:                     form.phone || undefined,
        service_type_id:           stId,
        price_per_hour:            price,
        is_available:              form.is_available,
        is_active:                 form.is_active,
        dan_verified:              form.dan_verified,
        police_clearance_verified: form.police_clearance_verified,
        bank_name:                 form.bank_name || undefined,
        account_number:            form.account_number || undefined,
        account_holder_name:       form.account_holder_name || undefined,
        iban:                      form.iban || undefined,
        account_type:              form.account_type || undefined,
      }

      const url    = modalMode === 'edit' ? `${BASE}/api/admin/workers/${editId}` : `${BASE}/api/admin/workers`
      const method = modalMode === 'edit' ? 'PATCH' : 'POST'

      const r = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json() as { success: boolean; error?: string }
      if (d.success) {
        setModalMode(null)
        load()
      } else {
        setModalError(d.error ?? 'Алдаа гарлаа')
      }
    } catch {
      setModalError('Алдаа гарлаа')
    } finally {
      setModalSaving(false)
    }
  }

  function pf<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const inputCls = 'w-full rounded-2xl border border-border bg-background px-4 h-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'

  const TOGGLES: { key: 'is_available' | 'is_active' | 'dan_verified' | 'police_clearance_verified'; label: string }[] = [
    { key: 'is_available',              label: 'Боломжтой' },
    { key: 'is_active',                 label: 'Идэвхтэй' },
    { key: 'dan_verified',              label: 'DAN баталгаажсан' },
    { key: 'police_clearance_verified', label: 'Цагдаагийн тодорхойлолт' },
  ]

  return (
    <div className="px-8 pt-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Ажилтнууд</h1>
          {state === 'ok' && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {state !== 'loading' && (
            <button
              onClick={load}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm transition-colors hover:bg-card/80 active:scale-95"
              aria-label="Шинэчлэх"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={openAdd}
            className="flex h-9 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Ажилтан нэмэх
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="Нэр, утасны дугаараар хайх…"
            className="h-10 w-full rounded-2xl border border-border bg-card pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1) }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95',
                status === s ? 'bg-primary/10 text-primary' : 'bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div className="mt-5 rounded-2xl bg-card shadow-sm overflow-hidden">
        {state === 'loading' && (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
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

        {state === 'ok' && workers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 font-semibold text-foreground">Ажилтан байхгүй байна</p>
          </div>
        )}

        {state === 'ok' && workers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Нэр</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Утас</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Мэргэжил</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">₮/цаг</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Үнэлгээ</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Төлөв</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Баталгаа</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Бүртгэсэн</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {workers.map((w, idx) => {
                  const wStatus = w.rejected_at ? 'suspended' : w.is_active ? 'active' : 'pending'
                  return (
                    <tr
                      key={w.id}
                      className={cn('transition-colors hover:bg-muted/30', idx !== workers.length - 1 && 'border-b border-border')}
                    >
                      <td className="px-5 py-3 font-medium text-foreground">{w.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{w.phone ?? '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground">{w.specialty || '—'}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{fmtMNT(w.price_per_hour)}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {w.review_count > 0 ? `${w.rating.toFixed(1)} (${w.review_count})` : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium',
                          wStatus === 'active'    && 'bg-success/10 text-success',
                          wStatus === 'pending'   && 'bg-accent/10 text-accent',
                          wStatus === 'suspended' && 'bg-destructive/10 text-destructive',
                        )}>
                          {wStatus === 'active' ? 'Идэвхтэй' : wStatus === 'pending' ? 'Хүлээгдэж байна' : 'Түдгэлзүүлсэн'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', w.dan_verified ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>DAN</span>
                          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', w.police_file ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>Цагдаа</span>
                          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', w.banking_verified ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>Банк</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(w.created_at)}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => openEdit(w.id)}
                          className="flex h-8 items-center gap-1.5 rounded-2xl border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 active:scale-95"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Засах
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {state === 'ok' && pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">{total} ажилтан</p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="rounded-2xl border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/50 disabled:opacity-40 active:scale-95"
              >
                Өмнөх
              </button>
              <span className="text-xs text-muted-foreground">{page} / {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
                className="rounded-2xl border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/50 disabled:opacity-40 active:scale-95"
              >
                Дараах
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalMode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl overflow-y-auto max-h-[90vh] rounded-2xl bg-background shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-semibold text-foreground">
                {modalMode === 'add' ? 'Ажилтан нэмэх' : 'Ажилтан засах'}
              </h2>
              <button
                onClick={() => setModalMode(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted/50 active:scale-95"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            {modalLoading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-4 p-6">
                {/* Name */}
                <div>
                  <label className={labelCls}>Нэр</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => pf('name', e.target.value)}
                    placeholder="Бат-Эрдэнэ"
                    className={inputCls}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className={labelCls}>Утасны дугаар</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => pf('phone', e.target.value)}
                    placeholder="99001122"
                    className={inputCls}
                  />
                </div>

                {/* Service type */}
                <div>
                  <label className={labelCls}>Мэргэжил</label>
                  <select
                    value={form.service_type_id}
                    onChange={e => pf('service_type_id', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— Сонгох —</option>
                    {serviceTypes.map(st => (
                      <option key={st.id} value={st.id}>{st.name_mn}</option>
                    ))}
                  </select>
                </div>

                {/* Price per hour */}
                <div>
                  <label className={labelCls}>₮/цаг (MNT)</label>
                  <input
                    type="number"
                    value={form.price_per_hour}
                    onChange={e => pf('price_per_hour', e.target.value)}
                    placeholder="15000"
                    min={0}
                    max={500000}
                    className={inputCls}
                  />
                </div>

                {/* Boolean toggles */}
                <div className="divide-y divide-border rounded-2xl border border-border">
                  {TOGGLES.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-foreground">{label}</span>
                      <button
                        type="button"
                        onClick={() => pf(key, !form[key])}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition-colors',
                          form[key] ? 'bg-primary' : 'bg-border',
                        )}
                      >
                        <span className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                          form[key] ? 'translate-x-5' : 'translate-x-0.5',
                        )} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Banking section */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Банкны мэдээлэл
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Банкны нэр</label>
                      <input type="text" value={form.bank_name} onChange={e => pf('bank_name', e.target.value)} placeholder="Хаан банк" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Дансны дугаар</label>
                      <input type="text" value={form.account_number} onChange={e => pf('account_number', e.target.value)} placeholder="1234567890" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Данс эзэмшигчийн нэр</label>
                      <input type="text" value={form.account_holder_name} onChange={e => pf('account_holder_name', e.target.value)} placeholder="Бат-Эрдэнэ" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>IBAN</label>
                      <input type="text" value={form.iban} onChange={e => pf('iban', e.target.value)} placeholder="MN00 0000 0000 0000" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Дансны төрөл</label>
                      <select value={form.account_type} onChange={e => pf('account_type', e.target.value)} className={inputCls}>
                        <option value="checking">Харилцах</option>
                        <option value="savings">Хадгаламж</option>
                      </select>
                    </div>
                  </div>
                </div>

                {modalError && (
                  <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {modalError}
                  </p>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setModalMode(null)}
                className="h-10 rounded-2xl border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:scale-95"
              >
                Болих
              </button>
              <button
                disabled={modalSaving || modalLoading}
                onClick={handleSave}
                className="h-10 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90 active:scale-95 disabled:opacity-50"
              >
                {modalSaving ? 'Хадгалж байна…' : 'Хадгалах'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
