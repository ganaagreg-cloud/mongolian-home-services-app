'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'

type UserRow = {
  id: number; name: string; phone: string; email: string; role: string
  is_worker: boolean; active_mode: string; dan_verified: boolean
  deleted_at: string | null; created_at: string; order_count: string
  better_auth_id: string | null; auth_method: string | null
}

type UserDetail = UserRow & {
  avatar_url: string
  orders: { id: string; service: string; status: string; total_amount: number; created_at: string }[]
}

export default function UsersPage() {
  const [q,       setQ]       = useState('')
  const [role,    setRole]    = useState('all')
  const [page,    setPage]    = useState(1)
  const [rows,    setRows]    = useState<UserRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const [loading, setLoading] = useState(true)

  const [editing,      setEditing]      = useState<UserDetail | null>(null)
  const [editLoading,  setEditLoading]  = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [newPassword,  setNewPassword]  = useState('')
  const [pwSaving,     setPwSaving]     = useState(false)
  const [confirmSuspend, setConfirmSuspend] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  // Editable fields
  const [editName,   setEditName]   = useState('')
  const [editPhone,  setEditPhone]  = useState('')
  const [editEmail,  setEditEmail]  = useState('')
  const [editRole,   setEditRole]   = useState('')
  const [editWorker, setEditWorker] = useState(false)
  const [editDan,    setEditDan]    = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const sp = new URLSearchParams({ q, role: role === 'all' ? '' : role, page: String(page) })
    apiFetch(`/api/admin/users?${sp}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) { setRows(j.data); setTotal(j.total); setPages(j.pages) } })
      .finally(() => setLoading(false))
  }, [q, role, page])

  useEffect(() => { setPage(1) }, [q, role])
  useEffect(() => { load() }, [load])

  function openEdit(id: number) {
    setEditLoading(true)
    apiFetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setEditing(j.data)
          setEditName(j.data.name)
          setEditPhone(j.data.phone ?? '')
          setEditEmail(j.data.email ?? '')
          setEditRole(j.data.role)
          setEditWorker(j.data.is_worker)
          setEditDan(j.data.dan_verified)
          setNewPassword('')
        }
      })
      .finally(() => setEditLoading(false))
  }

  async function save() {
    if (!editing) return
    setSaving(true)
    await apiFetch(`/api/admin/users/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName, phone: editPhone, email: editEmail,
        role: editRole, is_worker: editWorker, dan_verified: editDan,
      }),
    })
    setSaving(false)
    setEditing(null)
    showToast()
    load()
  }

  async function resetPassword() {
    if (!editing || !newPassword) return
    setPwSaving(true)
    await apiFetch(`/api/admin/users/${editing.id}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })
    setPwSaving(false)
    setNewPassword('')
    showToast('Нууц үг шинэчлэгдлээ')
  }

  async function toggleSuspend(id: number, suspended: boolean) {
    await apiFetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended }),
    })
    setConfirmSuspend(null)
    showToast()
    load()
  }

  function showToast(msg = 'Амжилттай') {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Хэрэглэгчид</h1>
        <span className="text-sm text-gray-500">Нийт: {total}</span>
      </div>

      {toast && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{toast}</div>}

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Нэр, утас, мэйл..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Дүр" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Бүгд</SelectItem>
            <SelectItem value="user">Хэрэглэгч</SelectItem>
            <SelectItem value="admin">Админ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Мэйл</TableHead>
                <TableHead>Дүр</TableHead>
                <TableHead>Ажилтан</TableHead>
                <TableHead>Захиалга</TableHead>
                <TableHead>Нэвтрэх</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                : rows.length === 0
                  ? <TableRow><TableCell colSpan={9} className="py-12 text-center text-gray-500">Хэрэглэгч олдсонгүй</TableCell></TableRow>
                  : rows.map((u) => (
                      <TableRow key={u.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{u.name || '—'}</TableCell>
                        <TableCell className="text-gray-600">{u.phone || '—'}</TableCell>
                        <TableCell className="text-gray-600 max-w-[140px] truncate">{u.email || '—'}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {u.is_worker && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Ажилтан</span>}
                        </TableCell>
                        <TableCell className="text-center">{u.order_count}</TableCell>
                        <TableCell className="text-xs text-gray-500">{u.auth_method ?? 'credential'}</TableCell>
                        <TableCell>
                          {u.deleted_at
                            ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Түдгэлзүүлсэн</span>
                            : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Идэвхтэй</span>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(u.id)}>
                              Засах
                            </Button>
                            {u.deleted_at
                              ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleSuspend(u.id, false)}>Сэргээх</Button>
                              : <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setConfirmSuspend(u.id)}>Түдгэлзүүлэх</Button>
                            }
                          </div>
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

      {/* Edit modal */}
      <Dialog open={!!editing || editLoading} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Хэрэглэгч засах</DialogTitle></DialogHeader>
          {editLoading || !editing ? (
            <div className="space-y-2 py-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Нэр</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" /></div>
                <div><Label>Утас</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1" /></div>
                <div><Label>Мэйл</Label><Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1" /></div>
                <div>
                  <Label>Дүр</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Хэрэглэгч</SelectItem>
                      <SelectItem value="admin">Админ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editWorker} onCheckedChange={setEditWorker} />
                  <Label>Ажилтан</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editDan} onCheckedChange={setEditDan} />
                  <Label>ДАН баталгаажсан</Label>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="mb-2 font-semibold text-gray-700">Нууц үг шинэчлэх</p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Шинэ нууц үг (8+ тэмдэгт)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={pwSaving || newPassword.length < 8}
                    onClick={resetPassword}
                  >
                    {pwSaving ? 'Хадгалж байна...' : 'Шинэчлэх'}
                  </Button>
                </div>
              </div>

              {editing.orders.length > 0 && (
                <div className="border-t pt-4">
                  <p className="mb-2 font-semibold text-gray-700">Захиалгын түүх</p>
                  <div className="max-h-40 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead><TableHead>Үйлчилгээ</TableHead>
                          <TableHead>Төлөв</TableHead><TableHead className="text-right">Дүн</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editing.orders.map((o) => (
                          <TableRow key={o.id}>
                            <TableCell>#{o.id}</TableCell>
                            <TableCell>{o.service}</TableCell>
                            <TableCell>{o.status}</TableCell>
                            <TableCell className="text-right">₮{o.total_amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Болих</Button>
                <Button disabled={saving} onClick={save}>{saving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmSuspend} onOpenChange={(o) => { if (!o) setConfirmSuspend(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Түдгэлзүүлэх</AlertDialogTitle>
            <AlertDialogDescription>Энэ хэрэглэгчийг түдгэлзүүлэхдээ итгэлтэй байна уу?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => confirmSuspend && toggleSuspend(confirmSuspend, true)}>
              Түдгэлзүүлэх
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
