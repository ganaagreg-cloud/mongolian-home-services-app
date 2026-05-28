import { redirect } from 'next/navigation'

// OTP flow removed — auth is now OAuth-only via Better Auth
export default function OTPPage() {
  redirect('/')
}
