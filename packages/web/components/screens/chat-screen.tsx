'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, Shield } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { apiFetch } from '@/lib/api-fetch'
import type { Message } from '@/lib/types'

interface ChatScreenProps {
  orderId: string
  onBack: () => void
}

export function ChatScreen({ orderId, onBack }: ChatScreenProps) {
  const [draft,    setDraft]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [myId,     setMyId]     = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages = [], mutate, error: messagesError } = useSWR<Message[]>(
    `/api/orders/${orderId}/messages`,
    fetcher,
    { refreshInterval: 3000 },
  )

  // Resolve current user id once on mount
  useEffect(() => {
    apiFetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: { success: boolean; data?: { id: number } }) => {
        if (d.success && d.data) setMyId(String(d.data.id))
      })
      .catch(() => {})
  }, [])

  // Auto-scroll to bottom when messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    setSending(true)
    try {
      await apiFetch(`/api/orders/${orderId}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      })
      await mutate()
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void send()
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border px-6 pt-12 pb-4">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
            З
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-foreground">Захиалгын чат</p>
          <p className="text-xs text-muted-foreground">Платформоор дамжуулан холбогдоно</p>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3">
        <Shield className="h-4 w-4 shrink-0 text-success" />
        <p className="text-xs text-success">
          Утасны дугаар харагдахгүй — бүх холбоо барилцаа платформоор дамжина
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 pb-28">
        {messagesError ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-sm text-destructive">Мессеж ачаалахад алдаа гарлаа</p>
            <button
              onClick={() => { void mutate() }}
              className="text-sm font-semibold text-primary active:scale-95 transition-all"
            >
              Дахин оролдох
            </button>
          </div>
        ) : messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Мессеж байхгүй байна. Эхний мессежийг илгээнэ үү.
          </p>
        )}
        {messages.map((msg) => {
          const isMe = myId != null && msg.senderId === myId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <Avatar className="mr-2 h-8 w-8 shrink-0 self-end">
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {(msg.senderName ?? '?')[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  isMe
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm bg-card text-foreground'
                }`}
              >
                <p className="text-sm leading-snug">{msg.text}</p>
                <p className={`mt-1 text-right text-[10px] ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[390px] -translate-x-1/2 border-t border-border bg-background px-6 pb-8 pt-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Мессеж бичих..."
            className="h-12 flex-1 rounded-2xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => { void send() }}
            disabled={!draft.trim() || sending}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary shadow-md transition-all active:scale-95 disabled:opacity-40"
          >
            <Send className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}
