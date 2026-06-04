'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Eye, Share2, Trash2 } from 'lucide-react'
import { LEGAL_CONTENT, type PolicyKey } from '@/lib/legal-content'

const POLICY_BUTTONS: { key: PolicyKey; label: string }[] = [
  { key: 'privacy', label: 'Нууцлалын бодлого' },
  { key: 'tos',     label: 'Үйлчилгээний нөхцөл' },
  { key: 'cookies', label: 'Күүкийн бодлого' },
]

function renderPolicyBody(body: string) {
  return body.split('\n\n').map((block, i) => {
    if (block.startsWith('## ')) {
      return (
        <h2 key={i} className="mt-6 text-base font-bold text-foreground first:mt-0">
          {block.slice(3)}
        </h2>
      )
    }
    return (
      <p key={i} className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {block}
      </p>
    )
  })
}

export function PrivacyScreen() {
  const router = useRouter()
  const [activePolicy, setActivePolicy] = useState<PolicyKey | null>(null)
  const [settings, setSettings] = useState({
    locationTracking: true,
    marketingNotifications: false,
    dataSharing: false,
    activityVisible: true,
  })

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleItems = [
    {
      key: 'locationTracking' as const,
      icon: Eye,
      label: 'Байршил ашиглах',
      description: 'Ойрхон ажилтнуудыг харуулах зорилгоор ашиглагдана',
    },
    {
      key: 'activityVisible' as const,
      icon: Eye,
      label: 'Идэвхжилт харагдах',
      description: 'Бусад хэрэглэгчдэд таны идэвхжилтийг харуулах',
    },
    {
      key: 'marketingNotifications' as const,
      icon: Bell,
      label: 'Маркетингийн мэдэгдэл',
      description: 'Урамшуулал болон шинэ үйлчилгээний мэдэгдэл хүлээн авах',
    },
    {
      key: 'dataSharing' as const,
      icon: Share2,
      label: 'Өгөгдөл хуваалцах',
      description: 'Үйлчилгээний чанарыг сайжруулах зорилгоор өгөгдөл хуваалцах',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Нууцлал</h1>
      </div>

      {/* Privacy Settings */}
      <div className="mt-6 px-6">
        <h2 className="text-lg font-bold text-foreground">Нууцлалын тохиргоо</h2>
        <div className="mt-3 rounded-2xl bg-card shadow-sm overflow-hidden">
          {toggleItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className={`flex items-center gap-4 px-4 py-4 ${
                  index !== toggleItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <button
                  onClick={() => toggle(item.key)}
                  className={`relative shrink-0 h-6 w-11 rounded-full transition-colors duration-200 active:scale-95 ${
                    settings[item.key] ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Policy Links */}
      <div className="mt-6 px-6">
        <h2 className="text-lg font-bold text-foreground">Баримт бичиг</h2>
        <div className="mt-3 rounded-2xl bg-card shadow-sm overflow-hidden">
          {POLICY_BUTTONS.map(({ key, label }, index) => (
            <button
              key={key}
              onClick={() => setActivePolicy(key)}
              className={`flex w-full items-center justify-between px-4 py-4 transition-colors hover:bg-muted/50 active:scale-95 ${
                index !== POLICY_BUTTONS.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="font-medium text-foreground">{label}</span>
              <span className="text-sm text-primary">Харах</span>
            </button>
          ))}
        </div>
      </div>

      {/* Policy overlay */}
      {activePolicy !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Overlay header */}
          <div className="flex items-center gap-4 border-b border-border px-6 pb-4 pt-12 shrink-0">
            <button
              onClick={() => setActivePolicy(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-foreground">{LEGAL_CONTENT[activePolicy].title}</h1>
              <p className="text-xs text-muted-foreground">
                Шинэчлэгдсэн: {LEGAL_CONTENT[activePolicy].updatedAt}
              </p>
            </div>
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-12 pt-6">
            {renderPolicyBody(LEGAL_CONTENT[activePolicy].body)}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-6 px-6">
        <div className="rounded-2xl bg-destructive/10 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-destructive">Бүртгэл устгах</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Таны бүх өгөгдөл бүрмөсөн устгагдах бөгөөд буцаах боломжгүй
              </p>
              <button className="mt-3 text-sm font-semibold text-destructive hover:underline active:scale-95 transition-all">
                Хүсэлт гаргах
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
