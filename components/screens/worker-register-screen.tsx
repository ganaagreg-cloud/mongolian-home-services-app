'use client'

import { useState } from 'react'
import { ArrowLeft, Building2, FileText, Smartphone, Check, Clock, Upload, CreditCard, AlertTriangle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface WorkerRegisterScreenProps {
  onBack: () => void
  onComplete: () => void
}

const BANKS = [
  'Хаан Банк',
  'Голомт',
  'ХХБ',
  'Төрийн Банк',
  'Хас Банк',
  'Капитрон',
  'Үндэсний хөрөнгө оруулалт',
  'Чингис Хаан Банк',
]

const IBAN_RE = /^MN\d{2}[A-Z0-9]{18}$/

function fieldError(field: string, value: string): string {
  switch (field) {
    case 'bankName':
      return !value ? 'Банкны нэрийг сонгоно уу' : ''
    case 'accountNumber':
      return !/^\d{10,20}$/.test(value) ? 'Дансны дугаар 10–20 оронтой тоо байх ёстой' : ''
    case 'accountHolderName':
      return value.trim().length < 3 ? 'Дансны эзний нэрийг оруулна уу (дор хаяж 3 тэмдэгт)' : ''
    case 'iban':
      return !IBAN_RE.test(value)
        ? 'IBAN буруу формат байна. Жишээ: MN86XXXXXXXXXXXXXXXXXX'
        : ''
    default:
      return ''
  }
}

export function WorkerRegisterScreen({ onBack, onComplete }: WorkerRegisterScreenProps) {
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1–3
  const [danConnected, setDanConnected] = useState(false)
  const [policeFile, setPoliceFile] = useState<string | null>(null)
  const [imei, setImei] = useState('')

  // Step 4 — bank info
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [iban, setIban] = useState('')
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [danLoading,  setDanLoading]  = useState(false)
  const [danError,    setDanError]    = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }))

  const bankValid =
    !!bankName &&
    /^\d{10,20}$/.test(accountNumber) &&
    accountHolderName.trim().length >= 3 &&
    IBAN_RE.test(iban)

  const canProceed = () => {
    if (currentStep === 1) return danConnected
    if (currentStep === 2) return policeFile !== null
    if (currentStep === 3) return imei.length >= 15
    if (currentStep === 4) return bankValid
    return false
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/workers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imei,
          policeFile: policeFile ?? 'police_clearance.pdf',
          bankName,
          accountNumber,
          accountHolderName,
          iban,
          accountType,
        }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (data.success) {
        setIsSubmitted(true)
      } else {
        setSubmitError(data.error ?? 'Алдаа гарлаа. Дахин оролдоно уу.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      void handleSubmit()
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
          Таны бүртгэл шалгагдаж байна. 24–48 цагийн дотор хариу өгөх болно.
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
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Ажилтнаар бүртгүүлэх</h1>
      </div>

      {/* Step Indicator */}
      <div className="mt-6 px-6">
        <div className="flex items-center">
          {[1, 2, 3, 4].map((step, idx) => (
            <div key={step} className="flex flex-1 items-center">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  step < currentStep
                    ? 'bg-success text-white'
                    : step === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-card text-muted-foreground shadow-sm'
                }`}
              >
                {step < currentStep ? <Check className="h-4 w-4" /> : step}
              </div>
              {idx < 3 && (
                <div
                  className={`mx-1 h-1 flex-1 rounded-full ${
                    step < currentStep ? 'bg-success' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Алхам {currentStep}/4
        </p>
      </div>

      {/* Step Content */}
      <div className="mt-8 px-6">

        {/* Step 1 — DAN */}
        {currentStep === 1 && (
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
              <>
                {danError && (
                  <p className="mt-3 text-center text-sm text-destructive">{danError}</p>
                )}
                <Button
                  onClick={async () => {
                    setDanLoading(true)
                    setDanError(null)
                    try {
                      const res = await fetch('/api/auth/dan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                      })
                      const data = (await res.json()) as { success: boolean; error?: string }
                      if (data.success) {
                        setDanConnected(true)
                      } else {
                        setDanError(data.error ?? 'ДАН системтэй холбогдоход алдаа гарлаа.')
                      }
                    } catch {
                      setDanError('Сүлжээний алдаа. Дахин оролдоно уу.')
                    } finally {
                      setDanLoading(false)
                    }
                  }}
                  disabled={danLoading}
                  className="mt-4 h-14 w-full rounded-2xl bg-primary font-semibold shadow-md disabled:opacity-50"
                >
                  {danLoading ? 'Холбогдож байна...' : 'ДАН системээр нэвтрэх'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step 2 — Police clearance */}
        {currentStep === 2 && (
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
                onClick={() => setPoliceFile('police_clearance.pdf')}
                className="mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-8 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="mt-2 font-medium text-muted-foreground">Файл оруулах</span>
                <span className="text-xs text-muted-foreground">PDF, JPG, PNG</span>
              </button>
            )}
          </div>
        )}

        {/* Step 3 — IMEI */}
        {currentStep === 3 && (
          <div className="rounded-2xl bg-card p-6 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-4 text-center text-lg font-bold text-foreground">IMEI дугаар</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Утасныхаа IMEI дугаарыг оруулна уу (*#06# гэж залгаж харна уу)
            </p>
            <Input
              placeholder="IMEI дугаар"
              value={imei}
              onChange={(e) => setImei(e.target.value.replace(/\D/g, '').slice(0, 15))}
              className="mt-4 h-12 rounded-2xl border-border bg-background text-center text-lg font-mono shadow-sm"
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">{imei.length}/15 тэмдэгт</p>
          </div>
        )}

        {/* Step 4 — Banking info */}
        {currentStep === 4 && (
          <div className="space-y-4">
            {/* Icon + title */}
            <div className="rounded-2xl bg-card p-6 shadow-sm text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-foreground">Банкны мэдээлэл</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Цалин шилжүүлэх дансны мэдээллээ оруулна уу
              </p>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">
                Буруу мэдээлэл оруулвал төлбөр хүргүүлэхэд саатахыг анхааруулна
              </p>
            </div>

            <div className="space-y-4 rounded-2xl bg-card p-4 shadow-sm">
              {/* Bank name */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Банкны нэр</p>
                <div className="relative">
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    onBlur={() => touch('bankName')}
                    className="h-12 w-full appearance-none rounded-2xl border border-border bg-background px-4 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Банк сонгох...</option>
                    {BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                {touched.bankName && fieldError('bankName', bankName) && (
                  <p className="mt-1 text-xs text-destructive">{fieldError('bankName', bankName)}</p>
                )}
              </div>

              {/* Account number */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Дансны дугаар</p>
                <Input
                  placeholder="1234567890"
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 20))}
                  onBlur={() => touch('accountNumber')}
                  className="h-12 rounded-2xl border-border bg-background font-mono shadow-sm"
                />
                {touched.accountNumber && fieldError('accountNumber', accountNumber) && (
                  <p className="mt-1 text-xs text-destructive">{fieldError('accountNumber', accountNumber)}</p>
                )}
              </div>

              {/* Account holder name */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Дансны эзний нэр</p>
                <Input
                  placeholder="БАТБОЛД ДОРЖ"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                  onBlur={() => touch('accountHolderName')}
                  className="h-12 rounded-2xl border-border bg-background shadow-sm"
                />
                {touched.accountHolderName && fieldError('accountHolderName', accountHolderName) && (
                  <p className="mt-1 text-xs text-destructive">{fieldError('accountHolderName', accountHolderName)}</p>
                )}
              </div>

              {/* IBAN */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">IBAN</p>
                <Input
                  placeholder="MN86XXXXXXXXXXXXXXXXXX"
                  value={iban}
                  onChange={(e) => {
                    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 22)
                    setIban(raw)
                  }}
                  onBlur={() => touch('iban')}
                  className="h-12 rounded-2xl border-border bg-background font-mono tracking-wider shadow-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">{iban.length}/22 тэмдэгт</p>
                {touched.iban && fieldError('iban', iban) && (
                  <p className="mt-1 text-xs text-destructive">{fieldError('iban', iban)}</p>
                )}
              </div>

              {/* Account type */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Дансны төрөл</p>
                <div className="flex gap-3">
                  {([
                    { value: 'checking', label: 'Эргүүлэлтийн' },
                    { value: 'savings', label: 'Хадгаламж' },
                  ] as const).map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setAccountType(type.value)}
                      className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-colors active:scale-95 ${
                        accountType === type.value
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-background text-foreground shadow-sm'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Next / Submit Button */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        {submitError && (
          <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
            {submitError}
          </p>
        )}
        <Button
          onClick={nextStep}
          disabled={!canProceed() || isLoading}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold shadow-md disabled:opacity-50"
        >
          {isLoading ? 'Илгээж байна...' : currentStep === 4 ? 'Илгээх' : 'Үргэлжлүүлэх'}
        </Button>
      </div>
    </div>
  )
}
