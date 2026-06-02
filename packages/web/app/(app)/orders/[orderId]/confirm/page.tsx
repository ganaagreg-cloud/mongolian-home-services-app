import { ConfirmWorkerScreen } from '@/components/screens/confirm-worker-screen'

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <ConfirmWorkerScreen orderId={orderId} />
}
