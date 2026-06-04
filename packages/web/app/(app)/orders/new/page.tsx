import { CreateOrderScreen } from '@/components/screens/create-order-screen'

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>
}) {
  const { service } = await searchParams
  const preSelectedServiceId = service ? parseInt(service, 10) : null
  return <CreateOrderScreen preSelectedServiceId={preSelectedServiceId} />
}
