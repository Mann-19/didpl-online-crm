'use client';

import { useActionState, useState, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { login } from './actions';
import { User, Lock, ArrowRight, AlertCircle, X } from 'lucide-react';

const initialState = {
  error: ''
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const expired = searchParams.get('expired');
  
  const [showErrorModal, setShowErrorModal] = useState(false);
  
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const res = await login(formData)
      if (res?.error) {
        return { error: res.error }
      }
      return { error: '' }
    },
    initialState
  );

  // Show error modal if action returns an error
  useEffect(() => {
    if (state?.error) {
      setShowErrorModal(true);
    }
  }, [state?.error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white md:bg-gray-50 p-4 relative overflow-hidden">

      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center z-0 opacity-5 pointer-events-none select-none -translate-y-32">
        <Image
          src="/DIDPL-LOGO.png"
          alt="DIDPL Watermark"
          width={1000}
          height={1000}
          className="object-contain max-w-[150vw] md:max-w-[80vw]"
        />
      </div>

      <div className="max-w-sm w-full bg-white md:border md:border-gray-200 md:rounded-xl p-8 shadow-sm relative z-10">

        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16">
              <Image
                src="/DIDPL-LOGO.png"
                alt="DIDP Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Sign in</h2>
          <p className="text-sm text-gray-500 mt-2">Welcome back to DIDPL CRM</p>
        </div>

        {expired && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-md">
            <p className="text-xs text-yellow-700">
              Your session has expired due to inactivity. Please log in again.
            </p>
          </div>
        )}

        {/* Form Section */}
        <form action={formAction} className="space-y-5">

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 ml-1">Email / ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                  placeholder="Enter Email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={`w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-all text-sm ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Continue <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400 font-medium italic">Authorized Personnel Only</p>
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col items-center p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Login Failed</h3>
            <p className="text-gray-600 mb-6 text-sm">
              {state.error || 'Invalid credentials. Please try again.'}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors w-full text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
