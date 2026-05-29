'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'

type WorkerRow = {
  id: number; name: string; phone: string; specialty: string
  price_per_hour: number; rating: number; review_count: number
  is_active: boolean; is_available: boolean; rejected_at: string | null
  banking_verified: boolean; dan_verified: boolean; created_at: string
  police_file: string | null
}
type WorkerDetail = WorkerRow & {
  user_id: number; email: string; imei: string | null
  bank_name?: string; account_number?: string; account_holder_name?: string
  orders: { id: string; service: string; status: string; total_amount: number; created_at: string; customer_name: string }[]
}

function workerStatus(w: WorkerRow) {
  if (w.rejected_at) return 'suspended'
  if (w.is_active)   return 'active'
  return 'pending'
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  active:    'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
}

export default function WorkersPage() {
  const [tab,     setTab]     = useState('all')
  const [q,       setQ]       = useState('')
  const [page,    setPage]    = useState(1)
  const [rows,    setRows]    = useState<WorkerRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const [loading, setLoading] = useState(true)

  const [detail,        setDetail]        = useState<WorkerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirm,       setConfirm]       = useState<{ action: string; workerId: number } | null>(null)
  const [acting,        setActing]        = useState(false)
  const [toast,         setToast]         = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const sp = new URLSearchParams({ status: tab, q, page: String(page) })
    apiFetch(`/api/admin/workers?${sp}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) { setRows(j.data); setTotal(j.total); setPages(j.pages) }
      })
      .finally(() => setLoading(false))
  }, [tab, q, page])

  useEffect(() => { setPage(1) }, [tab, q])
  useEffect(() => { load() }, [load])

  function openDetail(id: number) {
    setDetailLoading(true)
    apiFetch(`/api/admin/workers/${id}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setDetail(j.data) })
      .finally(() => setDetailLoading(false))
  }

  async function doAction(action: string, workerId: number) {
    setActing(true)
    let url = ''; let body: Record<string, unknown> = {}
    if (action === 'approve') { url = `/api/admin/workers/${workerId}/verify`; body = { action: 'approve' } }
    if (action === 'reject')  { url = `/api/admin/workers/${workerId}/verify`; body = { action: 'reject' } }
    if (action === 'suspend') { url = `/api/admin/workers/${workerId}`; body = { rejected_at: new Date().toISOString() } }
    if (action === 'unsuspend') { url = `/api/admin/workers/${workerId}`; body = { rejected_at: null, is_active: true } }
    if (action === 'verify-banking') { url = `/api/admin/banking/${workerId}/verify`; body = { action: 'verify' } }
    if (action === 'reject-banking') { url = `/api/admin/banking/${workerId}/verify`; body = { action: 'reject' } }

    const method = (action === 'approve' || action === 'reject' || action.includes('banking')) ? 'POST' : 'PATCH'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setActing(false)
    setConfirm(null)
    setDetail(null)
    setToast('Амжилттай')
    setTimeout(() => setToast(''), 2500)
    load()
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ажилтнууд</h1>
        <span className="text-sm text-gray-500">Нийт: {total}</span>
      </div>

      {toast && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{toast}</div>
      )}

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Нэр эсвэл утас..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Бүгд</TabsTrigger>
          <TabsTrigger value="pending">Хүлээгдэж буй</TabsTrigger>
          <TabsTrigger value="active">Идэвхтэй</TabsTrigger>
          <TabsTrigger value="suspended">Түдгэлзүүлсэн</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Мэргэжил</TableHead>
                <TableHead>Үнэ/цаг</TableHead>
                <TableHead>Үнэлгээ</TableHead>
                <TableHead>Банк</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead>Бүртгэсэн</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-gray-500">
                        Ажилтан олдсонгүй
                      </TableCell>
                    </TableRow>
                  )
                  : rows.map((w) => {
                      const st = workerStatus(w)
                      return (
                        <TableRow key={w.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openDetail(w.id)}>
                          <TableCell className="font-medium">{w.name}</TableCell>
                          <TableCell className="text-gray-600">{w.phone}</TableCell>
                          <TableCell>{w.specialty}</TableCell>
                          <TableCell>₮{w.price_per_hour.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span className="text-sm">{w.rating.toFixed(1)}</span>
                              <span className="text-xs text-gray-400">({w.review_count})</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${w.banking_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {w.banking_verified ? 'Баталгаажсан' : 'Баталгаажаагүй'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[st]}`}>
                              {st === 'pending' ? 'Хүлээгдэж буй' : st === 'active' ? 'Идэвхтэй' : 'Түдгэлзүүлсэн'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {new Date(w.created_at).toLocaleDateString('mn-MN')}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              {st === 'pending' && (
                                <>
                                  <Button size="sm" className="h-7 text-xs" onClick={() => setConfirm({ action: 'approve', workerId: w.id })}>
                                    Зөвшөөрөх
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setConfirm({ action: 'reject', workerId: w.id })}>
                                    Татгалзах
                                  </Button>
                                </>
                              )}
                              {st === 'active' && (
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setConfirm({ action: 'suspend', workerId: w.id })}>
                                  Түдгэлзүүлэх
                                </Button>
                              )}
                              {st === 'suspended' && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirm({ action: 'unsuspend', workerId: w.id })}>
                                  Сэргээх
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{page} / {pages} хуудас</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!detail || detailLoading} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ажилтны дэлгэрэнгүй</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="space-y-2 py-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : (
            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Нэр', detail.name], ['Утас', detail.phone], ['Мэйл', detail.email || '—'],
                  ['Мэргэжил', detail.specialty], ['Үнэ/цаг', `₮${detail.price_per_hour.toLocaleString()}`],
                  ['Үнэлгээ', `${detail.rating} (${detail.review_count})`],
                  ['ДАН', detail.dan_verified ? 'Баталгаажсан' : 'Баталгаажаагүй'],
                  ['Банк', detail.banking_verified ? 'Баталгаажсан' : 'Баталгаажаагүй'],
                  ['Банк нэр', detail.bank_name || '—'],
                  ['Данс №', detail.account_number || '—'],
                  ['Данс эзэмшигч', detail.account_holder_name || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="font-medium">{v}</p>
                  </div>
                ))}
              </div>

              {detail.police_file && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Цагдаагийн тодорхойлолт</p>
                  <a href={detail.police_file} target="_blank" rel="noopener noreferrer"
                    className="text-primary underline text-sm">Файл харах</a>
                </div>
              )}

              {detail.orders.length > 0 && (
                <div>
                  <p className="mb-2 font-semibold text-gray-700">Захиалгын түүх ({detail.orders.length})</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Үйлчилгээ</TableHead>
                        <TableHead>Харилцагч</TableHead>
                        <TableHead>Төлөв</TableHead>
                        <TableHead className="text-right">Дүн</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.orders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell>#{o.id}</TableCell>
                          <TableCell>{o.service}</TableCell>
                          <TableCell>{o.customer_name}</TableCell>
                          <TableCell>{o.status}</TableCell>
                          <TableCell className="text-right">₮{o.total_amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <DialogFooter className="flex gap-2 flex-wrap">
                {workerStatus(detail as unknown as WorkerRow) !== 'active' && (
                  <Button onClick={() => setConfirm({ action: 'approve', workerId: detail.id })}>Зөвшөөрөх</Button>
                )}
                {!detail.banking_verified && (
                  <Button variant="outline" onClick={() => setConfirm({ action: 'verify-banking', workerId: detail.id })}>
                    Банк баталгаажуулах
                  </Button>
                )}
                {!detail.rejected_at ? (
                  <Button variant="destructive" onClick={() => setConfirm({ action: 'suspend', workerId: detail.id })}>
                    Түдгэлзүүлэх
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setConfirm({ action: 'unsuspend', workerId: detail.id })}>
                    Сэргээх
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Баталгаажуулах</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг хийхдээ итгэлтэй байна уу?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={() => confirm && doAction(confirm.action, confirm.workerId)}
            >
              {acting ? 'Түр хүлээнэ үү...' : 'Тийм'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
