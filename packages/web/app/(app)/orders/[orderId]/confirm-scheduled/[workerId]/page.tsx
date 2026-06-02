import { ConfirmScheduledWorkerScreen } from '@/components/screens/confirm-scheduled-worker-screen'

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string; workerId: string }>
}) {
  const { orderId, workerId } = await params
  return <ConfirmScheduledWorkerScreen orderId={orderId} workerId={workerId} />
}
