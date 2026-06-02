'use client'

import { WorkerJobsScreen } from '@/components/screens/worker-jobs-screen'
import { useSession } from '@/context/session-context'

// Reference migration for M1.
// onAcceptJob / onDeclineJob are no-ops here; M2 will wire router.push.
export default function JobsPage() {
  const session = useSession()

  return (
    <WorkerJobsScreen
      onAcceptJob={() => {}}
      onDeclineJob={() => {}}
      isWorker={session?.isWorker ?? true}
      activeMode={session?.activeMode ?? 'worker'}
      onModeToggle={() => {}}
    />
  )
}
