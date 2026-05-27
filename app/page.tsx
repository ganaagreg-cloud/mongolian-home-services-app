'use client'

import { useState, useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { LoginScreen } from '@/components/login-screen'
import { RegisterScreen } from '@/components/register-screen'
import { OAuthOnboardingScreen } from '@/components/oauth-onboarding-screen'
import { HomeScreen } from '@/components/screens/home-screen'
import { CreateOrderScreen } from '@/components/screens/create-order-screen'
import { SearchingWorkerScreen } from '@/components/screens/searching-worker-screen'
import { ConfirmWorkerScreen } from '@/components/screens/confirm-worker-screen'
import { ScheduledJobsBoardScreen } from '@/components/screens/scheduled-jobs-board-screen'
import { ConfirmScheduledWorkerScreen } from '@/components/screens/confirm-scheduled-worker-screen'
import { ActiveBookingScreen } from '@/components/screens/active-booking-screen'
import { ReviewScreen } from '@/components/screens/review-screen'
import { OrdersScreen } from '@/components/screens/orders-screen'
import { ChatScreen } from '@/components/screens/chat-screen'
import { ProfileScreen } from '@/components/screens/profile-screen'
import { PersonalInfoScreen } from '@/components/screens/personal-info-screen'
import { SavedWorkersScreen } from '@/components/screens/saved-workers-screen'
import { HelpScreen } from '@/components/screens/help-screen'
import { PrivacyScreen } from '@/components/screens/privacy-screen'
import { WorkerRegisterScreen } from '@/components/screens/worker-register-screen'
import { WorkerProfileScreen } from '@/components/screens/worker-profile-screen'
import { WorkerJobsScreen } from '@/components/screens/worker-jobs-screen'
import { WorkerActiveScreen } from '@/components/screens/worker-active-screen'
import { WorkerEarningsScreen } from '@/components/screens/worker-earnings-screen'
import { AdminDashboardScreen } from '@/components/screens/admin-dashboard-screen'
import { AdminVerifyScreen } from '@/components/screens/admin-verify-screen'
import { AdminDisputesScreen } from '@/components/screens/admin-disputes-screen'
import { BottomNav } from '@/components/bottom-nav'
import { WorkerBottomNav } from '@/components/worker-bottom-nav'
import type { MatchedWorker, OrderAcceptance, MatchingStrategy } from '@/lib/types'

type Screen =
  | 'home' | 'create-order'
  | 'searching-worker' | 'confirm-worker'
  | 'scheduled-jobs-board' | 'confirm-scheduled-worker'
  | 'active-booking' | 'review' | 'profile' | 'chat' | 'orders'
  | 'personal-info' | 'saved-workers' | 'help' | 'privacy'
  | 'worker-register' | 'worker-jobs' | 'worker-active' | 'worker-earnings' | 'worker-profile'
  | 'admin' | 'admin-verify' | 'admin-disputes'
  | 'oauth-onboarding'

type MeResponse = {
  success: boolean
  data?: {
    name: string; username: string; phone: string; role: string
    isWorker: boolean; activeMode: string
  }
}

type PreAuthScreen = 'login' | 'register'

export default function Home() {
  const { data: sessionData, isPending } = authClient.useSession()

  const [preAuthScreen,  setPreAuthScreen]  = useState<PreAuthScreen>('login')
  const [currentScreen,  setCurrentScreen]  = useState<Screen>('home')
  const [userName,       setUserName]       = useState('...')
  const [userPhone,      setUserPhone]      = useState('')
  const [isWorker,       setIsWorker]       = useState(false)
  const [activeMode,     setActiveMode]     = useState<'user' | 'worker'>('user')
  const [hasActiveBooking, setHasActiveBooking] = useState(false)
  const [activeOrderId,  setActiveOrderId]  = useState<string | null>(null)

  // New booking-flow state
  const [matchedWorker,       setMatchedWorker]       = useState<MatchedWorker | null>(null)
  const [selectedAcceptor,    setSelectedAcceptor]    = useState<OrderAcceptance | null>(null)
  const [activeWorkerOrderId, setActiveWorkerOrderId] = useState<string | null>(null)
  const [personalInfoBack,   setPersonalInfoBack]   = useState<Screen>('profile')
  const [chatOrderId,        setChatOrderId]        = useState<string | null>(null)
  const [chatBack,           setChatBack]           = useState<Screen>('active-booking')

  useEffect(() => {
    if (!sessionData?.user) return
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: MeResponse) => {
        if (data.success && data.data) {
          setUserName(data.data.username || data.data.name || 'Хэрэглэгч')
          setUserPhone(data.data.phone ? `+976 ${data.data.phone}` : '')
          setIsWorker(data.data.isWorker)
          setActiveMode(data.data.activeMode as 'user' | 'worker')
          // needs-profile: OAuth user with no phone → collect phone before routing
          if (!data.data.phone) {
            setCurrentScreen('oauth-onboarding')
          } else if (data.data.role === 'admin') {
            setCurrentScreen('admin')
          } else if (data.data.isWorker && data.data.activeMode === 'worker') {
            setCurrentScreen('worker-jobs')
          } else {
            setCurrentScreen('home')
          }
        }
      })
      .catch(() => {})
  }, [sessionData?.user?.id])

  const handleLogout = async () => {
    await authClient.signOut()
  }

  const handleModeToggle = async (mode: 'user' | 'worker') => {
    const res = await fetch('/api/me/mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    const data = await res.json() as { success: boolean }
    if (data.success) {
      setActiveMode(mode)
      if (mode === 'worker') setCurrentScreen('worker-jobs')
      else setCurrentScreen('home')
    }
  }

  // User navigation
  const handleBottomNav = (screen: 'home' | 'orders' | 'chat' | 'profile') => {
    setCurrentScreen(screen)
  }

  // Worker navigation
  const handleWorkerBottomNav = (screen: 'jobs' | 'active' | 'chat' | 'earnings' | 'profile') => {
    if (screen === 'jobs')     { setCurrentScreen('worker-jobs') }
    else if (screen === 'active')   { setActiveWorkerOrderId(null); setCurrentScreen('worker-active') }
    else if (screen === 'chat') {
      if (activeWorkerOrderId) {
        setChatOrderId(activeWorkerOrderId)
        setChatBack('worker-active')
        setCurrentScreen('chat')
      } else {
        setCurrentScreen('worker-active')
      }
    }
    else if (screen === 'earnings') setCurrentScreen('worker-earnings')
    else if (screen === 'profile')  setCurrentScreen('worker-profile')
  }

  // Called when create-order Step 5 submits
  const handleOrderCreated = (orderId: string, strategy: MatchingStrategy) => {
    setActiveOrderId(orderId)
    setHasActiveBooking(true)
    if (strategy === 'instant') {
      setCurrentScreen('searching-worker')
    } else {
      setCurrentScreen('scheduled-jobs-board')
    }
  }

  // Instant flow: worker found → confirm
  const handleWorkerFound = (worker: MatchedWorker) => {
    setMatchedWorker(worker)
    setCurrentScreen('confirm-worker')
  }

  // Instant flow: no workers → offer scheduled fallback
  const handleNoWorkers = () => {
    // Navigate back to create-order to switch to scheduled
    setCurrentScreen('create-order')
  }

  // Instant flow: user confirmed + paid → active booking
  const handleInstantConfirmed = () => {
    setCurrentScreen('active-booking')
  }

  // Scheduled flow: user picks an acceptor → confirm
  const handleWorkerPicked = (acceptor: OrderAcceptance) => {
    setSelectedAcceptor(acceptor)
    setCurrentScreen('confirm-scheduled-worker')
  }

  // Scheduled flow: user confirmed + paid → active booking
  const handleScheduledConfirmed = () => {
    setCurrentScreen('active-booking')
  }

  const handleJobComplete = () => setCurrentScreen('worker-jobs')
  const handleBecomeWorker = () => setCurrentScreen('worker-register')

  const handleProfileMenuClick = (menu: string) => {
    if (menu === 'personal-info') setCurrentScreen('personal-info')
    else if (menu === 'history') setCurrentScreen('orders')
    else if (menu === 'saved') setCurrentScreen('saved-workers')
    else if (menu === 'help') setCurrentScreen('help')
    else if (menu === 'privacy') setCurrentScreen('privacy')
  }

  const showUserBottomNav = [
    'home', 'orders', 'chat', 'profile', 'active-booking',
  ].includes(currentScreen)

  const showWorkerBottomNav = (
    ['worker-jobs', 'worker-active', 'worker-earnings', 'worker-profile'].includes(currentScreen) ||
    (currentScreen === 'chat' && isWorker && activeMode === 'worker')
  )

  const getActiveUserTab = (): 'home' | 'orders' | 'chat' | 'profile' => {
    if (currentScreen === 'home')   return 'home'
    if (currentScreen === 'orders') return 'orders'
    if (currentScreen === 'chat')   return 'chat'
    return 'profile'
  }

  const getActiveWorkerTab = (): 'jobs' | 'active' | 'chat' | 'earnings' | 'profile' => {
    if (currentScreen === 'worker-jobs')     return 'jobs'
    if (currentScreen === 'worker-active')   return 'active'
    if (currentScreen === 'chat')            return 'chat'
    if (currentScreen === 'worker-earnings') return 'earnings'
    if (currentScreen === 'worker-profile')  return 'profile'
    return 'jobs'
  }

  if (isPending) {
    return (
      <main className="mx-auto max-w-[390px] flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Нэвтрэлт шалгаж байна...</p>
        </div>
      </main>
    )
  }

  // State 1: unauthenticated
  if (!sessionData) {
    return (
      <main className="mx-auto max-w-[390px]">
        {preAuthScreen === 'register' ? (
          <RegisterScreen onGoLogin={() => setPreAuthScreen('login')} />
        ) : (
          <LoginScreen onGoRegister={() => setPreAuthScreen('register')} />
        )}
      </main>
    )
  }

  // State 2: authenticated but phone not yet collected (OAuth onboarding)
  if (currentScreen === 'oauth-onboarding') {
    const handleOAuthComplete = () => {
      // Re-fetch user data to pick up the new phone and route normally
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((data: MeResponse) => {
          if (data.success && data.data) {
            setUserPhone(data.data.phone ? `+976 ${data.data.phone}` : '')
            if (data.data.role === 'admin') setCurrentScreen('admin')
            else if (data.data.isWorker && data.data.activeMode === 'worker') setCurrentScreen('worker-jobs')
            else setCurrentScreen('home')
          }
        })
        .catch(() => {})
    }
    return (
      <main className="mx-auto max-w-[390px]">
        <OAuthOnboardingScreen onComplete={handleOAuthComplete} />
      </main>
    )
  }

  // State 3: authenticated with phone — full app
  return (
    <main className="mx-auto max-w-[390px] min-h-screen bg-background">
      {/* ── User Screens ───────────────────────────────── */}
      {currentScreen === 'home' && (
        <HomeScreen
          userName={userName}
          onCreateOrder={() => setCurrentScreen('create-order')}
          onActiveBookingClick={() => setCurrentScreen('active-booking')}
          hasActiveBooking={hasActiveBooking}
          isWorker={isWorker}
          activeMode={activeMode}
          onModeToggle={handleModeToggle}
        />
      )}
      {currentScreen === 'create-order' && (
        <CreateOrderScreen
          onBack={() => setCurrentScreen('home')}
          onOrderCreated={handleOrderCreated}
        />
      )}

      {/* ── New: Instant match flow ─────────────────────── */}
      {currentScreen === 'searching-worker' && activeOrderId && (
        <SearchingWorkerScreen
          orderId={activeOrderId}
          onWorkerFound={handleWorkerFound}
          onNoWorkers={handleNoWorkers}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'confirm-worker' && activeOrderId && matchedWorker && (
        <ConfirmWorkerScreen
          orderId={activeOrderId}
          worker={matchedWorker}
          onConfirm={handleInstantConfirmed}
          onBack={() => setCurrentScreen('searching-worker')}
        />
      )}

      {/* ── New: Scheduled post flow ────────────────────── */}
      {currentScreen === 'scheduled-jobs-board' && activeOrderId && (
        <ScheduledJobsBoardScreen
          orderId={activeOrderId}
          onWorkerPicked={handleWorkerPicked}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'confirm-scheduled-worker' && activeOrderId && selectedAcceptor && (
        <ConfirmScheduledWorkerScreen
          orderId={activeOrderId}
          worker={selectedAcceptor}
          onConfirm={handleScheduledConfirmed}
          onBack={() => setCurrentScreen('scheduled-jobs-board')}
        />
      )}

      {/* ── Shared post-booking screens ─────────────────── */}
      {currentScreen === 'active-booking' && (
        <ActiveBookingScreen
          orderId={activeOrderId ?? undefined}
          onChat={() => { setChatOrderId(activeOrderId); setChatBack('active-booking'); setCurrentScreen('chat') }}
          onBack={() => setCurrentScreen('home')}
          onReview={() => setCurrentScreen('review')}
        />
      )}
      {currentScreen === 'review' && (
        <ReviewScreen
          orderId={activeOrderId ?? undefined}
          onSubmit={() => {}}
          onHome={() => {
            setHasActiveBooking(false)
            setActiveOrderId(null)
            setMatchedWorker(null)
            setSelectedAcceptor(null)
            setCurrentScreen('home')
          }}
          onRebook={() => setCurrentScreen('create-order')}
        />
      )}
      {currentScreen === 'profile' && (
        <ProfileScreen
          userName={userName}
          phone={userPhone}
          isWorker={isWorker}
          onMenuClick={handleProfileMenuClick}
          onBecomeWorker={handleBecomeWorker}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === 'personal-info' && (
        <PersonalInfoScreen
          userName={userName}
          phone={userPhone}
          onBack={() => setCurrentScreen(personalInfoBack)}
        />
      )}
      {currentScreen === 'saved-workers' && (
        <SavedWorkersScreen onBack={() => setCurrentScreen('profile')} />
      )}
      {currentScreen === 'help' && (
        <HelpScreen onBack={() => setCurrentScreen('profile')} />
      )}
      {currentScreen === 'privacy' && (
        <PrivacyScreen onBack={() => setCurrentScreen('profile')} />
      )}
      {currentScreen === 'orders' && (
        <OrdersScreen
          onBack={() => setCurrentScreen('profile')}
          onViewActive={(orderId) => {
            setActiveOrderId(orderId)
            setCurrentScreen('active-booking')
          }}
          onViewScheduledBoard={(orderId) => {
            setActiveOrderId(orderId)
            setCurrentScreen('scheduled-jobs-board')
          }}
        />
      )}
      {currentScreen === 'chat' && chatOrderId && (
        <ChatScreen
          orderId={chatOrderId}
          onBack={() => setCurrentScreen(chatBack)}
        />
      )}

      {/* ── Worker Screens ─────────────────────────────── */}
      {currentScreen === 'worker-register' && (
        <WorkerRegisterScreen
          onBack={() => setCurrentScreen('profile')}
          onComplete={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'worker-jobs' && (
        <WorkerJobsScreen
          onAcceptJob={(jobId) => {
            setActiveWorkerOrderId(jobId)
            setCurrentScreen('worker-active')
          }}
          onDeclineJob={() => {}}
        />
      )}
      {currentScreen === 'worker-active' && (
        <WorkerActiveScreen
          orderId={activeWorkerOrderId}
          onChat={() => { setChatOrderId(activeWorkerOrderId); setChatBack('worker-active'); setCurrentScreen('chat') }}
          onComplete={handleJobComplete}
        />
      )}
      {currentScreen === 'worker-earnings' && (
        <WorkerEarningsScreen onConnectBank={() => {}} />
      )}
      {currentScreen === 'worker-profile' && (
        <WorkerProfileScreen
          workerName={userName}
          phone={userPhone}
          onMenuClick={(menu) => {
            if (menu === 'personal-info') { setPersonalInfoBack('worker-profile'); setCurrentScreen('personal-info') }
            else if (menu === 'help') setCurrentScreen('help')
            else if (menu === 'privacy') setCurrentScreen('privacy')
          }}
          onLogout={handleLogout}
        />
      )}

      {/* ── Admin Screens ──────────────────────────────── */}
      {currentScreen === 'admin' && (
        <AdminDashboardScreen
          onViewVerifications={() => setCurrentScreen('admin-verify')}
          onViewDisputes={() => setCurrentScreen('admin-disputes')}
        />
      )}
      {currentScreen === 'admin-verify' && (
        <AdminVerifyScreen onBack={() => setCurrentScreen('admin')} />
      )}
      {currentScreen === 'admin-disputes' && (
        <AdminDisputesScreen onBack={() => setCurrentScreen('admin')} />
      )}

      {/* ── Bottom Navigation ──────────────────────────── */}
      {showUserBottomNav && (
        <BottomNav active={getActiveUserTab()} onNavigate={handleBottomNav} />
      )}
      {showWorkerBottomNav && (
        <WorkerBottomNav active={getActiveWorkerTab()} onNavigate={handleWorkerBottomNav} />
      )}
    </main>
  )
}
