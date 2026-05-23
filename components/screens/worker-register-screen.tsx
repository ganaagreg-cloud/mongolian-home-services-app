'use client'

import { useState } from 'react'
import { ArrowLeft, Building2, FileText, Smartphone, Check, Clock, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface WorkerRegisterScreenProps {
  onBack: () => void
  onComplete: () => void
}

export function WorkerRegisterScreen({ onBack, onComplete }: WorkerRegisterScreenProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [danConnected, setDanConnected] = useState(false)
  const [policeFile, setPoliceFile] = useState<string | null>(null)
  const [imei, setImei] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleDanConnect = () => {
    // Simulate DAN connection
    setTimeout(() => setDanConnected(true), 1000)
  }

  const handleFileUpload = () => {
    // Simulate file upload
    setPoliceFile('police_clearance.pdf')
  }

  const handleSubmit = () => {
    setIsSubmitted(true)
  }

  const canProceed = () => {
    if (currentStep === 1) return danConnected
    if (currentStep === 2) return policeFile !== null
    if (currentStep === 3) return imei.length >= 15
    return false
  }

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent/10">
          <Clock className="h-12 w-12 text-accent" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">Хүлээгдэж байна</h1>
        <p className="mt-2 text-center text-muted-foreground">
          Таны бүртгэл шалгагдаж байна. 24-48 цагийн дотор хариу өгөх болно.
        </p>
        <Button
          onClick={onComplete}
          className="mt-8 h-14 w-full rounded-2xl bg-primary font-semibold shadow-md"
        >
          Нүүр хуудас руу буцах
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Ажилтнаар бүртгүүлэх</h1>
      </div>

      {/* Step Indicator */}
      <div className="mt-6 px-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                  step < currentStep
                    ? 'bg-success text-white'
                    : step === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-card text-muted-foreground shadow-sm'
                }`}
              >
                {step < currentStep ? <Check className="h-5 w-5" /> : step}
              </div>
              {step < 3 && (
                <div
                  className={`mx-2 h-1 w-16 rounded-full ${
                    step < currentStep ? 'bg-success' : 'bg-card'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Алхам {currentStep}/3
        </p>
      </div>

      {/* Step Content */}
      <div className="mt-8 px-6">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-6 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-4 text-center text-lg font-bold text-foreground">
                ДАН системтэй холбох
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Иргэний үнэмлэхээ баталгаажуулахын тулд ДАН системд нэвтэрнэ үү
              </p>
              {danConnected ? (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-success/10 py-3">
                  <Check className="h-5 w-5 text-success" />
                  <span className="font-medium text-success">Холбогдсон</span>
                </div>
              ) : (
                <Button
                  onClick={handleDanConnect}
                  className="mt-4 h-14 w-full rounded-2xl bg-primary font-semibold shadow-md"
                >
                  ДАН системээр нэвтрэх
                </Button>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-6 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-4 text-center text-lg font-bold text-foreground">
                Ял шийтгэлгүй тодорхойлолт
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Цагдаагийн газраас авсан тодорхойлолтоо оруулна уу
              </p>
              
              {policeFile ? (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-success/10 p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-success" />
                    <span className="font-medium text-success">{policeFile}</span>
                  </div>
                  <Check className="h-5 w-5 text-success" />
                </div>
              ) : (
                <button
                  onClick={handleFileUpload}
                  className="mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-8 transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <span className="mt-2 font-medium text-muted-foreground">
                    Файл оруулах
                  </span>
                  <span className="text-xs text-muted-foreground">PDF, JPG, PNG</span>
                </button>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-6 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-4 text-center text-lg font-bold text-foreground">
                IMEI дугаар
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Утасныхаа IMEI дугаарыг оруулна уу (*#06# гэж залгаж харна уу)
              </p>
              <Input
                placeholder="IMEI дугаар"
                value={imei}
                onChange={(e) => setImei(e.target.value.replace(/\D/g, '').slice(0, 15))}
                className="mt-4 h-12 rounded-2xl border-border bg-background text-center text-lg font-mono shadow-sm"
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {imei.length}/15 тэмдэгт
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={nextStep}
          disabled={!canProceed()}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold shadow-md disabled:opacity-50"
        >
          {currentStep === 3 ? 'Илгээх' : 'Үргэлжлүүлэх'}
        </Button>
      </div>
    </div>
  )
}
