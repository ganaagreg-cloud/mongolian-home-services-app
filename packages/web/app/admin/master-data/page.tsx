'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, X } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'

type ServiceType = {
  id: number; name_mn: string; icon: string; is_active: boolean; sort_order: number
  base_rate: number | null; peak_multiplier: number | null; holiday_multiplier: number | null
}
type District = { id: number; name_mn: string; is_active: boolean }
type PricingRule = { id: number; service_type_id: number; name_mn: string; base_rate: number; peak_multiplier: number; holiday_multiplier: number }
type Settings = Record<string, string>

type MasterData = { serviceTypes: ServiceType[]; districts: District[]; pricingRules: PricingRule[]; settings: Settings }

export default function MasterDataPage() {
  const [data,    setData]    = useState<MasterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState('')

  // Service type add/edit
  const [stModal,  setStModal]  = useState(false)
  const [stEdit,   setStEdit]   = useState<ServiceType | null>(null)
  const [stName,   setStName]   = useState('')
  const [stIcon,   setStIcon]   = useState('')
  const [stOrder,  setStOrder]  = useState('')
  const [stSaving, setStSaving] = useState(false)
  const [stDeact,  setStDeact]  = useState<number | null>(null)

  // District add/edit
  const [dModal,  setDModal]  = useState(false)
  const [dEdit,   setDEdit]   = useState<District | null>(null)
  const [dName,   setDName]   = useState('')
  const [dSaving, setDSaving] = useState(false)
  const [dDeact,  setDDeact]  = useState<number | null>(null)

  // Pricing edit
  const [prEdit,   setPrEdit]   = useState<PricingRule | null>(null)
  const [prBase,   setPrBase]   = useState('')
  const [prPeak,   setPrPeak]   = useState('')
  const [prHoliday,setPrHoliday]= useState('')
  const [prSaving, setPrSaving] = useState(false)

  // Settings
  const [settingVals, setSettingVals] = useState<Settings>({})
  const [settingSaving, setSettingSaving] = useState(false)

  function load() {
    setLoading(true)
    apiFetch('/api/admin/master-data')
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setData(j.data)
          setSettingVals({ ...j.data.settings })
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function showToast(msg = 'Амжилттай') { setToast(msg); setTimeout(() => setToast(''), 2500) }

  function openStModal(st?: ServiceType) {
    setStEdit(st ?? null)
    setStName(st?.name_mn ?? '')
    setStIcon(st?.icon ?? '')
    setStOrder(String(st?.sort_order ?? ''))
    setStModal(true)
  }

  async function saveSt() {
    setStSaving(true)
    if (stEdit) {
      await apiFetch('/api/admin/master-data/service_types', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stEdit.id, name_mn: stName, icon: stIcon, sort_order: Number(stOrder) || 0 }),
      })
    } else {
      await apiFetch('/api/admin/master-data/service_types', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_mn: stName, icon: stIcon, sort_order: Number(stOrder) || 0 }),
      })
    }
    setStSaving(false)
    setStModal(false)
    showToast()
    load()
  }

  async function deactivateSt(id: number) {
    await apiFetch(`/api/admin/master-data/service_types?id=${id}`, { method: 'DELETE' })
    setStDeact(null)
    showToast('Идэвхгүй болголоо')
    load()
  }

  async function toggleSt(id: number, is_active: boolean) {
    await apiFetch('/api/admin/master-data/service_types', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
    load()
  }

  function openDModal(d?: District) {
    setDEdit(d ?? null)
    setDName(d?.name_mn ?? '')
    setDModal(true)
  }

  async function saveD() {
    setDSaving(true)
    if (dEdit) {
      await apiFetch('/api/admin/master-data/districts', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dEdit.id, name_mn: dName }),
      })
    } else {
      await apiFetch('/api/admin/master-data/districts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_mn: dName }),
      })
    }
    setDSaving(false)
    setDModal(false)
    showToast()
    load()
  }

  async function toggleD(id: number, is_active: boolean) {
    await apiFetch('/api/admin/master-data/districts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
    load()
  }

  function openPrEdit(pr: PricingRule) {
    setPrEdit(pr)
    setPrBase(String(pr.base_rate))
    setPrPeak(String(pr.peak_multiplier))
    setPrHoliday(String(pr.holiday_multiplier))
  }

  async function savePr() {
    if (!prEdit) return
    setPrSaving(true)
    await apiFetch('/api/admin/master-data/pricing_rules', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: prEdit.id,
        base_rate: Number(prBase),
        peak_multiplier: Number(prPeak),
        holiday_multiplier: Number(prHoliday),
      }),
    })
    setPrSaving(false)
    setPrEdit(null)
    showToast()
    load()
  }

  async function saveSettings() {
    setSettingSaving(true)
    await Promise.all(
      Object.entries(settingVals).map(([key, value]) =>
        apiFetch('/api/admin/master-data/app_settings', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })
      )
    )
    setSettingSaving(false)
    showToast('Тохиргоо хадгалагдлаа')
    load()
  }

  const SETTING_LABELS: Record<string, string> = {
    free_cancel_minutes: 'Үнэгүй цуцлалтын хугацаа (мин)',
    late_cancel_fee:     'Хоцрогдолтой цуцлалтын төлбөр (₮)',
    platform_commission: 'Платформын шимтгэл (%)',
    damage_fund_rate:    'Даатгалын сангийн хувь (%)',
  }

  return (
    <div className="px-8 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Лавлах өгөгдөл</h1>

      {toast && <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{toast}</div>}

      {/* Service Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Үйлчилгээний төрлүүд</CardTitle>
            <Button size="sm" onClick={() => openStModal()}>
              <Plus className="mr-1 h-4 w-4" /> Нэмэх
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Нэр (МН)</TableHead>
                  <TableHead>Дүрс</TableHead>
                  <TableHead>Эрэмбэ</TableHead>
                  <TableHead>Идэвхтэй</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.serviceTypes.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-mono text-sm">{st.id}</TableCell>
                    <TableCell className="font-medium">{st.name_mn}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-500">{st.icon}</TableCell>
                    <TableCell>{st.sort_order}</TableCell>
                    <TableCell>
                      <Switch checked={st.is_active} onCheckedChange={(v) => toggleSt(st.id, v)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openStModal(st)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {st.is_active && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setStDeact(st.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Districts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Дүүрэг / Бүс нутаг</CardTitle>
            <Button size="sm" onClick={() => openDModal()}>
              <Plus className="mr-1 h-4 w-4" /> Нэмэх
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Нэр</TableHead>
                  <TableHead>Идэвхтэй</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.districts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm">{d.id}</TableCell>
                    <TableCell className="font-medium">{d.name_mn}</TableCell>
                    <TableCell><Switch checked={d.is_active} onCheckedChange={(v) => toggleD(d.id, v)} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDModal(d)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pricing rules */}
      <Card>
        <CardHeader><CardTitle>Үнийн дүрмүүд</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Үйлчилгээ</TableHead>
                  <TableHead>Үндсэн үнэ (₮/цаг)</TableHead>
                  <TableHead>Оргил нэмэгдэл (%)</TableHead>
                  <TableHead>Амралт нэмэгдэл (%)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.pricingRules.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell className="font-medium">{pr.name_mn}</TableCell>
                    <TableCell>₮{pr.base_rate.toLocaleString()}</TableCell>
                    <TableCell>{pr.peak_multiplier}%</TableCell>
                    <TableCell>{pr.holiday_multiplier}%</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openPrEdit(pr)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* App settings */}
      <Card>
        <CardHeader><CardTitle>Апп тохиргоо</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
            <div className="space-y-4 max-w-md">
              {Object.entries(settingVals).map(([key, val]) => (
                <div key={key}>
                  <Label>{SETTING_LABELS[key] ?? key}</Label>
                  <Input
                    className="mt-1"
                    value={val}
                    onChange={(e) => setSettingVals((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <Button disabled={settingSaving} onClick={saveSettings}>
                {settingSaving ? 'Хадгалж байна...' : 'Хадгалах'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <Dialog open={stModal} onOpenChange={setStModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{stEdit ? 'Засах' : 'Шинэ үйлчилгээний төрөл'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Нэр (МН)</Label><Input className="mt-1" value={stName} onChange={(e) => setStName(e.target.value)} /></div>
            <div><Label>Дүрс (lucide нэр)</Label><Input className="mt-1" placeholder="sparkles" value={stIcon} onChange={(e) => setStIcon(e.target.value)} /></div>
            <div><Label>Эрэмбэ</Label><Input className="mt-1" type="number" value={stOrder} onChange={(e) => setStOrder(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStModal(false)}>Болих</Button>
            <Button disabled={stSaving || !stName || !stIcon} onClick={saveSt}>
              {stSaving ? 'Хадгалж байна...' : 'Хадгалах'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dModal} onOpenChange={setDModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{dEdit ? 'Дүүрэг засах' : 'Шинэ дүүрэг'}</DialogTitle></DialogHeader>
          <div><Label>Нэр</Label><Input className="mt-1" value={dName} onChange={(e) => setDName(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDModal(false)}>Болих</Button>
            <Button disabled={dSaving || !dName} onClick={saveD}>{dSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!prEdit} onOpenChange={(o) => { if (!o) setPrEdit(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{prEdit?.name_mn} — үнийн дүрэм</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Үндсэн үнэ (₮/цаг)</Label><Input className="mt-1" type="number" value={prBase} onChange={(e) => setPrBase(e.target.value)} /></div>
            <div><Label>Оргил нэмэгдэл (%)</Label><Input className="mt-1" type="number" value={prPeak} onChange={(e) => setPrPeak(e.target.value)} /></div>
            <div><Label>Амралт нэмэгдэл (%)</Label><Input className="mt-1" type="number" value={prHoliday} onChange={(e) => setPrHoliday(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrEdit(null)}>Болих</Button>
            <Button disabled={prSaving} onClick={savePr}>{prSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!stDeact} onOpenChange={(o) => { if (!o) setStDeact(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Идэвхгүй болгох уу?</AlertDialogTitle>
            <AlertDialogDescription>Энэ үйлчилгээний төрлийг идэвхгүй болгоход нүүр дэлгэц болон захиалга үүсгэх хэсэгт харагдахгүй болно.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => stDeact && deactivateSt(stDeact)}>Идэвхгүй болгох</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
