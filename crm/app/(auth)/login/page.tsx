'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Lock, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const expired = searchParams.get('expired');
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isPending, setIsPending] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Show error modal if there's an error message
  useEffect(() => {
    if (errorMsg) {
      setShowErrorModal(true);
    }
  }, [errorMsg]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsPending(true);
    setErrorMsg('');
    
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to send OTP');
      } else {
        setStep(2);
      }
    } catch (err) {
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsPending(true);
    setErrorMsg('');
    
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Invalid code');
        setIsPending(false);
        return;
      }

      // Verify the token with Supabase client to establish session
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: data.type || 'magiclink'
      });

      if (verifyError) {
        setErrorMsg(`Failed to establish session: ${verifyError.message}`);
        setIsPending(false);
        return;
      }

      // Force a hard navigation to apply cookies and layout re-evaluation
      window.location.href = '/dashboard';
      
    } catch (err) {
      setErrorMsg('Something went wrong. Please try again.');
      setIsPending(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setOtp('');
    setErrorMsg('');
  };

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

        {expired && step === 1 && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-md">
            <p className="text-xs text-yellow-700">
              Your session has expired due to inactivity. Please log in again.
            </p>
          </div>
        )}

        {/* Form Section */}
        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                    placeholder="Enter Authorized Email"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || !email}
              className={`w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-all text-sm ${isPending || !email ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  Send Login Code <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 ml-1">Enter Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    name="otp"
                    type="text"
                    required
                    maxLength={8}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Numeric only
                    className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-center tracking-[0.5em] text-lg font-bold text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                    placeholder="Enter Code"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  We sent a code to <span className="font-semibold text-gray-700">{email}</span>
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || otp.length < 4}
              className={`w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-all text-sm ${(isPending || otp.length < 4) ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={resetFlow}
                disabled={isPending}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Change Email
              </button>
            </div>
          </form>
        )}

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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Login Error</h3>
            <p className="text-gray-600 mb-6 text-sm">
              {errorMsg || 'An error occurred. Please try again.'}
            </p>
            <button
              onClick={() => {
                setShowErrorModal(false);
                setErrorMsg('');
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors w-full text-sm"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
