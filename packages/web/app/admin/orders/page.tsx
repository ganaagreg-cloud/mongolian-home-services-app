'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'

type OrderRow = {
  id: number; service: string; status: string; address: string
  total_amount: number; payment_status: string; scheduled_date: string
  created_at: string; customer_name: string; worker_name: string | null
  matching_strategy: string; urgent: boolean
}
type OrderDetail = OrderRow & {
  customer_phone: string; worker_specialty: string | null; price_per_hour: number | null
  before_photo_url: string | null; after_photo_url: string | null; hours: number
  rooms: number | null; area_sqm: number | null; notes: string | null
  messages: { sender_name: string; text: string; created_at: string }[]
  transactions: { amount: number; type: string; created_at: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  searching_worker:           'bg-yellow-100 text-yellow-800',
  pending_worker_acceptance:  'bg-blue-100 text-blue-800',
  worker_assigned:            'bg-indigo-100 text-indigo-800',
  worker_on_the_way:          'bg-purple-100 text-purple-800',
  in_progress:                'bg-orange-100 text-orange-800',
  completed:                  'bg-green-100 text-green-800',
  rated:                      'bg-green-200 text-green-900',
  cancelled_by_user:          'bg-red-100 text-red-800',
  cancelled_by_admin:         'bg-red-200 text-red-900',
  no_workers_found:           'bg-gray-100 text-gray-700',
  pending_acceptances:        'bg-teal-100 text-teal-800',
}

const STATUSES = [
  'all','searching_worker','pending_worker_acceptance','worker_assigned',
  'worker_on_the_way','in_progress','completed','rated',
  'cancelled_by_user','cancelled_by_admin','no_workers_found',
]

const SERVICES = ['Цэвэрлэгээ','Угаалга','Сантехник','Цахилгаан','Будаг','Агааржуулалт','Жижиг засвар','Нүүлгэлт']

export default function OrdersPage() {
  const [q,       setQ]       = useState('')
  const [status,  setStatus]  = useState('all')
  const [service, setService] = useState('all')
  const [page,    setPage]    = useState(1)
  const [rows,    setRows]    = useState<OrderRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const [loading, setLoading] = useState(true)

  const [detail,        setDetail]        = useState<OrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelId,      setCancelId]      = useState<number | null>(null)
  const [cancelling,    setCancelling]    = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const sp = new URLSearchParams({
      q, status: status === 'all' ? '' : status,
      service: service === 'all' ? '' : service, page: String(page),
    })
    apiFetch(`/api/admin/orders?${sp}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) { setRows(j.data); setTotal(j.total); setPages(j.pages) } })
      .finally(() => setLoading(false))
  }, [q, status, service, page])

  useEffect(() => { setPage(1) }, [q, status, service])
  useEffect(() => { load() }, [load])

  function openDetail(id: number) {
    setDetailLoading(true)
    setDetail(null)
    apiFetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setDetail(j.data) })
      .finally(() => setDetailLoading(false))
  }

  async function cancelOrder() {
    if (!cancelId) return
    setCancelling(true)
    await apiFetch(`/api/admin/orders/${cancelId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled_by_admin' }),
    })
    setCancelling(false)
    setCancelId(null)
    setDetail(null)
    setToast('Захиалга цуцлагдлаа')
    setTimeout(() => setToast(''), 2500)
    load()
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Захиалгууд</h1>
        <span className="text-sm text-gray-500">Нийт: {total}</span>
      </div>

      {toast && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{toast}</div>}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Харилцагч, ажилтан, хаяг..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Төлөв" /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'Бүгд' : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Үйлчилгээ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Бүгд</SelectItem>
            {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Харилцагч</TableHead>
                <TableHead>Ажилтан</TableHead>
                <TableHead>Үйлчилгээ</TableHead>
                <TableHead>Хаяг</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead>Дүн</TableHead>
                <TableHead>Төлбөр</TableHead>
                <TableHead>Огноо</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 10 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                : rows.length === 0
                  ? <TableRow><TableCell colSpan={10} className="py-12 text-center text-gray-500">Захиалга олдсонгүй</TableCell></TableRow>
                  : rows.map((o) => (
                      <TableRow key={o.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openDetail(o.id)}>
                        <TableCell className="font-mono text-sm font-medium">#{o.id}</TableCell>
                        <TableCell>{o.customer_name}</TableCell>
                        <TableCell>{o.worker_name ?? '—'}</TableCell>
                        <TableCell>{o.service}</TableCell>
                        <TableCell className="max-w-[120px] truncate text-gray-600">{o.address}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold">₮{o.total_amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {o.payment_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(o.created_at).toLocaleDateString('mn-MN')}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {!['completed','rated','cancelled_by_user','cancelled_by_admin'].includes(o.status) && (
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setCancelId(o.id)}>
                              Цуцлах
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{page} / {pages} хуудас</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!detail || detailLoading} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Захиалга #{detail?.id}</DialogTitle></DialogHeader>
          {detailLoading || !detail ? (
            <div className="space-y-2 py-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Харилцагч', detail.customer_name],
                  ['Утас', detail.customer_phone],
                  ['Ажилтан', detail.worker_name ?? '—'],
                  ['Үйлчилгээ', detail.service],
                  ['Хаяг', detail.address],
                  ['Дүн', `₮${detail.total_amount.toLocaleString()}`],
                  ['Цаг', `${detail.hours}ц`],
                  ['Өрөө', detail.rooms ?? '—'],
                  ['Талбай', detail.area_sqm ? `${detail.area_sqm}м²` : '—'],
                  ['Стратеги', detail.matching_strategy],
                  ['Яаралтай', detail.urgent ? 'Тийм' : 'Үгүй'],
                  ['Төлбөр', detail.payment_status],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="font-medium">{String(v)}</p>
                  </div>
                ))}
              </div>

              {detail.notes && <div><p className="text-xs text-gray-500">Тэмдэглэл</p><p>{detail.notes}</p></div>}

              <div className="flex gap-4">
                {detail.before_photo_url && (
                  <div><p className="text-xs text-gray-500 mb-1">Өмнөх зураг</p>
                    <a href={detail.before_photo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">Харах</a></div>
                )}
                {detail.after_photo_url && (
                  <div><p className="text-xs text-gray-500 mb-1">Дараах зураг</p>
                    <a href={detail.after_photo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">Харах</a></div>
                )}
              </div>

              {detail.messages.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-gray-700">Чат ({detail.messages.length})</p>
                  <div className="max-h-32 overflow-y-auto rounded border p-2 text-xs space-y-1">
                    {detail.messages.map((m, i) => (
                      <p key={i}><span className="font-medium">{m.sender_name}:</span> {m.text}</p>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                {!['completed','rated','cancelled_by_user','cancelled_by_admin'].includes(detail.status) && (
                  <Button variant="destructive" onClick={() => setCancelId(detail.id)}>Захиалга цуцлах</Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelId} onOpenChange={(o) => { if (!o) setCancelId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Захиалга цуцлах</AlertDialogTitle>
            <AlertDialogDescription>#{cancelId} захиалгыг цуцлахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Болих</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" disabled={cancelling} onClick={cancelOrder}>
              {cancelling ? 'Цуцалж байна...' : 'Цуцлах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
