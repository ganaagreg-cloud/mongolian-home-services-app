'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import 'leaflet/dist/leaflet.css'

const DEFAULT_LAT = 47.9184
const DEFAULT_LNG = 106.9177

interface LocationPickerProps {
  onSelect: (address: string) => void
  onClose: () => void
}

export function LocationPicker({ onSelect, onClose }: LocationPickerProps) {
  const mapRef    = useRef<HTMLDivElement>(null)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const latRef = useRef(DEFAULT_LAT)
  const lngRef = useRef(DEFAULT_LNG)

  useEffect(() => {
    if (!mapRef.current) return

    let map: import('leaflet').Map
    let marker: import('leaflet').Marker

    const reverseGeocode = async (lat: number, lng: number) => {
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'mn' } },
        )
        const data = (await res.json()) as { display_name?: string }
        setAddress(data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      } catch {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      } finally {
        setLoading(false)
      }
    }

    const initMap = async (centerLat: number, centerLng: number) => {
      const L = (await import('leaflet')).default

      // Fix webpack asset path for default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current) return

      map = L.map(mapRef.current).setView([centerLat, centerLng], 16)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      marker = L.marker([centerLat, centerLng], { draggable: true }).addTo(map)
      latRef.current = centerLat
      lngRef.current = centerLng
      void reverseGeocode(centerLat, centerLng)

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng()
        latRef.current = lat
        lngRef.current = lng
        void reverseGeocode(lat, lng)
      })

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        marker.setLatLng(e.latlng)
        latRef.current = e.latlng.lat
        lngRef.current = e.latlng.lng
        void reverseGeocode(e.latlng.lat, e.latlng.lng)
      })
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { void initMap(pos.coords.latitude, pos.coords.longitude) },
        ()    => { void initMap(DEFAULT_LAT, DEFAULT_LNG) },
        { timeout: 5000 },
      )
    } else {
      void initMap(DEFAULT_LAT, DEFAULT_LNG)
    }

    return () => { map?.remove() }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 bg-background px-6 pb-4 pt-12 shadow-sm">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Байршил сонгох</h1>
          <p className="text-xs text-muted-foreground">Газрын зурган дээр дарж тэмдэглэнэ үү</p>
        </div>
      </div>

      {/* Map fills remaining space */}
      <div ref={mapRef} className="flex-1" />

      {/* Bottom sheet */}
      <div className="bg-background px-6 pb-8 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex min-h-[56px] items-start gap-3 rounded-2xl bg-card p-4 shadow-sm">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="flex-1 text-sm leading-relaxed text-foreground">
            {loading
              ? 'Хаяг тодорхойлж байна...'
              : address || 'Газрын зурган дээр дарна уу'}
          </p>
        </div>
        <Button
          onClick={() => { if (address && !loading) onSelect(address) }}
          disabled={!address || loading}
          className="mt-4 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
        >
          <Check className="mr-2 h-5 w-5" />
          Байршил баталгаажуулах
        </Button>
      </div>
    </div>
  )
}
