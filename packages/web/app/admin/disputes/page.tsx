'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

type Dispute = {
  id: string; order_id: string; customer_name: string; worker_name: string
  service: string; issue: string; status: string
  total_amount: number; compensation_amount: number | null; created_at: string
}

export default function DisputesPage() {
  const [rows,    setRows]    = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Dispute | null>(null)
  const [amount,   setAmount]   = useState('')
  const [resolving, setResolving] = useState(false)
  const [confirm,   setConfirm]  = useState(false)
  const [toast, setToast] = useState('')

  function load() {
    setLoading(true)
    fetch('/api/admin/disputes')
      .then((r) => r.json())
      .then((j) => { if (j.success) setRows(j.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function resolve() {
    if (!selected) return
    setResolving(true)
    await fetch(`/api/admin/disputes/${selected.id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compensation: Number(amount) || 0 }),
    })
    setResolving(false)
    setConfirm(false)
    setSelected(null)
    setToast('Маргаан шийдэгдлээ')
    setTimeout(() => setToast(''), 2500)
    load()
  }

  const open = rows.filter((d) => d.status === 'open')
  const resolved = rows.filter((d) => d.status !== 'open')

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Маргаан</h1>
        <div className="flex gap-3 text-sm">
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">Нээлттэй: {open.length}</span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">Шийдэгдсэн: {resolved.length}</span>
        </div>
      </div>

      {toast && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{toast}</div>}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Харилцагч</TableHead>
                <TableHead>Ажилтан</TableHead>
                <TableHead>Захиалга</TableHead>
                <TableHead>Үйлчилгээ</TableHead>
                <TableHead>Шалтгаан</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead>Нөхөн олговор</TableHead>
                <TableHead>Огноо</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 10 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                : rows.length === 0
                  ? <TableRow><TableCell colSpan={10} className="py-12 text-center text-gray-500">Маргаан байхгүй байна</TableCell></TableRow>
                  : rows.map((d) => (
                      <TableRow key={d.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">#{d.id}</TableCell>
                        <TableCell>{d.customer_name}</TableCell>
                        <TableCell>{d.worker_name}</TableCell>
                        <TableCell className="font-mono">#{d.order_id}</TableCell>
                        <TableCell>{d.service}</TableCell>
                        <TableCell className="max-w-[140px] truncate">{d.issue}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {d.status === 'open' ? 'Нээлттэй' : 'Шийдэгдсэн'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {d.compensation_amount != null ? `₮${d.compensation_amount.toLocaleString()}` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(d.created_at).toLocaleDateString('mn-MN')}
                        </TableCell>
                        <TableCell>
                          {d.status === 'open' && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setSelected(d); setAmount(String(d.compensation_amount ?? '')) }}
                            >
                              Шийдэх
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resolve modal */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Маргаан шийдэх #{selected?.id}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Харилцагч', selected.customer_name],
                  ['Ажилтан',   selected.worker_name],
                  ['Үйлчилгээ', selected.service],
                  ['Захиалгын дүн', `₮${selected.total_amount.toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="font-medium">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Маргааны шалтгаан</p>
                <p className="rounded bg-gray-50 p-2">{selected.issue}</p>
              </div>
              <div>
                <Label>Нөхөн олговор (₮)</Label>
                <Input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                  placeholder="0"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Болих</Button>
                <Button onClick={() => setConfirm(true)}>Шийдэх</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={(o) => { if (!o) setConfirm(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Маргааныг шийдэх үү?</AlertDialogTitle>
            <AlertDialogDescription>
              {Number(amount) > 0
                ? `₮${Number(amount).toLocaleString()} нөхөн олговор олгон маргааныг дуусгах уу?`
                : 'Нөхөн олговоргүйгээр маргааныг дуусгах уу?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolving}>Болих</AlertDialogCancel>
            <AlertDialogAction disabled={resolving} onClick={resolve}>
              {resolving ? 'Шийдэж байна...' : 'Тийм, шийдэх'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
