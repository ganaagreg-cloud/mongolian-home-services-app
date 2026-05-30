'use client'

import { useCallback, useEffect, useState } from 'react'
import { Settings2, Tag, MapPin, RefreshCw, Plus, Pencil, Check, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type AppSetting  = { key: string; value: string }
type ServiceType = { id: number; name_mn: string; icon: string; is_active: boolean }
type District    = { id: number; name_mn: string; is_active: boolean }
type Panel       = 'settings' | 'service-types' | 'districts'

const SETTING_META: Record<string, { label: string; suffix: string; description: string }> = {
  platform_commission:   { label: 'Платформын шимтгэл',    suffix: '%',   description: 'Ажилтнаас суутгах хувь' },
  damage_fund_rate:      { label: 'Хохирлын сан',           suffix: '%',   description: 'Хохирол нөхөн төлбөрийн сан' },
  free_cancel_minutes:   { label: 'Үнэгүй цуцлах хугацаа', suffix: 'мин', description: 'Торгуульгүй цуцлах боломжтой хугацаа' },
  late_cancel_fee:       { label: 'Хожуу цуцлах торгууль', suffix: '₮',   description: 'Хугацаанаас хэтэрсэн цуцлалт' },
  urgent_fee_multiplier: { label: 'Яаралтай нэмэгдэл',     suffix: '%',   description: 'Яаралтай захиалгын нэмэлт хураамж' },
}
const SETTING_KEYS = Object.keys(SETTING_META)

const NAV: { id: Panel; label: string; icon: typeof Settings2 }[] = [
  { id: 'settings',      label: 'Тохиргоо',               icon: Settings2 },
  { id: 'service-types', label: 'Үйлчилгээний төрлүүд',   icon: Tag       },
  { id: 'districts',     label: 'Дүүргүүд',                icon: MapPin    },
]

export default function MasterDataPage() {
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(false)
  const [panel, setPanel]                   = useState<Panel>('settings')

  const [settings, setSettings]             = useState<Record<string, string>>({})
  const [settingDraft, setSettingDraft]     = useState<Record<string, string>>({})
  const [settingBusy, setSettingBusy]       = useState(false)

  const [serviceTypes, setServiceTypes]     = useState<ServiceType[]>([])
  const [stEditId, setStEditId]             = useState<number | null>(null)
  const [stDraft, setStDraft]               = useState('')
  const [stAddOpen, setStAddOpen]           = useState(false)
  const [stNewName, setStNewName]           = useState('')
  const [stBusy, setStBusy]                 = useState<Record<string, boolean>>({})

  const [districts, setDistricts]           = useState<District[]>([])
  const [distEditId, setDistEditId]         = useState<number | null>(null)
  const [distDraft, setDistDraft]           = useState('')
  const [distAddOpen, setDistAddOpen]       = useState(false)
  const [distNewName, setDistNewName]       = useState('')
  const [distBusy, setDistBusy]             = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const [sRes, stRes, dRes] = await Promise.all([
        fetch(`${BASE}/api/admin/settings`,      { credentials: 'include' }),
        fetch(`${BASE}/api/admin/service-types`, { credentials: 'include' }),
        fetch(`${BASE}/api/admin/districts`,     { credentials: 'include' }),
      ])
      const [sJson, stJson, dJson] = await Promise.all([sRes.json(), stRes.json(), dRes.json()])
      if (!sJson.success || !stJson.success || !dJson.success) { setError(true); return }
      const map: Record<string, string> = {}
      for (const row of sJson.data as AppSetting[]) map[row.key] = row.value
      setSettings(map); setSettingDraft({ ...map })
      setServiceTypes(stJson.data)
      setDistricts(dJson.data)
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Settings ────────────────────────────────────────────────────────────────

  async function saveAllSettings() {
    setSettingBusy(true)
    try {
      await Promise.all(
        SETTING_KEYS
          .filter(k => settingDraft[k] !== undefined && settingDraft[k] !== '')
          .map(k => fetch(`${BASE}/api/admin/settings/${k}`, {
            method: 'PATCH', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: settingDraft[k] }),
          })),
      )
      setSettings({ ...settingDraft })
    } finally { setSettingBusy(false) }
  }

  const settingsDirty = SETTING_KEYS.some(k => settingDraft[k] !== settings[k])

  // ── Service Types ────────────────────────────────────────────────────────────

  async function stToggle(id: number, current: boolean) {
    setStBusy(b => ({ ...b, [id]: true }))
    try {
      await fetch(`${BASE}/api/admin/service-types/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current }),
      })
      setServiceTypes(ts => ts.map(t => t.id === id ? { ...t, is_active: !current } : t))
    } finally { setStBusy(b => { const n = { ...b }; delete n[id]; return n }) }
  }

  async function stSaveEdit(id: number) {
    if (!stDraft.trim()) return
    setStBusy(b => ({ ...b, [id]: true }))
    try {
      await fetch(`${BASE}/api/admin/service-types/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_mn: stDraft.trim() }),
      })
      setServiceTypes(ts => ts.map(t => t.id === id ? { ...t, name_mn: stDraft.trim() } : t))
      setStEditId(null)
    } finally { setStBusy(b => { const n = { ...b }; delete n[id]; return n }) }
  }

  async function stCreate() {
    if (!stNewName.trim()) return
    setStBusy(b => ({ ...b, new: true }))
    try {
      const r = await fetch(`${BASE}/api/admin/service-types`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_mn: stNewName.trim(), icon: 'sparkles' }),
      })
      const d = await r.json()
      if (d.success) { setServiceTypes(ts => [...ts, d.data]); setStNewName(''); setStAddOpen(false) }
    } finally { setStBusy(b => { const n = { ...b }; delete n['new']; return n }) }
  }

  // ── Districts ────────────────────────────────────────────────────────────────

  async function distToggle(id: number, current: boolean) {
    setDistBusy(b => ({ ...b, [id]: true }))
    try {
      await fetch(`${BASE}/api/admin/districts/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current }),
      })
      setDistricts(ds => ds.map(d => d.id === id ? { ...d, is_active: !current } : d))
    } finally { setDistBusy(b => { const n = { ...b }; delete n[id]; return n }) }
  }

  async function distSaveEdit(id: number) {
    if (!distDraft.trim()) return
    setDistBusy(b => ({ ...b, [id]: true }))
    try {
      await fetch(`${BASE}/api/admin/districts/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_mn: distDraft.trim() }),
      })
      setDistricts(ds => ds.map(d => d.id === id ? { ...d, name_mn: distDraft.trim() } : d))
      setDistEditId(null)
    } finally { setDistBusy(b => { const n = { ...b }; delete n[id]; return n }) }
  }

  async function distCreate() {
    if (!distNewName.trim()) return
    setDistBusy(b => ({ ...b, new: true }))
    try {
      const r = await fetch(`${BASE}/api/admin/districts`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_mn: distNewName.trim() }),
      })
      const d = await r.json()
      if (d.success) { setDistricts(ds => [...ds, d.data]); setDistNewName(''); setDistAddOpen(false) }
    } finally { setDistBusy(b => { const n = { ...b }; delete n['new']; return n }) }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-screen">
      {/* Left sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card px-3 py-8">
        <div className="mb-6 flex items-center justify-between px-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Мастер дата</h2>
          <button
            onClick={load}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted/50 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-muted-foreground', loading && 'animate-spin')} />
          </button>
        </div>
        <nav className="space-y-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setPanel(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all active:scale-95',
                panel === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted/50',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Right content */}
      <main className="flex-1 overflow-auto px-8 py-8">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48 rounded-2xl" />
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-2xl" />)}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 shadow-sm">
            <p className="font-semibold text-foreground">Өгөгдөл ачаалахад алдаа гарлаа</p>
            <button
              onClick={load}
              className="mt-4 flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-medium shadow-sm transition-all hover:bg-card/80 active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Дахин оролдох
            </button>
          </div>
        )}

        {!loading && !error && panel === 'settings' && (
          <>
            <h1 className="mb-6 text-xl font-bold text-foreground">Тохиргоо</h1>
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
              {SETTING_KEYS.map((key, idx) => {
                const meta = SETTING_META[key]!
                return (
                  <div key={key} className={cn('flex items-center gap-4 px-5 py-4', idx < SETTING_KEYS.length - 1 && 'border-b border-border')}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settingDraft[key] ?? ''}
                        onChange={e => setSettingDraft(d => ({ ...d, [key]: e.target.value }))}
                        className="w-24 rounded-2xl border border-border bg-background px-3 py-1.5 text-right text-sm font-semibold text-foreground outline-none focus:border-primary"
                        placeholder="—"
                      />
                      <span className="w-8 text-sm text-muted-foreground">{meta.suffix}</span>
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-end border-t border-border px-5 py-4">
                <button
                  disabled={settingBusy || !settingsDirty}
                  onClick={saveAllSettings}
                  className="h-9 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                >
                  {settingBusy ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
              </div>
            </div>
          </>
        )}

        {!loading && !error && panel === 'service-types' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">Үйлчилгээний төрлүүд</h1>
              {!stAddOpen && (
                <button
                  onClick={() => setStAddOpen(true)}
                  className="flex h-9 items-center gap-1.5 rounded-2xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Нэмэх
                </button>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
              <div className="grid grid-cols-[2.5rem_1fr_6rem_5rem] gap-3 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>#</span><span>Нэр</span><span className="text-center">Статус</span><span className="text-right">Үйлдэл</span>
              </div>
              {stAddOpen && (
                <div className="grid grid-cols-[2.5rem_1fr_6rem_5rem] gap-3 items-center border-b border-border bg-primary/5 px-5 py-3">
                  <span className="text-xs text-muted-foreground">—</span>
                  <input autoFocus value={stNewName} onChange={e => setStNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && stCreate()} placeholder="Үйлчилгээний нэр" className="rounded-2xl border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary" />
                  <span />
                  <div className="flex justify-end gap-1">
                    <button disabled={!!stBusy['new']} onClick={stCreate} className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success transition-all hover:bg-success/20 active:scale-95 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                    <button onClick={() => { setStAddOpen(false); setStNewName('') }} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-muted active:scale-95"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
              {serviceTypes.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Үйлчилгээний төрөл байхгүй байна</p>}
              {serviceTypes.map((st, idx) => (
                <div key={st.id} className={cn('grid grid-cols-[2.5rem_1fr_6rem_5rem] gap-3 items-center px-5 py-3', idx < serviceTypes.length - 1 && 'border-b border-border')}>
                  <span className="text-xs text-muted-foreground">{st.id}</span>
                  {stEditId === st.id
                    ? <input autoFocus value={stDraft} onChange={e => setStDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') stSaveEdit(st.id); if (e.key === 'Escape') setStEditId(null) }} className="rounded-2xl border border-primary bg-background px-3 py-1.5 text-sm text-foreground outline-none" />
                    : <span className={cn('text-sm font-medium', !st.is_active && 'text-muted-foreground line-through')}>{st.name_mn}</span>
                  }
                  <div className="flex justify-center">
                    <button disabled={!!stBusy[st.id]} onClick={() => stToggle(st.id, st.is_active)} className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium transition-all active:scale-95 disabled:opacity-50', st.is_active ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-muted/50 text-muted-foreground hover:bg-muted')}>
                      {st.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                    </button>
                  </div>
                  <div className="flex justify-end gap-1">
                    {stEditId === st.id
                      ? <>
                          <button disabled={!!stBusy[st.id]} onClick={() => stSaveEdit(st.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success transition-all hover:bg-success/20 active:scale-95 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setStEditId(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-muted active:scale-95"><X className="h-4 w-4" /></button>
                        </>
                      : <button onClick={() => { setStEditId(st.id); setStDraft(st.name_mn) }} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-muted active:scale-95"><Pencil className="h-3.5 w-3.5" /></button>
                    }
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !error && panel === 'districts' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">Дүүргүүд</h1>
              {!distAddOpen && (
                <button
                  onClick={() => setDistAddOpen(true)}
                  className="flex h-9 items-center gap-1.5 rounded-2xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Нэмэх
                </button>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
              <div className="grid grid-cols-[2.5rem_1fr_6rem_5rem] gap-3 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>#</span><span>Нэр</span><span className="text-center">Статус</span><span className="text-right">Үйлдэл</span>
              </div>
              {distAddOpen && (
                <div className="grid grid-cols-[2.5rem_1fr_6rem_5rem] gap-3 items-center border-b border-border bg-primary/5 px-5 py-3">
                  <span className="text-xs text-muted-foreground">—</span>
                  <input autoFocus value={distNewName} onChange={e => setDistNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && distCreate()} placeholder="Дүүргийн нэр" className="rounded-2xl border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary" />
                  <span />
                  <div className="flex justify-end gap-1">
                    <button disabled={!!distBusy['new']} onClick={distCreate} className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success transition-all hover:bg-success/20 active:scale-95 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                    <button onClick={() => { setDistAddOpen(false); setDistNewName('') }} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-muted active:scale-95"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
              {districts.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Дүүрэг байхгүй байна</p>}
              {districts.map((district, idx) => (
                <div key={district.id} className={cn('grid grid-cols-[2.5rem_1fr_6rem_5rem] gap-3 items-center px-5 py-3', idx < districts.length - 1 && 'border-b border-border')}>
                  <span className="text-xs text-muted-foreground">{district.id}</span>
                  {distEditId === district.id
                    ? <input autoFocus value={distDraft} onChange={e => setDistDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') distSaveEdit(district.id); if (e.key === 'Escape') setDistEditId(null) }} className="rounded-2xl border border-primary bg-background px-3 py-1.5 text-sm text-foreground outline-none" />
                    : <span className={cn('text-sm font-medium', !district.is_active && 'text-muted-foreground line-through')}>{district.name_mn}</span>
                  }
                  <div className="flex justify-center">
                    <button disabled={!!distBusy[district.id]} onClick={() => distToggle(district.id, district.is_active)} className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium transition-all active:scale-95 disabled:opacity-50', district.is_active ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-muted/50 text-muted-foreground hover:bg-muted')}>
                      {district.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                    </button>
                  </div>
                  <div className="flex justify-end gap-1">
                    {distEditId === district.id
                      ? <>
                          <button disabled={!!distBusy[district.id]} onClick={() => distSaveEdit(district.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success transition-all hover:bg-success/20 active:scale-95 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setDistEditId(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-muted active:scale-95"><X className="h-4 w-4" /></button>
                        </>
                      : <button onClick={() => { setDistEditId(district.id); setDistDraft(district.name_mn) }} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-muted active:scale-95"><Pencil className="h-3.5 w-3.5" /></button>
                    }
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
