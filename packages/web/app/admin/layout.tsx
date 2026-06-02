import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/sidebar'

export const metadata = { title: 'Admin — HomeService' }

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function getAdminSession(): Promise<{ name: string; role: string } | null> {
  const h = await headers()
  const cookie = h.get('cookie') ?? ''
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { cookie },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json() as { success: boolean; data?: { name: string; role: string } }
    if (!json.success || !json.data) return null
    return json.data
  } catch {
    return null
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session || session.role !== 'admin') redirect('/')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar adminName={session.name} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
