import { SearchingWorkerScreen } from '@/components/screens/searching-worker-screen'

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <SearchingWorkerScreen orderId={orderId} />
}
