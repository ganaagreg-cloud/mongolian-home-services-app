import { OrderApplicantsScreen } from '@/components/screens/order-applicants-screen'

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <OrderApplicantsScreen orderId={orderId} />
}
