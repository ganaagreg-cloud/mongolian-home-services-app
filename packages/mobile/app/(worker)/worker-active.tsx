import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

import type { ApiResponse, Order } from '@homeservices/shared'

import { SosButton } from '@/components/sos-button'
import { apiFetch } from '@/lib/api-fetch'
import { formatMnt, formatSchedule, LIVE_STATUSES, ORDER_STATUS_LABELS } from '@/lib/format'
import { useApi } from '@/lib/use-api'

const POLL_MS = 10000
const PHOTOS_REQUIRED = 3

type PhotoType = 'before' | 'after'
type WorkerStatus = 'worker_on_the_way' | 'in_progress' | 'completed'

async function captureAndCompress(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) {
    Alert.alert('Зөвшөөрөл хэрэгтэй', 'Камер ашиглахын тулд зөвшөөрөл өгнө үү')
    return null
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
  if (result.canceled || !result.assets?.[0]) return null

  const context = ImageManipulator.manipulate(result.assets[0].uri).resize({ width: 1280 })
  const image = await context.renderAsync()
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6 })
  return saved.uri
}

async function uploadPhoto(orderId: string, type: PhotoType, uri: string): Promise<boolean> {
  const formData = new FormData()
  formData.append('type', type)
  formData.append('photo', { uri, name: `${type}-${Date.now()}.jpg`, type: 'image/jpeg' } as unknown as Blob)
  const res = await apiFetch(`/api/orders/${orderId}/upload`, { method: 'POST', body: formData })
  return res.ok
}

export default function WorkerActive() {
  const router = useRouter()
  const { data: order, loading, refetch } = useApi<Order | null>('/api/orders?worker_active=1', POLL_MS)

  const [beforeUris, setBeforeUris] = useState<string[]>([])
  const [afterUris, setAfterUris] = useState<string[]>([])
  const [uploading, setUploading] = useState<PhotoType | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    setBeforeUris([])
    setAfterUris([])
  }, [order?.id])

  if (loading && !order) return <ActivityIndicator className="mt-12" />

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-white px-6">
        <Text className="text-4xl">📭</Text>
        <Text className="text-sm font-medium text-gray-900">Идэвхтэй ажил байхгүй</Text>
        <Text className="text-center text-xs text-gray-500">Захиалга хүлээн авахад энд харагдана</Text>
      </View>
    )
  }

  const isAssigned = order.status === 'worker_assigned'
  const isOnTheWay = order.status === 'worker_on_the_way'
  const isInProgress = order.status === 'in_progress'
  const live = LIVE_STATUSES.includes(order.status)

  const beforeReady = beforeUris.length >= PHOTOS_REQUIRED
  const afterReady = afterUris.length >= PHOTOS_REQUIRED

  const handleCapture = async (type: PhotoType) => {
    setUploading(type)
    try {
      const uri = await captureAndCompress()
      if (!uri) return
      const ok = await uploadPhoto(order.id, type, uri)
      if (ok) {
        if (type === 'before') setBeforeUris((prev) => [...prev, uri].slice(0, PHOTOS_REQUIRED))
        else setAfterUris((prev) => [...prev, uri].slice(0, PHOTOS_REQUIRED))
        void refetch()
      } else {
        Alert.alert('Алдаа', 'Зураг илгээхэд алдаа гарлаа')
      }
    } catch {
      Alert.alert('Алдаа', 'Зураг авахад алдаа гарлаа')
    } finally {
      setUploading(null)
    }
  }

  const updateStatus = async (status: WorkerStatus) => {
    setUpdating(true)
    try {
      const res = await apiFetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const body = (await res.json()) as ApiResponse
      if (body.success) {
        if (status === 'completed') router.push('/worker-jobs')
        else void refetch()
      } else {
        Alert.alert('Алдаа', body.error)
      }
    } catch {
      Alert.alert('Алдаа', 'Сүлжээний алдаа гарлаа')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerClassName="gap-4 px-4 py-6 pb-28">
        <View className="items-center gap-1">
          <Text className="text-xl font-bold text-gray-900">{order.service}</Text>
          <View className="rounded-full bg-gray-100 px-3 py-1">
            <Text className="text-sm font-medium text-gray-700">{ORDER_STATUS_LABELS[order.status]}</Text>
          </View>
        </View>

        <View className="gap-2 rounded-xl border border-gray-200 p-4">
          <Row label="Огноо" value={formatSchedule(order.scheduledDate)} />
          <Row label="Хаяг" value={order.address} />
          <Row label="Хугацаа" value={`${order.hours} цаг`} />
          <Row label="Нийт дүн" value={formatMnt(order.totalAmount)} />
        </View>

        {isAssigned ? (
          <View className="gap-3 rounded-xl border border-gray-200 p-4">
            <Text className="text-sm text-gray-700">Захиалга батлагдлаа. Хэрэглэгч таныг хүлээж байна.</Text>
            <PrimaryButton
              label="Замдаа явж байна"
              loading={updating}
              onPress={() => void updateStatus('worker_on_the_way')}
            />
          </View>
        ) : null}

        {isOnTheWay ? (
          <View className="gap-3 rounded-xl border border-gray-200 p-4">
            <Text className="text-sm text-gray-700">Та замдаа явж байна.</Text>
            <PhotoSection
              title="Өмнөх зураг"
              uris={beforeUris}
              uploading={uploading === 'before'}
              onCapture={() => void handleCapture('before')}
            />
            {!beforeReady ? (
              <Text className="text-xs text-gray-500">Ажил эхлэхийн өмнө өмнөх зургаа оруулна уу</Text>
            ) : null}
            <PrimaryButton
              label="Ажил эхлэх"
              disabled={!beforeReady}
              loading={updating}
              onPress={() => void updateStatus('in_progress')}
            />
          </View>
        ) : null}

        {isInProgress ? (
          <View className="gap-3 rounded-xl border border-gray-200 p-4">
            <PhotoSection
              title="Дараах зураг"
              uris={afterUris}
              uploading={uploading === 'after'}
              onCapture={() => void handleCapture('after')}
            />
            {!afterReady ? (
              <Text className="text-xs text-gray-500">Дараах зургаа оруулсны дараа дуусгах боломжтой</Text>
            ) : null}
            <PrimaryButton
              label="Ажил дуусгах"
              disabled={!afterReady}
              loading={updating}
              onPress={() => void updateStatus('completed')}
            />
          </View>
        ) : null}

        {live ? (
          <PrimaryButton
            label="Захиалагчтай чатлах"
            onPress={() => router.push({ pathname: '/orders/[id]/chat', params: { id: order.id } })}
          />
        ) : null}
      </ScrollView>

      {live ? <SosButton orderId={order.id} /> : null}
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="shrink text-right text-sm font-medium text-gray-900">{value}</Text>
    </View>
  )
}

function PrimaryButton({
  label, onPress, disabled, loading,
}: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <Pressable
      className={`items-center rounded-xl px-4 py-3 active:opacity-80 ${disabled ? 'bg-gray-100' : 'bg-gray-900'}`}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={disabled ? '#000' : '#fff'} />
      ) : (
        <Text className={`text-base font-semibold ${disabled ? 'text-gray-400' : 'text-white'}`}>{label}</Text>
      )}
    </Pressable>
  )
}

function PhotoSection({
  title, uris, uploading, onCapture,
}: { title: string; uris: string[]; uploading: boolean; onCapture: () => void }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-900">
        {title} ({uris.length}/{PHOTOS_REQUIRED})
      </Text>
      <View className="flex-row gap-2">
        {Array.from({ length: PHOTOS_REQUIRED }).map((_, i) => {
          const uri = uris[i]
          const isNext = i === uris.length
          return (
            <Pressable
              key={i}
              className="h-20 flex-1 items-center justify-center overflow-hidden rounded-xl border border-gray-200 active:opacity-80"
              disabled={!!uri || !isNext || uploading}
              onPress={onCapture}
            >
              {uri ? (
                <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
              ) : uploading && isNext ? (
                <ActivityIndicator />
              ) : isNext ? (
                <Text className="text-2xl text-gray-400">+</Text>
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
