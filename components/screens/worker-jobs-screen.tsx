'use client'

import { useState } from 'react'
import { MapPin, Clock, Check, X, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

interface Job {
  id: string
  serviceType: string
  address: string
  distance: string
  price: number
  estimatedTime: string
}

interface WorkerJobsScreenProps {
  onAcceptJob: (jobId: string) => void
  onDeclineJob: (jobId: string) => void
}

const mockJobs: Job[] = [
  {
    id: '1',
    serviceType: 'Цэвэрлэгээ',
    address: 'БЗД, 3-р хороо, Нарны зам 45',
    distance: '2.5 км',
    price: 50000,
    estimatedTime: '2 цаг',
  },
  {
    id: '2',
    serviceType: 'Сантехник',
    address: 'СБД, 1-р хороо, Энхтайван 20',
    distance: '4.1 км',
    price: 75000,
    estimatedTime: '1.5 цаг',
  },
]

export function WorkerJobsScreen({ onAcceptJob, onDeclineJob }: WorkerJobsScreenProps) {
  const [isActive, setIsActive] = useState(true)
  const [jobs, setJobs] = useState(mockJobs)

  const handleDecline = (jobId: string) => {
    setJobs(jobs.filter(j => j.id !== jobId))
    onDeclineJob(jobId)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-12">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Ажлын самбар</h1>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${isActive ? 'text-success' : 'text-muted-foreground'}`}>
              {isActive ? 'Идэвхтэй' : 'Амарч байна'}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-success"
            />
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="mt-6 mx-6 h-40 rounded-2xl bg-card shadow-sm flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Газрын зураг</p>
        </div>
      </div>

      {/* Job Cards */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Ирсэн захиалга</h2>
        
        {!isActive ? (
          <div className="mt-4 rounded-2xl bg-card p-8 shadow-sm text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 font-medium text-foreground">Амарч байна</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Идэвхжүүлснээр захиалга хүлээн авах боломжтой
            </p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-card p-8 shadow-sm text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 font-medium text-foreground">Одоо захиалга байхгүй байна</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Шинэ захиалга ирэхэд мэдэгдэл илгээх болно
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      {job.serviceType}
                    </span>
                    <div className="mt-3 flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-foreground">{job.address}</p>
                        <p className="text-xs text-muted-foreground">{job.distance}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">₮{job.price.toLocaleString()}</p>
                    <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">{job.estimatedTime}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={() => handleDecline(job.id)}
                    variant="outline"
                    className="h-12 flex-1 rounded-2xl border-border bg-card font-semibold shadow-sm"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Татгалзах
                  </Button>
                  <Button
                    onClick={() => onAcceptJob(job.id)}
                    className="h-12 flex-1 rounded-2xl bg-success font-semibold text-white shadow-md hover:bg-success/90"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Хүлээн авах
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
