import { ActiveBookingScreen } from '@/components/screens/active-booking-screen'

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <ActiveBookingScreen orderId={orderId} />
}
