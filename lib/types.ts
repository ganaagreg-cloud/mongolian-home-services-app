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
  sub: string   // userId (integer as string)
  role: UserRole
  phone: string
  is_worker?: boolean
  active_mode?: 'user' | 'worker'
}

// ── Entities ────────────────────────────────────────────────────────────────

export interface User {
  id: string
  phone: string
  name: string
  username: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  danVerified: boolean
  isVerified: boolean
  isWorker: boolean
  activeMode: 'user' | 'worker'
  googleId?: string
  facebookId?: string
  avatarUrl?: string
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

export type MatchingStrategy = 'instant' | 'scheduled'

export type OrderStatus =
  | 'pending_acceptances'       // scheduled post — waiting for workers to accept
  | 'searching_worker'          // instant — system looking for a match
  | 'pending_worker_acceptance' // instant — offer sent to a worker, awaiting their response
  | 'pending_payment'           // worker confirmed, awaiting user payment
  | 'worker_assigned'           // worker matched + paid, job locked
  | 'worker_on_the_way'   // worker en route
  | 'in_progress'         // job is happening
  | 'completed'           // done, awaiting rating
  | 'rated'               // review submitted
  | 'cancelled_by_user'
  | 'cancelled_by_worker'
  | 'no_workers_found'    // all match attempts exhausted

export type PropertyType = 'house' | 'apartment' | 'office'

export type MatchAttemptStatus = 'offered' | 'accepted' | 'declined' | 'timeout'

export interface MatchAttempt {
  id: string
  orderId: string
  workerId: string
  status: MatchAttemptStatus
  offeredAt: string
  respondedAt?: string
}

// What a worker sees in their incoming-orders queue.
// Address is masked to neighbourhood only until they accept.
export interface WorkerIncomingOrder {
  orderId: string
  service: string
  scheduledDate: string
  hours: number
  totalAmount: number
  generalArea: string   // neighbourhood only — exact address hidden until accept
  distanceKm: number    // mocked for now
  urgent: boolean
  expiresAt: string     // offered_at + 60 s; worker must accept before this
}

export interface Order {
  id: string
  userId: string
  workerId: string | null   // null until a worker accepts
  workerName?: string       // joined from users
  service: string
  status: OrderStatus
  address: string
  scheduledDate: string
  hours: number
  totalAmount: number       // MNT integer
  urgent: boolean
  rooms?: number
  areaSqm?: number
  propertyType?: PropertyType
  notes?: string
  matchingStrategy?: MatchingStrategy
  paymentStatus?: PaymentStatus
  beforePhotoUrl?: string
  afterPhotoUrl?: string
  createdAt: string
  updatedAt: string
}

export interface MatchedWorker {
  workerId: string
  name: string
  rating: number
  specialty: string
  pricePerHour: number
}

export interface OrderAcceptance {
  id: string
  orderId: string
  workerId: string
  workerName: string
  workerRating: number
  workerReviewCount: number
  workerSpecialty: string
  workerPricePerHour: number
  acceptedAt: string
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

export type PaymentStatus = 'unpaid' | 'paid'

// QPay V2 invoice shape
export interface InvoiceUrl {
  name:        string  // bank name, e.g. "Хаан банк"
  description: string  // human-readable action label
  link:        string  // bank deeplink, e.g. "khanbank://qpay?id=..."
}

export interface PaymentInvoice {
  invoice_id: string
  qr_text:    string
  qr_image:   string  // data URI
  urls:        InvoiceUrl[]
}

// DAN OAuth2 identity payload
export interface DANIdentity {
  firstname:      string
  lastname:       string
  registernumber: string
}

export type TransactionType = 'earning' | 'withdrawal' | 'refund'

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

export interface RegisterBody {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

export interface LoginBody {
  email: string
  password: string
}

export interface SendOtpBody {
  phone: string
}

export interface VerifyOtpBody {
  phone: string
  otp: string
}

export interface CreateOrderBody {
  service: string
  address: string
  scheduledDate: string
  hours: number
  totalAmount: number
  urgent?: boolean
  rooms?: number
  areaSqm?: number
  propertyType?: PropertyType
  notes?: string
  matchingStrategy?: MatchingStrategy
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

// ── Admin ────────────────────────────────────────────────────────────────────

export interface AdminRecentOrder {
  id: string
  customerName: string
  workerName: string
  service: string
  status: string
  totalAmount: number
}

export interface AdminStats {
  todayOrders: number
  totalRevenue: number
  activeWorkers: number
  openDisputes: number
  recentOrders: AdminRecentOrder[]
}

export interface AdminPendingWorker {
  id: string
  name: string
  phone: string
  imei: string | null
  policeFile: string | null
  createdAt: string
}

export interface AdminDispute {
  id: string
  orderId: string
  customerName: string
  workerName: string
  service: string
  issue: string
  status: string
  totalAmount: number
  compensationAmount: number | null
  createdAt: string
}

export interface UpdateAvailabilityBody {
  isAvailable: boolean
}

export interface UpdateWorkerProfileBody {
  name?: string
}
