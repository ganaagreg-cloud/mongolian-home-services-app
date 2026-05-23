'use client'

import { useState } from 'react'
import { ArrowLeft, AlertTriangle, Check, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Dispute {
  id: string
  customer: string
  worker: string
  service: string
  issue: string
  amount: number
  status: 'pending' | 'resolved'
  createdAt: string
}

interface AdminDisputesScreenProps {
  onBack: () => void
  onResolve: (disputeId: string, amount: number) => void
}

const mockDisputes: Dispute[] = [
  {
    id: '1',
    customer: 'Болормаа Б.',
    worker: 'Батболд Д.',
    service: 'Цэвэрлэгээ',
    issue: 'Ажил дутуу хийсэн, угаалгын өрөө цэвэрлээгүй',
    amount: 50000,
    status: 'pending',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    customer: 'Ганзориг М.',
    worker: 'Түвшинбаяр О.',
    service: 'Сантехник',
    issue: 'Засварын дараа ус алдаж байна',
    amount: 75000,
    status: 'pending',
    createdAt: '2024-01-14',
  },
  {
    id: '3',
    customer: 'Энхжаргал Д.',
    worker: 'Эрдэнэбат М.',
    service: 'Цахилгаан',
    issue: 'Ажилтан ирээгүй',
    amount: 60000,
    status: 'resolved',
    createdAt: '2024-01-13',
  },
]

export function AdminDisputesScreen({ onBack, onResolve }: AdminDisputesScreenProps) {
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [compensationAmount, setCompensationAmount] = useState('')
  const [disputes, setDisputes] = useState(mockDisputes)

  const handleResolve = (disputeId: string) => {
    const amount = parseInt(compensationAmount) || 0
    onResolve(disputeId, amount)
    setDisputes(disputes.map(d => 
      d.id === disputeId ? { ...d, status: 'resolved' as const } : d
    ))
    setSelectedDispute(null)
    setCompensationAmount('')
  }

  const pendingCount = disputes.filter(d => d.status === 'pending').length

  if (selectedDispute) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-12">
          <button
            onClick={() => {
              setSelectedDispute(null)
              setCompensationAmount('')
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Гомдол шийдвэрлэх</h1>
        </div>

        {/* Dispute Info */}
        <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Захиалагч</p>
              <p className="font-semibold text-foreground">{selectedDispute.customer}</p>
            </div>
            <Badge className={selectedDispute.status === 'pending' 
              ? 'bg-accent/10 text-accent border-0' 
              : 'bg-success/10 text-success border-0'
            }>
              {selectedDispute.status === 'pending' ? 'Шийдэгдэж байна' : 'Дууссан'}
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">Ажилтан</p>
            <p className="font-medium text-foreground">{selectedDispute.worker}</p>
          </div>
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">Үйлчилгээ</p>
            <p className="font-medium text-foreground">{selectedDispute.service}</p>
          </div>
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">Захиалгын дүн</p>
            <p className="font-medium text-foreground">₮{selectedDispute.amount.toLocaleString()}</p>
          </div>
        </div>

        {/* Issue Description */}
        <div className="mt-4 mx-6">
          <h2 className="font-semibold text-foreground">Гомдлын утга</h2>
          <div className="mt-2 rounded-2xl bg-destructive/10 p-4">
            <p className="text-sm text-foreground">{selectedDispute.issue}</p>
          </div>
        </div>

        {/* Before/After Photos */}
        <div className="mt-4 mx-6">
          <h2 className="font-semibold text-foreground">Өмнө / Дараа зураг</h2>
          <div className="mt-2 flex gap-3">
            <div className="flex-1 aspect-square rounded-2xl bg-card shadow-sm flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Өмнө</span>
            </div>
            <div className="flex-1 aspect-square rounded-2xl bg-card shadow-sm flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Дараа</span>
            </div>
          </div>
        </div>

        {/* Compensation Input */}
        {selectedDispute.status === 'pending' && (
          <div className="mt-4 mx-6">
            <h2 className="font-semibold text-foreground">Хохирол барагдуулах дүн</h2>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₮</span>
              <Input
                type="number"
                placeholder="0"
                value={compensationAmount}
                onChange={(e) => setCompensationAmount(e.target.value)}
                className="h-12 rounded-2xl border-border bg-card pl-8 text-lg shadow-sm"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Максимум: ₮{selectedDispute.amount.toLocaleString()}
            </p>
          </div>
        )}

        {/* Resolve Button */}
        {selectedDispute.status === 'pending' && (
          <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
            <Button
              onClick={() => handleResolve(selectedDispute.id)}
              className="h-14 w-full rounded-2xl bg-primary font-semibold shadow-md"
            >
              Хохирол барагдуулах
            </Button>
          </div>
        )}
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
        <h1 className="text-xl font-bold text-foreground">Гомдол шийдвэрлэх</h1>
      </div>

      {/* Stats */}
      <div className="mt-6 mx-6 flex gap-3">
        <div className="flex-1 rounded-2xl bg-accent/10 p-4 text-center">
          <p className="text-2xl font-bold text-accent">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Шийдэгдэж байна</p>
        </div>
        <div className="flex-1 rounded-2xl bg-success/10 p-4 text-center">
          <p className="text-2xl font-bold text-success">{disputes.length - pendingCount}</p>
          <p className="text-xs text-muted-foreground">Дууссан</p>
        </div>
      </div>

      {/* Disputes List */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Бүх гомдол</h2>
        <div className="mt-4 space-y-3">
          {disputes.map((dispute) => (
            <button
              key={dispute.id}
              onClick={() => setSelectedDispute(dispute)}
              className="flex w-full items-start gap-4 rounded-2xl bg-card p-4 shadow-sm text-left"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                dispute.status === 'pending' ? 'bg-accent/10' : 'bg-success/10'
              }`}>
                {dispute.status === 'pending' ? (
                  <Clock className="h-5 w-5 text-accent" />
                ) : (
                  <Check className="h-5 w-5 text-success" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-foreground">{dispute.customer}</p>
                  <Badge className={dispute.status === 'pending' 
                    ? 'bg-accent/10 text-accent border-0' 
                    : 'bg-success/10 text-success border-0'
                  }>
                    {dispute.status === 'pending' ? 'Шийдэгдэж байна' : 'Дууссан'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{dispute.service} - {dispute.worker}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{dispute.issue}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
