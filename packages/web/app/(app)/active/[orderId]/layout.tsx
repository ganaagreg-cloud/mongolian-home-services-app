import { SosButton } from '@/components/sos-button'

export default async function ActiveLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<unknown>
}) {
  const { orderId } = (await params) as { orderId: string }
  return (
    <>
      {children}
      <SosButton orderId={orderId} bottomClass="bottom-24" />
    </>
  )
}
