'use client'

import { useState } from 'react'
import { Smartphone, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

interface LoginScreenProps {
  onSendOTP: (phone: string) => void
  onDANLogin: () => void
}

export function LoginScreen({ onSendOTP, onDANLogin }: LoginScreenProps) {
  const [phone, setPhone] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  const handleSendOTP = () => {
    if (phone.length >= 8 && termsAccepted) {
      onSendOTP(phone)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      {/* Logo section */}
      <div className="flex flex-col items-center pt-12">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Smartphone className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">HomeService</h1>
        <p className="mt-1 text-sm text-muted-foreground">Гэрийн үйлчилгээний платформ</p>
      </div>

      {/* Form section */}
      <div className="mt-12 flex flex-1 flex-col">
        <label className="mb-2 text-sm font-medium text-foreground">Утасны дугаар</label>
        <div className="flex gap-2">
          <div className="flex h-12 items-center justify-center rounded-2xl bg-card px-4 shadow-sm">
            <span className="text-sm font-medium text-foreground">+976</span>
          </div>
          <Input
            type="tel"
            placeholder="0000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
            className="h-12 flex-1 rounded-2xl border-border bg-card text-foreground shadow-sm placeholder:text-muted-foreground"
          />
        </div>

        {/* Terms checkbox */}
        <div className="mt-6 flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <label htmlFor="terms" className="text-sm leading-relaxed text-muted-foreground">
            Би{' '}
            <span className="text-primary underline">үйлчилгээний нөхцөл</span>
            {' '}болон{' '}
            <span className="text-primary underline">нууцлалын бодлого</span>
            -г зөвшөөрч байна.
          </label>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <Button
            onClick={handleSendOTP}
            disabled={phone.length < 8 || !termsAccepted}
            className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50"
          >
            OTP илгээх
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm text-muted-foreground">эсвэл</span>
            </div>
          </div>

          <Button
            onClick={onDANLogin}
            variant="outline"
            className="h-14 w-full rounded-2xl border-border bg-card text-base font-semibold text-foreground shadow-sm hover:bg-card/80"
          >
            <Building2 className="mr-2 h-5 w-5" />
            ДАН системээр нэвтрэх
          </Button>
        </div>
      </div>
    </div>
  )
}
