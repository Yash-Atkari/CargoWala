'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/authContext';
import { MOCK_USERS, MockUser } from '@/lib/mockData';
import { Lock, Mail, ArrowRight, Shield, User, Loader2, Sparkles } from 'lucide-react';

function LoginScreenInner() {
  const { login, user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        router.replace('/admin-dashboard');
      } else {
        router.replace('/loader-dashboard');
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success && res.role) {
        if (res.role === 'ADMIN') {
          router.replace('/admin-dashboard');
        } else {
          router.replace('/loader-dashboard');
        }
      } else {
        setError(res.error || 'Invalid credentials');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoUser: MockUser) => {
    setError(null);
    setIsSubmitting(true);
    setEmail(demoUser.email);
    setPassword(demoUser.password);

    try {
      const res = await login(demoUser.email, demoUser.password);
      if (res.success && res.role) {
        if (res.role === 'ADMIN') {
          router.replace('/admin-dashboard');
        } else {
          router.replace('/loader-dashboard');
        }
      } else {
        setError(res.error || 'Failed to sign in with demo account');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs for premium glassmorphism glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 flex flex-col gap-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-lg shadow-primary/20 mb-2">
            <span className="text-white text-xl font-black tracking-wider">CW</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            CargoWala
            <span className="px-1.5 py-0.5 rounded bg-primary/25 text-[10px] text-primary border border-primary/20 font-bold uppercase tracking-wider flex items-center gap-0.5">
              <Sparkles size={8} /> AI Powered
            </span>
          </h1>
          <p className="text-sm text-slate-400">Smart Cargo Loading & Fleet Optimization</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <h2 className="text-lg font-bold text-white">Sign In to Dashboard</h2>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@cargowala.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <span className="h-px bg-slate-800 flex-1" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Demo Accounts
            </span>
            <span className="h-px bg-slate-800 flex-1" />
          </div>

          {/* Quick Demo Login Cards */}
          <div className="space-y-2">
            {MOCK_USERS.map((demoUser) => (
              <button
                key={demoUser.id}
                onClick={() => handleDemoLogin(demoUser)}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      demoUser.role === 'ADMIN'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-orange-500/10 text-orange-400'
                    }`}
                  >
                    {demoUser.role === 'ADMIN' ? <Shield size={14} /> : <User size={14} />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-primary transition-colors">
                      {demoUser.name}
                    </p>
                    <p className="text-[10px] text-slate-500">{demoUser.role} Account</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-slate-600 block">
                    {demoUser.email}
                  </span>
                  <span className="text-[9px] font-mono text-slate-600 block">
                    {demoUser.password}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-600 text-center">
          CargoWala Logistics Suite v0.1.0 · Powered by Next.js & React 19
        </p>
      </div>
    </div>
  );
}

export default function LoginScreenPage() {
  return (
    <AuthProvider>
      <LoginScreenInner />
    </AuthProvider>
  );
}
