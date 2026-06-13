import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'

import type { ApiResponse, Message } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'
import { useApi } from '@/lib/use-api'
import type { MeProfile } from '@/lib/types'

const CHAT_POLL_MS = 3000

// Platform chat is the only contact channel — no phone numbers, no call UI.
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: me } = useApi<MeProfile>('/api/me')
  const { data: messages, loading, error, refetch } = useApi<Message[]>(
    `/api/orders/${id}/messages`,
    CHAT_POLL_MS,
  )
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const send = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      const res = await apiFetch(`/api/orders/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const body = (await res.json()) as ApiResponse<Message>
      if (body.success) {
        setText('')
        await refetch()
        scrollRef.current?.scrollToEnd({ animated: true })
      }
    } catch {
      // transient — message stays in the input for retry
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="gap-2 px-4 py-4"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {loading && !messages ? <ActivityIndicator className="mt-8" /> : null}
        {error ? <Text className="text-center text-sm text-red-600">{error}</Text> : null}

        {(messages ?? []).length === 0 && !loading && !error ? (
          <Text className="mt-8 text-center text-sm text-gray-400">
            Мессеж байхгүй байна. Ажилтантай зөвхөн энэ чатаар холбогдоно.
          </Text>
        ) : null}

        {(messages ?? []).map((m) => {
          const mine = me != null && m.senderId === me.id
          return (
            <View
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                mine ? 'self-end rounded-br-md bg-gray-900' : 'self-start rounded-bl-md bg-gray-100'
              }`}
            >
              {!mine && m.senderName ? (
                <Text className="mb-0.5 text-xs font-semibold text-gray-500">{m.senderName}</Text>
              ) : null}
              <Text className={`text-base ${mine ? 'text-white' : 'text-gray-900'}`}>{m.text}</Text>
              <Text className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-gray-400'}`}>
                {m.createdAt.slice(11, 16)}
              </Text>
            </View>
          )
        })}
      </ScrollView>

      <View className="flex-row items-center gap-2 border-t border-gray-100 px-4 py-3">
        <TextInput
          className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-base text-gray-900"
          placeholder="Мессеж бичих…"
          placeholderTextColor="#9ca3af"
          value={text}
          onChangeText={setText}
          maxLength={1000}
          multiline
        />
        <Pressable
          className={`h-11 w-11 items-center justify-center rounded-full ${
            text.trim() && !sending ? 'bg-gray-900 active:opacity-80' : 'bg-gray-300'
          }`}
          disabled={!text.trim() || sending}
          onPress={() => void send()}
        >
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-base text-white">➤</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
