import type { Metadata } from 'next'
import AdminLoginForm from './AdminLoginForm'

export const metadata: Metadata = { title: 'Admin Login' }

export default function AdminLoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #7A0050 0%, #2A0020 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: 'var(--font-primary)' }}
          >
            BraidedbyAGB
          </h1>
          <p className="text-white/60 text-sm mt-1">Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--color-deep-purple)' }}>
            Sign in
          </h2>
          <AdminLoginForm />
        </div>
      </div>
    </div>
  )
}
