import { BidConfirmScreen } from '@/components/screens/bid-confirm-screen'

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string; workerId: string }>
}) {
  const { orderId, workerId } = await params
  return <BidConfirmScreen orderId={orderId} workerId={workerId} />
}
