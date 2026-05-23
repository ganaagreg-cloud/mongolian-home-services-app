'use client'

import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, MessageCircle, Phone } from 'lucide-react'

interface HelpScreenProps {
  onBack: () => void
}

const faqs = [
  {
    id: '1',
    question: 'Захиалга яаж хийх вэ?',
    answer:
      'Нүүр хуудаснаас үйлчилгээний төрлөө сонгоод, тохирох ажилтнаа хайж олоод "Захиалах" товчийг дарна уу. Огноо, цаг сонгоод, эскроу дансаар төлбөрөө хийснээр захиалга баталгаажна.',
  },
  {
    id: '2',
    question: 'Төлбөрийг яаж хийх вэ?',
    answer:
      'Манай платформ зөвхөн QPay болон SocialPay-ийн дамжуулан Escrow системээр төлбөр авдаг. Бэлэн мөнгөөр төлбөр хийх боломжгүй бөгөөд таны төлбөр ажил дуусмагц ажилтанд шилжих болно.',
  },
  {
    id: '3',
    question: 'Захиалгаа цуцлах боломжтой юу?',
    answer:
      'Тийм ээ. Ажил эхлэхээс 2 цагийн өмнө цуцлах тохиолдолд бүтэн буцаалт хийгдэнэ. Ажил эхэлснээс хойш цуцлах тохиолдолд аль хэдийн гүйцэтгэсэн цагийн төлбөрийг хасаж буцаана.',
  },
  {
    id: '4',
    question: 'Ажилтнуудын итгэмжлэл хэрхэн шалгагддаг вэ?',
    answer:
      'Бүх ажилтнууд ДАН системээр иргэний баталгаажуулалт болон цагдаагийн тодорхойлолт шалгалтыг давсан байдаг. Баталгаажсан ажилтан дээр "ДАН" тэмдэг харагдана.',
  },
  {
    id: '5',
    question: 'Гэмтэл учирсан тохиолдолд яах вэ?',
    answer:
      'Манай систем нь 2% хохирлын санд хуримтлал хийдэг. Гэмтэл учирсан тохиолдолд SOS товчийг дарах эсвэл тусламжийн утасруу залгана уу. Манай баг 24 цагийн дотор холбоо барина.',
  },
  {
    id: '6',
    question: 'Ажилтан надтай шууд холбоо барьж болох уу?',
    answer:
      'Үгүй. Бүх харилцаа нь платформын дотоод чат систем дамжин явагддаг. Энэ нь таны аюулгүй байдлыг хангах зорилготой.',
  },
]

export function HelpScreen({ onBack }: HelpScreenProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => setOpenId(openId === id ? null : id)

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
        <h1 className="text-xl font-bold text-foreground">Тусламж</h1>
      </div>

      {/* FAQ */}
      <div className="mt-6 px-6">
        <h2 className="text-lg font-bold text-foreground">Түгээмэл асуултууд</h2>
        <div className="mt-3 space-y-3">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id
            return (
              <div key={faq.id} className="overflow-hidden rounded-2xl bg-card shadow-sm">
                <button
                  onClick={() => toggle(faq.id)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-95"
                >
                  <span className="flex-1 text-left font-medium text-foreground">{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Contact */}
      <div className="mt-6 px-6">
        <h2 className="text-lg font-bold text-foreground">Бидэнтэй холбогдох</h2>
        <div className="mt-3 rounded-2xl bg-card shadow-sm overflow-hidden">
          <button className="flex w-full items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 border-b border-border active:scale-95">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground">Чат дэмжлэг</p>
              <p className="text-xs text-muted-foreground">Даваа–Бямба, 09:00–18:00</p>
            </div>
          </button>
          <button className="flex w-full items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-95">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground">Утас: 1800-0000</p>
              <p className="text-xs text-muted-foreground">24/7 яаралтай дуудлага</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
