'use client'

import { useState } from 'react'
import { OnboardingScreen } from '@/components/onboarding-screen'
import { LoginScreen } from '@/components/login-screen'
import { OTPScreen } from '@/components/otp-screen'
import { DANSuccessScreen } from '@/components/dan-success-screen'
import { HomeScreen } from '@/components/screens/home-screen'
import { SearchScreen } from '@/components/screens/search-screen'
import { BookingScreen } from '@/components/screens/booking-screen'
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

type Screen =
  | 'onboarding' | 'login' | 'otp' | 'dan-success'
  | 'home' | 'search' | 'booking' | 'active-booking' | 'review' | 'profile' | 'chat' | 'orders'
  | 'personal-info' | 'saved-workers' | 'help' | 'privacy'
  | 'worker-register' | 'worker-jobs' | 'worker-active' | 'worker-earnings' | 'worker-profile'
  | 'admin' | 'admin-verify' | 'admin-disputes'

type UserRole = 'user' | 'worker' | 'admin'

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding')
  const [phone, setPhone] = useState('')
  const [userName] = useState('Бат')
  const [userRole, setUserRole] = useState<UserRole>('user')
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [hasActiveBooking, setHasActiveBooking] = useState(false)

  // Auth handlers
  const handleOnboardingComplete = () => setCurrentScreen('login')
  const handleSendOTP = (phoneNumber: string) => {
    setPhone(phoneNumber)
    setCurrentScreen('otp')
  }
  const handleDANLogin = () => setCurrentScreen('dan-success')
  const handleOTPVerify = () => setCurrentScreen('dan-success')
  const handleBackToLogin = () => setCurrentScreen('login')
  const handleContinueToHome = () => setCurrentScreen('home')

  // User navigation
  const handleBottomNav = (screen: 'home' | 'orders' | 'chat' | 'profile') => {
    setCurrentScreen(screen)
  }

  // Worker navigation
  const handleWorkerBottomNav = (screen: 'jobs' | 'active' | 'earnings' | 'profile') => {
    if (screen === 'jobs') setCurrentScreen('worker-jobs')
    else if (screen === 'active') setCurrentScreen('worker-active')
    else if (screen === 'earnings') setCurrentScreen('worker-earnings')
    else if (screen === 'profile') setCurrentScreen('worker-profile')
  }

  // Screen-specific handlers
  const handleCategorySelect = () => setCurrentScreen('search')
  const handleBookWorker = (workerId: string) => {
    setSelectedWorkerId(workerId)
    setCurrentScreen('booking')
  }
  const handleBookingConfirm = () => {
    setHasActiveBooking(true)
    setCurrentScreen('active-booking')
  }
  const handleSOS = () => alert('SOS илгээгдлээ!')
  const handleJobComplete = () => setCurrentScreen('review')
  const handleBecomeWorker = () => setCurrentScreen('worker-register')
  const handleLogout = () => {
    setUserRole('user')
    setCurrentScreen('login')
  }

  // Role switcher for demo
  const handleRoleSwitch = (role: UserRole) => {
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

  const showUserBottomNav = ['home', 'search', 'orders', 'chat', 'profile', 'active-booking'].includes(currentScreen)
  const showWorkerBottomNav = ['worker-jobs', 'worker-active', 'worker-earnings', 'worker-profile'].includes(currentScreen)

  const getActiveUserTab = (): 'home' | 'orders' | 'chat' | 'profile' => {
    if (currentScreen === 'home' || currentScreen === 'search') return 'home'
    if (currentScreen === 'orders') return 'orders'
    if (currentScreen === 'chat') return 'chat'
    return 'profile'
  }

  const getActiveWorkerTab = (): 'jobs' | 'active' | 'earnings' | 'profile' => {
    if (currentScreen === 'worker-jobs') return 'jobs'
    if (currentScreen === 'worker-active') return 'active'
    if (currentScreen === 'worker-earnings') return 'earnings'
    if (currentScreen === 'worker-profile') return 'profile'
    return 'jobs'
  }

  return (
    <main className="mx-auto max-w-[390px] min-h-screen bg-background">
      {/* Role Switcher - Demo only */}
      {!['onboarding', 'login', 'otp', 'dan-success'].includes(currentScreen) && (
        <div className="fixed top-2 right-2 z-50 flex gap-1 rounded-full bg-card p-1 shadow-lg">
          <button
            onClick={() => handleRoleSwitch('user')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              userRole === 'user' ? 'bg-primary text-white' : 'text-muted-foreground'
            }`}
          >
            User
          </button>
          <button
            onClick={() => handleRoleSwitch('worker')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              userRole === 'worker' ? 'bg-primary text-white' : 'text-muted-foreground'
            }`}
          >
            Worker
          </button>
          <button
            onClick={() => handleRoleSwitch('admin')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              userRole === 'admin' ? 'bg-primary text-white' : 'text-muted-foreground'
            }`}
          >
            Admin
          </button>
        </div>
      )}

      {/* Auth Screens */}
      {currentScreen === 'onboarding' && <OnboardingScreen onComplete={handleOnboardingComplete} />}
      {currentScreen === 'login' && <LoginScreen onSendOTP={handleSendOTP} onDANLogin={handleDANLogin} />}
      {currentScreen === 'otp' && <OTPScreen phone={phone} onBack={handleBackToLogin} onVerify={handleOTPVerify} />}
      {currentScreen === 'dan-success' && <DANSuccessScreen onContinue={handleContinueToHome} />}

      {/* User Screens */}
      {currentScreen === 'home' && (
        <HomeScreen
          userName={userName}
          onSearch={() => setCurrentScreen('search')}
          onCategorySelect={handleCategorySelect}
          onActiveBookingClick={() => setCurrentScreen('active-booking')}
          hasActiveBooking={hasActiveBooking}
        />
      )}
      {currentScreen === 'search' && (
        <SearchScreen
          onBack={() => setCurrentScreen('home')}
          onBookWorker={handleBookWorker}
        />
      )}
      {currentScreen === 'booking' && (
        <BookingScreen
          workerId={selectedWorkerId || '1'}
          onBack={() => setCurrentScreen('search')}
          onConfirm={handleBookingConfirm}
        />
      )}
      {currentScreen === 'active-booking' && (
        <ActiveBookingScreen
          onChat={() => setCurrentScreen('chat')}
          onSOS={handleSOS}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'review' && (
        <ReviewScreen
          onSubmit={() => {}}
          onHome={() => {
            setHasActiveBooking(false)
            setCurrentScreen('home')
          }}
          onRebook={() => setCurrentScreen('search')}
        />
      )}
      {currentScreen === 'profile' && (
        <ProfileScreen
          userName={userName}
          phone="+976 9911 2233"
          onMenuClick={handleProfileMenuClick}
          onBecomeWorker={handleBecomeWorker}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === 'personal-info' && (
        <PersonalInfoScreen
          userName={userName}
          phone="+976 9911 2233"
          onBack={() => setCurrentScreen('profile')}
        />
      )}
      {currentScreen === 'saved-workers' && (
        <SavedWorkersScreen
          onBack={() => setCurrentScreen('profile')}
          onBookWorker={handleBookWorker}
        />
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
          onRebook={(workerId) => {
            setSelectedWorkerId(workerId)
            setCurrentScreen('booking')
          }}
        />
      )}
      {currentScreen === 'chat' && (
        <ChatScreen
          workerName="Батболд Д."
          onBack={() => setCurrentScreen('active-booking')}
        />
      )}

      {/* Worker Screens */}
      {currentScreen === 'worker-register' && (
        <WorkerRegisterScreen
          onBack={() => setCurrentScreen('profile')}
          onComplete={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'worker-jobs' && (
        <WorkerJobsScreen
          onAcceptJob={() => setCurrentScreen('worker-active')}
          onDeclineJob={() => {}}
        />
      )}
      {currentScreen === 'worker-active' && (
        <WorkerActiveScreen
          onChat={() => {}}
          onComplete={handleJobComplete}
        />
      )}
      {currentScreen === 'worker-earnings' && (
        <WorkerEarningsScreen onConnectBank={() => {}} />
      )}
      {currentScreen === 'worker-profile' && (
        <WorkerProfileScreen
          workerName={userName}
          phone="+976 9911 2233"
          onMenuClick={(menu) => {
            if (menu === 'personal-info') setCurrentScreen('personal-info')
            else if (menu === 'help') setCurrentScreen('help')
            else if (menu === 'privacy') setCurrentScreen('privacy')
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Admin Screens */}
      {currentScreen === 'admin' && (
        <AdminDashboardScreen
          onViewVerifications={() => setCurrentScreen('admin-verify')}
          onViewDisputes={() => setCurrentScreen('admin-disputes')}
        />
      )}
      {currentScreen === 'admin-verify' && (
        <AdminVerifyScreen
          onBack={() => setCurrentScreen('admin')}
          onApprove={() => {}}
          onReject={() => {}}
        />
      )}
      {currentScreen === 'admin-disputes' && (
        <AdminDisputesScreen
          onBack={() => setCurrentScreen('admin')}
          onResolve={() => {}}
        />
      )}

      {/* Bottom Navigation */}
      {showUserBottomNav && (
        <BottomNav active={getActiveUserTab()} onNavigate={handleBottomNav} />
      )}
      {showWorkerBottomNav && (
        <WorkerBottomNav active={getActiveWorkerTab()} onNavigate={handleWorkerBottomNav} />
      )}
    </main>
  )
}
