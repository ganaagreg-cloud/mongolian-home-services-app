'use client'

import { useState } from 'react'
import { ArrowLeft, Check, X, FileText, User, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface PendingWorker {
  id: string
  name: string
  register: string
  phone: string
  danPhoto: string
  policeDocument: string
  imei: string
  appliedAt: string
}

interface AdminVerifyScreenProps {
  onBack: () => void
  onApprove: (workerId: string) => void
  onReject: (workerId: string, reason: string) => void
}

const mockPendingWorkers: PendingWorker[] = [
  {
    id: '1',
    name: 'Баттулга Ганболд',
    register: 'УБ99112233',
    phone: '+976 9911 2233',
    danPhoto: '',
    policeDocument: 'police_clearance.pdf',
    imei: '123456789012345',
    appliedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Энхбаяр Мөнхбат',
    register: 'УБ88223344',
    phone: '+976 8822 3344',
    danPhoto: '',
    policeDocument: 'police_doc.pdf',
    imei: '987654321098765',
    appliedAt: '2024-01-14',
  },
]

export function AdminVerifyScreen({ onBack, onApprove, onReject }: AdminVerifyScreenProps) {
  const [selectedWorker, setSelectedWorker] = useState<PendingWorker | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [pendingWorkers, setPendingWorkers] = useState(mockPendingWorkers)

  const handleApprove = (workerId: string) => {
    onApprove(workerId)
    setPendingWorkers(pendingWorkers.filter(w => w.id !== workerId))
    setSelectedWorker(null)
  }

  const handleReject = (workerId: string) => {
    if (!rejectionReason.trim()) return
    onReject(workerId, rejectionReason)
    setPendingWorkers(pendingWorkers.filter(w => w.id !== workerId))
    setSelectedWorker(null)
    setRejectionReason('')
    setShowRejectInput(false)
  }

  if (selectedWorker) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-12">
          <button
            onClick={() => {
              setSelectedWorker(null)
              setShowRejectInput(false)
              setRejectionReason('')
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Ажилтан шалгах</h1>
        </div>

        {/* Worker Info Card */}
        <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={selectedWorker.danPhoto} />
              <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                {selectedWorker.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-foreground">{selectedWorker.name}</p>
              <p className="text-sm text-muted-foreground">{selectedWorker.register}</p>
              <p className="text-sm text-muted-foreground">{selectedWorker.phone}</p>
            </div>
          </div>
        </div>

        {/* DAN Photo */}
        <div className="mt-4 mx-6">
          <h2 className="font-semibold text-foreground">ДАН зураг</h2>
          <div className="mt-2 aspect-[3/4] max-w-[200px] rounded-2xl bg-card shadow-sm flex items-center justify-center">
            <User className="h-16 w-16 text-muted-foreground" />
          </div>
        </div>

        {/* Police Document */}
        <div className="mt-4 mx-6">
          <h2 className="font-semibold text-foreground">Ял шийтгэлгүй тодорхойлолт</h2>
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{selectedWorker.policeDocument}</p>
              <p className="text-xs text-muted-foreground">PDF баримт</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl">
              Үзэх
            </Button>
          </div>
        </div>

        {/* IMEI */}
        <div className="mt-4 mx-6">
          <h2 className="font-semibold text-foreground">IMEI дугаар</h2>
          <div className="mt-2 rounded-2xl bg-card p-4 shadow-sm">
            <p className="font-mono text-foreground">{selectedWorker.imei}</p>
          </div>
        </div>

        {/* Rejection Reason */}
        {showRejectInput && (
          <div className="mt-4 mx-6">
            <h2 className="font-semibold text-foreground">Татгалзах шалтгаан</h2>
            <Textarea
              placeholder="Шалтгаанаа бичнэ үү..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2 min-h-[100px] rounded-2xl border-border bg-card shadow-sm resize-none"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
          {showRejectInput ? (
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowRejectInput(false)
                  setRejectionReason('')
                }}
                variant="outline"
                className="h-14 flex-1 rounded-2xl border-border font-semibold"
              >
                Буцах
              </Button>
              <Button
                onClick={() => handleReject(selectedWorker.id)}
                disabled={!rejectionReason.trim()}
                className="h-14 flex-1 rounded-2xl bg-destructive font-semibold text-white shadow-md disabled:opacity-50"
              >
                Илгээх
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={() => setShowRejectInput(true)}
                variant="outline"
                className="h-14 flex-1 rounded-2xl border-destructive text-destructive font-semibold hover:bg-destructive/10"
              >
                <X className="mr-2 h-5 w-5" />
                Татгалзах
              </Button>
              <Button
                onClick={() => handleApprove(selectedWorker.id)}
                className="h-14 flex-1 rounded-2xl bg-success font-semibold text-white shadow-md hover:bg-success/90"
              >
                <Check className="mr-2 h-5 w-5" />
                Зөвшөөрөх
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Ажилтан баталгаажуулалт</h1>
      </div>

      {/* Pending List */}
      <div className="mt-6 px-6">
        <p className="text-sm text-muted-foreground">{pendingWorkers.length} хүлээгдэж байна</p>
        
        {pendingWorkers.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-card p-8 shadow-sm text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto">
              <Check className="h-8 w-8 text-success" />
            </div>
            <p className="mt-4 font-medium text-foreground">Бүгд шалгагдсан!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Хүлээгдэж буй хүсэлт байхгүй байна
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {pendingWorkers.map((worker) => (
              <button
                key={worker.id}
                onClick={() => setSelectedWorker(worker)}
                className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-sm text-left"
              >
                <Avatar className="h-14 w-14">
                  <AvatarImage src={worker.danPhoto} />
                  <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                    {worker.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{worker.name}</p>
                  <p className="text-sm text-muted-foreground">{worker.register}</p>
                  <p className="text-xs text-muted-foreground">Огноо: {worker.appliedAt}</p>
                </div>
                <Shield className="h-5 w-5 text-accent" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
