'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/authContext';
import { Lock, Mail, ArrowRight, Loader2, Sparkles, Shield, UserCheck, KeyRound } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    roleName: 'Fleet Administrator',
    badge: 'ADMIN',
    name: 'Rajesh Kumar',
    email: 'admin@cargowala.com',
    password: 'Admin@123',
    desc: 'Full access to 3D load planner, digital twin & analytics',
  },
  {
    roleName: 'Loading Station Bay 1',
    badge: 'LOADER',
    name: 'Arjun Singh',
    email: 'loader1@cargowala.com',
    password: 'Loader@123',
    desc: 'Barcode/QR verification scanner & dock checklist',
  },
  {
    roleName: 'Loading Station Bay 2',
    badge: 'LOADER',
    name: 'Priya Sharma',
    email: 'loader2@cargowala.com',
    password: 'Loader@123',
    desc: 'Cargo loading compliance & damage inspection',
  },
];

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

  const performLogin = async (loginEmail: string, loginPass: string) => {
    if (!loginEmail || !loginPass) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(loginEmail, loginPass);
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleQuickFill = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B132B] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-300 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B132B] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Blue-White Gradient Glow Blobs */}
      <div className="absolute top-1/6 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/6 right-1/4 w-[400px] h-[400px] bg-sky-400/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg z-10 flex flex-col gap-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl gradient-primary shadow-2xl shadow-blue-500/30 mb-2 border border-blue-200/30">
            <span className="text-white text-2xl font-black tracking-wider">CW</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            <span className="gradient-text-blue-white">CargoWala</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-[10px] text-blue-300 border border-blue-400/30 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} className="text-blue-300" /> AI Suite
            </span>
          </h1>
          <p className="text-sm text-slate-300 font-medium">
            3D Smart Cargo Loading & Autonomous Fleet Optimization
          </p>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel-blue rounded-3xl p-7 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h2 className="text-base font-bold text-white">Sign In to Workspace</h2>
            <span className="text-xs text-blue-300 font-semibold bg-blue-500/15 border border-blue-400/30 px-2 py-0.5 rounded-full">v2026.1</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300" htmlFor="email">
                Corporate Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-blue-300/60">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cargowala.com or loader1@cargowala.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-blue-300/60">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl gradient-primary text-white text-sm font-bold hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Enter Logistics Hub
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Accounts & Quick Fill Cards */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Existing Accounts (Click to Quick-Fill & Login)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <div
                key={acc.email}
                onClick={() => handleQuickFill(acc.email, acc.password)}
                className="p-3 rounded-2xl border border-blue-500/20 bg-slate-900/70 hover:border-blue-400/50 hover:bg-slate-900 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-lg shadow-black/20"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                      {acc.name}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        acc.badge === 'ADMIN'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {acc.roleName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                    <span>{acc.email}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-300 font-sans">Pass: <strong className="font-mono text-blue-300">{acc.password}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    performLogin(acc.email, acc.password);
                  }}
                  className="px-3 py-1.5 rounded-xl gradient-primary text-[10px] font-bold text-white opacity-80 group-hover:opacity-100 transition-opacity shadow-sm flex items-center gap-1 flex-shrink-0"
                >
                  <KeyRound size={11} />
                  Auto Login
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-500 text-center font-medium">
          CargoWala Next-Gen Fleet Intelligence · Powered by Spatial Packing
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
