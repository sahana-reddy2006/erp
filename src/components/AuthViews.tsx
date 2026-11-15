import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Moon, ShieldCheck, Smartphone, Sun, Users } from 'lucide-react';
import { api } from '../lib/api';
import type { AuthResponse, UserRole } from '../types/erp';
import { BrandLogo } from './BrandLogo';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthViewsProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onAuthenticated: (auth: AuthResponse) => void;
}

export function AuthViews({ theme, onToggleTheme, onAuthenticated }: AuthViewsProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('eleanor@ardenfamily.org');
  const [password, setPassword] = useState('Family2026!');
  const [showPassword, setShowPassword] = useState(false);

  // Registration state
  const [name, setName] = useState('');
  const [regMode, setRegMode] = useState<'join' | 'create'>('join');
  const [familyCode, setFamilyCode] = useState('ARDEN-2026');
  const [familyName, setFamilyName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');

  // Forgot & Reset password state
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedCodeNotice, setGeneratedCodeNotice] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [demoAccounts, setDemoAccounts] = useState<
    Array<{ name: string; email: string; role: UserRole; relationship: string }>
  >([]);

  useEffect(() => {
    api
      .demoAccounts()
      .then((res) => setDemoAccounts(res.accounts))
      .catch(() => {
        // Fallback silent
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const auth = await api.login(email, password);
      onAuthenticated(auth);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const auth = await api.register({
        name,
        email,
        password,
        familyCode: regMode === 'join' ? familyCode : undefined,
        familyName: regMode === 'create' ? familyName : undefined,
        relationship,
        phone,
      });
      onAuthenticated(auth);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword(resetEmail);
      setGeneratedCodeNotice(res.verificationCode);
      setResetCode(res.verificationCode);
      setResetStep('confirm');
      setSuccessMsg(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.resetPassword(resetEmail, resetCode, newPassword);
      setSuccessMsg(res.message);
      setEmail(resetEmail);
      setPassword(newPassword);
      setMode('login');
      setResetStep('request');
      setGeneratedCodeNotice(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Compact Header */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size={34} />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              KinLedger
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-h-[44px] min-w-[44px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Context Column (Desktop / Tablet) */}
        <section className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Cross-Platform Household Treasury
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight text-balance">
              One shared ledger across Android, iOS, and Web.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Manage household income, expenses, monthly category budgets, and long-term family savings goals with instant real-time synchronization for 20+ family members.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="pt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-sm">
                <Smartphone className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Real-Time Sync</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                WebSocket delta updates reflect immediately across all logged-in devices.
              </p>
            </div>
            <div className="pt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-sm">
                <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>20+ Member Roster</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Individual JWT login credentials and allowances for every household member.
              </p>
            </div>
            <div className="pt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Role Permissions</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Granular Admin, Parent, Member, and Viewer access enforcement.
              </p>
            </div>
          </div>
        </section>

        {/* Right Auth Panel */}
        <section className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Mode Switcher */}
            {mode !== 'forgot' ? (
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Create Account
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setResetStep('request');
                }}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6 min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            )}

            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300"
              >
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-300">
                {successMsg}
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                    Sign in to your household
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Access your shared family ledger with JWT security.
                  </p>
                </div>

                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@ardenfamily.org"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setResetEmail(email);
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full min-h-[44px] pl-3.5 pr-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {/* Quick Role Tester for the 20-member Seeded Family */}
                {demoAccounts.length > 0 && (
                  <div className="pt-5 mt-5 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
                      Quick test accounts (Arden Household · Password: <span className="font-mono">Family2026!</span>)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {demoAccounts.slice(0, 4).map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => {
                            setEmail(acc.email);
                            setPassword('Family2026!');
                          }}
                          className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                            email === acc.email
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="font-semibold truncate">{acc.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize truncate">
                            {acc.role} · {acc.relationship.split(' ')[0]}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                    Register family member
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Join an existing household or initialize a new family ERP.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegMode('join')}
                    className={`min-h-[40px] rounded-lg border text-xs font-semibold transition-colors ${
                      regMode === 'join'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Join Existing Family
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegMode('create')}
                    className={`min-h-[40px] rounded-lg border text-xs font-semibold transition-colors ${
                      regMode === 'create'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Create New Family
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jordan Arden"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      placeholder="Cousin / Parent"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jordan@ardenfamily.org"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password (min 6)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (415) 555-0192"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {regMode === 'join' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Household Invite Code
                    </label>
                    <input
                      type="text"
                      required
                      value={familyCode}
                      onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                      placeholder="ARDEN-2026"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      New Household Name
                    </label>
                    <input
                      type="text"
                      required
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      placeholder="The Sterling Household"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
                >
                  {loading ? 'Creating Account...' : 'Register & Sign In'}
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                      {resetStep === 'request' ? 'Forgot password' : 'Reset password'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {resetStep === 'request'
                        ? 'Request a 6-digit recovery code for your account.'
                        : 'Enter your verification code and choose a new password.'}
                    </p>
                  </div>
                </div>

                {resetStep === 'request' ? (
                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Registered email
                      </label>
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="member@ardenfamily.org"
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
                    >
                      {loading ? 'Generating Code...' : 'Send Reset Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    {generatedCodeNotice && (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                        Verification code: <span className="font-mono font-bold text-slate-900 dark:text-white">{generatedCodeNotice}</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        6-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        New Password (min 6 characters)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
                    >
                      {loading ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
