import { redirect } from 'next/navigation'

// Login is now handled inline in app/page.tsx via Better Auth OAuth
export default function LoginPage() {
  redirect('/')
}
