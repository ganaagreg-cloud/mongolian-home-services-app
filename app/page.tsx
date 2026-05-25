'use client'

import { useState, useEffect } from 'react'
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

type UserRole = 'user' | 'worker' | 'admin'

export default function Home() {
  const [currentScreen,  setCurrentScreen]  = useState<Screen>('home')
  const [userName,       setUserName]       = useState('...')
  const [userPhone,      setUserPhone]      = useState('')
  const [userRole,       setUserRole]       = useState<UserRole>('user')
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
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: { username: string; name: string; role: string; phone: string } }) => {
        if (data.success && data.data) {
          setUserName(data.data.username || data.data.name || 'Хэрэглэгч')
          setUserPhone(`+976 ${data.data.phone}`)
          setUserRole(data.data.role as UserRole)
          if (data.data.role === 'worker') setCurrentScreen('worker-jobs')
          else if (data.data.role === 'admin') setCurrentScreen('admin')
        }
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
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

  // Role switcher for demo — also updates the JWT session so worker/admin APIs work
  const handleRoleSwitch = async (role: UserRole) => {
    try {
      await fetch('/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
    } catch { /* dev-only endpoint; ignore on failure */ }
    setUserRole(role)
    if (role === 'user') setCurrentScreen('home')
    else if (role === 'worker') setCurrentScreen('worker-jobs')
    else if (role === 'admin') setCurrentScreen('admin')
  }

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
    (currentScreen === 'chat' && userRole === 'worker')
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

  return (
    <main className="mx-auto max-w-[390px] min-h-screen bg-background">
      {/* Role switcher — demo only */}
      <div className="fixed top-2 right-2 z-50 flex gap-1 rounded-full bg-card p-1 shadow-lg">
        {(['user', 'worker', 'admin'] as UserRole[]).map((role) => (
          <button
            key={role}
            onClick={() => { void handleRoleSwitch(role) }}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              userRole === role ? 'bg-primary text-white' : 'text-muted-foreground'
            }`}
          >
            {role === 'user' ? 'User' : role === 'worker' ? 'Worker' : 'Admin'}
          </button>
        ))}
      </div>

      {/* ── User Screens ───────────────────────────────── */}
      {currentScreen === 'home' && (
        <HomeScreen
          userName={userName}
          onCreateOrder={() => setCurrentScreen('create-order')}
          onActiveBookingClick={() => setCurrentScreen('active-booking')}
          hasActiveBooking={hasActiveBooking}
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
