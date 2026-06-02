import { WorkerActiveScreen } from '@/components/screens/worker-active-screen'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <WorkerActiveScreen orderId={id} />
}
