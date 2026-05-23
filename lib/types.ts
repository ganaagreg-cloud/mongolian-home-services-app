// ---------------------------------------------------------------------------
// Shared types — used by both API routes and client-side code.
// No runtime imports allowed here (this file must be importable anywhere).
// ---------------------------------------------------------------------------

export type ApiResponse<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// ── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'worker' | 'admin'

export interface SessionPayload {
  sub: string   // userId
  role: UserRole
  phone: string
}

// ── Entities ────────────────────────────────────────────────────────────────

export interface User {
  id: string
  phone: string
  name: string
  role: UserRole
  danVerified: boolean
  createdAt: string
}

export interface Worker {
  id: string
  userId: string
  name: string        // joined from users
  specialty: string
  pricePerHour: number  // MNT integer
  rating: number        // 0.0 – 5.0
  reviewCount: number
  imei?: string
  policeFile?: string
  isAvailable: boolean
  isActive: boolean     // admin-approved
  danVerified: boolean  // joined from users
  createdAt: string
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'arriving'
  | 'working'
  | 'completed'
  | 'cancelled'

export type PropertyType = 'house' | 'apartment' | 'office'

export interface Order {
  id: string
  userId: string
  workerId: string
  workerName?: string  // joined
  service: string
  status: OrderStatus
  address: string
  scheduledDate: string
  hours: number
  totalAmount: number  // MNT integer
  propertyType?: PropertyType
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  orderId: string
  senderId: string
  senderName?: string  // joined
  text: string
  createdAt: string
}

export interface Review {
  id: string
  orderId: string
  workerId: string
  rating: number   // 1-5
  comment?: string
  createdAt: string
}

export type TransactionType = 'earning' | 'withdrawal'

export interface Transaction {
  id: string
  workerId: string
  amount: number   // MNT, negative for withdrawals
  type: TransactionType
  service: string
  createdAt: string
}

export type AccountType = 'checking' | 'savings'

export interface BankingInfo {
  id: string
  workerId: string
  bankName: string
  accountNumber: string
  accountHolderName: string
  iban: string
  accountType: AccountType
  verified: boolean
  updatedAt: string
}

export type DisputeStatus = 'open' | 'resolved'

export interface Dispute {
  id: string
  orderId: string
  issue: string
  status: DisputeStatus
  compensationAmount?: number  // MNT
  createdAt: string
  updatedAt: string
}

export interface SavedWorker {
  userId: string
  workerId: string
  createdAt: string
}

// ── Request bodies ───────────────────────────────────────────────────────────

export interface SendOtpBody {
  phone: string
}

export interface VerifyOtpBody {
  phone: string
  otp: string
}

export interface CreateOrderBody {
  workerId: string
  service: string
  address: string
  scheduledDate: string
  hours: number
  totalAmount: number
  propertyType?: PropertyType
  notes?: string
}

export interface SubmitReviewBody {
  rating: number
  comment?: string
}

export interface UpsertBankingBody {
  bankName: string
  accountNumber: string
  accountHolderName: string
  iban: string
  accountType: AccountType
}

export interface ResolveDisputeBody {
  compensationAmount?: number
}

export interface UpdateAvailabilityBody {
  isAvailable: boolean
}

export interface UpdateWorkerProfileBody {
  name?: string
}
