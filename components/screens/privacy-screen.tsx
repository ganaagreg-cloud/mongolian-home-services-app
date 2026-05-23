'use client'

import { useState } from 'react'
import { ArrowLeft, Bell, Eye, Share2, Trash2 } from 'lucide-react'

interface PrivacyScreenProps {
  onBack: () => void
}

export function PrivacyScreen({ onBack }: PrivacyScreenProps) {
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
          onClick={onBack}
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
          {['Нууцлалын бодлого', 'Үйлчилгээний нөхцөл', 'Күүкийн бодлого'].map((label, index, arr) => (
            <button
              key={label}
              className={`flex w-full items-center justify-between px-4 py-4 transition-colors hover:bg-muted/50 active:scale-95 ${
                index !== arr.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="font-medium text-foreground">{label}</span>
              <span className="text-sm text-primary">Харах</span>
            </button>
          ))}
        </div>
      </div>

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
