import type { PricingModel, Transaction, UserRole } from '@homeservices/shared'

// Wire shape of GET /api/auth/me
export interface AuthMe {
  id: string
  name: string
  avatarUrl: string
  isWorker: boolean
  activeMode: 'user' | 'worker'
  role: UserRole
  needsOnboarding: boolean
}

// Wire shape of GET /api/me
export interface MeProfile {
  id: string
  phone: string
  name: string
  email: string
  avatarUrl: string
  phoneVerified: boolean
  emailVerified: boolean
  isGoogleOAuth: boolean
  twoFactorEnabled: boolean
}

// Wire shape of GET /api/workers/me/earnings
export interface EarningsData {
  totalEarned: number
  thisMonthEarned: number
  pendingPayout: number
  transactions: Transaction[]
}

// Wire shape of GET /api/orders/:id/applications rows
export interface OrderApplication {
  id: string
  workerId: string
  status: string
  workerName: string
  workerRating: number
  workerReviewCount: number
  workerSpecialty: string
  workerPricePerHour: number
  appliedAt: string
}

// Wire shape of GET /api/service-types — the route returns raw snake_case rows
export interface ServiceTypeRow {
  id: number
  name_mn: string
  icon: string
  sort_order: number
  pricing_model: PricingModel
  base_rate: number
  min_charge: number
  unit_label: string
  requires_property_type: boolean
}
