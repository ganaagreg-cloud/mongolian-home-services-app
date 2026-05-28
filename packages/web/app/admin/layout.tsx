import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin/sidebar'

export const metadata = { title: 'Admin — HomeService' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
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
