import { ChatScreen } from '@/components/screens/chat-screen'

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <ChatScreen orderId={orderId} />
}
