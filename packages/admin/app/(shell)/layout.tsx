import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin-sidebar'

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies()
  if (!store.get('hs-admin-session')) redirect('/login')

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto pb-8">{children}</main>
    </div>
  )
}
