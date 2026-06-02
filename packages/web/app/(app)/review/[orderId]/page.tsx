import { ReviewScreen } from '@/components/screens/review-screen'

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <ReviewScreen orderId={orderId} />
}
