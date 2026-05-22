'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Loader2, Package2, Chrome } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleGoogle = () => {
    setLoading(true)
    signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/40 mb-4">
            <Package2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">MateriX</h1>
          <p className="text-slate-400 text-sm mt-1">Material Management System</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-2 text-center">
            Welcome Back
          </h2>
          <p className="text-slate-400 text-sm mb-8 text-center">
            Sign in with your Google account to continue
          </p>

          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl bg-white text-slate-800 font-semibold text-sm hover:bg-slate-100 transition-all disabled:opacity-50 shadow-lg">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Chrome className="w-5 h-5" />}
            Continue with Google
          </button>

          <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-blue-300 text-xs text-center">
              First time? Your account will be created automatically.
              <br />Ask your admin to change your role if needed.
            </p>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-4">
          Powered by Google Sheets Database
        </p>
      </div>
    </div>
  )
}
