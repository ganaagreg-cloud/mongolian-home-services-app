import { useEffect, useRef, useState } from 'react'
import { Linking, Modal, Pressable, Text, View } from 'react-native'
import * as Location from 'expo-location'

import type { ApiResponse } from '@homeservices/shared'

import { apiFetch } from '@/lib/api-fetch'

type Phase = 'idle' | 'confirming' | 'sending' | 'active' | 'failed'

export function SosButton({ orderId }: { orderId?: string }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [alertId, setAlertId] = useState<number | null>(null)
  const permissionAsked = useRef(false)

  // Pre-warm the location permission so the emergency path never blocks on a prompt
  useEffect(() => {
    if (permissionAsked.current) return
    permissionAsked.current = true
    void Location.requestForegroundPermissionsAsync().catch(() => {})
  }, [])

  // Zero awaited fan-out: dial and alert POST fire in parallel; UI surfaces state.
  const handleConfirm = () => {
    setPhase('sending')

    void Linking.openURL('tel:102').catch(() => {})

    void (async () => {
      let lat: number | undefined
      let lng: number | undefined
      try {
        // Cached fix only — returns instantly, never blocks the alert
        const pos = await Location.getLastKnownPositionAsync()
        if (pos) {
          lat = pos.coords.latitude
          lng = pos.coords.longitude
          setCoords({ lat, lng })
        }
      } catch { /* proceed without location */ }

      try {
        const res = await apiFetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, latitude: lat, longitude: lng }),
        })
        const body = (await res.json()) as ApiResponse<{ alertId: number }>
        if (body.success) {
          setAlertId(body.data.alertId)
          setPhase('active')
        } else {
          setPhase('failed')
        }
      } catch {
        setPhase('failed')
      }
    })()
  }

  const handleDismiss = () => {
    setPhase('idle')
    setCoords(null)
    setAlertId(null)
  }

  return (
    <>
      {phase === 'idle' ? (
        <Pressable
          className="absolute bottom-6 right-4 h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg active:opacity-80"
          onPress={() => setPhase('confirming')}
        >
          <Text className="text-lg">⚠️</Text>
          <Text className="text-[11px] font-bold leading-none text-white">SOS</Text>
        </Pressable>
      ) : null}

      <Modal visible={phase === 'confirming'} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="rounded-t-3xl bg-white px-6 pb-10 pt-6">
            <View className="mb-6 h-1 w-12 self-center rounded-full bg-gray-200" />
            <Text className="self-center text-4xl">⚠️</Text>
            <Text className="mt-4 text-center text-xl font-bold text-gray-900">SOS дуудлага</Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              102 руу залгаж, яаралтай тусламж дуудах гэж байна. Таны байршил мэдэгдэх болно.
            </Text>
            <Pressable
              className="mt-6 items-center rounded-2xl bg-red-600 px-4 py-4 active:opacity-80"
              onPress={handleConfirm}
            >
              <Text className="text-base font-bold text-white">Тийм, тусламж дууд</Text>
            </Pressable>
            <Pressable
              className="mt-3 items-center rounded-2xl border border-gray-300 px-4 py-4 active:bg-gray-50"
              onPress={() => setPhase('idle')}
            >
              <Text className="text-base font-semibold text-gray-900">Болих</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={phase === 'sending'} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-red-600/95">
          <Text className="text-lg font-semibold text-white">Дуудаж байна...</Text>
        </View>
      </Modal>

      <Modal visible={phase === 'active'} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-red-600 px-8">
          <Text className="text-6xl">🛡️</Text>
          <Text className="mt-6 text-3xl font-bold text-white">SOS Идэвхтэй</Text>
          <Text className="mt-3 text-lg font-semibold text-white/90">Яаралтай тусламж дуудагдлаа</Text>
          {coords ? (
            <View className="mt-4 rounded-2xl bg-white/20 px-4 py-2">
              <Text className="text-sm text-white">
                📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
            </View>
          ) : null}
          {alertId !== null ? (
            <Text className="mt-3 text-sm text-white/70">Дуудлага #{alertId}</Text>
          ) : null}
          <Text className="mt-6 text-center text-sm leading-relaxed text-white/80">
            Манай тусламжийн баг таньд удахгүй хүрэх болно.{'\n'}Аюулгүй байрлалд байна уу.
          </Text>
          <Pressable
            className="absolute right-6 top-16 h-10 w-10 items-center justify-center rounded-full bg-white/20 active:opacity-80"
            onPress={handleDismiss}
          >
            <Text className="text-base text-white">✕</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={phase === 'failed'} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-white px-6">
          <Text className="text-5xl">⚠️</Text>
          <Text className="mt-6 text-2xl font-bold text-gray-900">Холболт амжилтгүй</Text>
          <Text className="mt-3 text-center text-sm leading-relaxed text-gray-500">
            SOS дуудлага илгээхэд алдаа гарлаа.{'\n'}Доорх товчоор шууд залгана уу.
          </Text>
          <Pressable
            className="mt-6 w-full items-center rounded-2xl bg-red-600 px-4 py-4 active:opacity-80"
            onPress={() => void Linking.openURL('tel:102').catch(() => {})}
          >
            <Text className="text-base font-bold text-white">102 руу шууд залгах</Text>
          </Pressable>
          <Pressable
            className="mt-3 w-full items-center rounded-2xl border border-gray-300 px-4 py-4 active:bg-gray-50"
            onPress={handleDismiss}
          >
            <Text className="text-base font-semibold text-gray-900">Хаах</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  )
}
