import React, { useState } from 'react';
import { BellRing, Database, LogOut, Moon, Smartphone, Sun, Terminal } from 'lucide-react';
import { getRoleLabel } from '../../lib/format';
import type { ConnectedDevice, Family, UserProfile } from '../../types/erp';

interface ProfileAndMobileViewProps {
  user: UserProfile;
  family: Family;
  theme: 'light' | 'dark';
  storageMode: 'mongodb' | 'local-json';
  realtimeMode?: 'websocket' | 'polling';
  connectedDevices: ConnectedDevice[];
  onToggleTheme: () => void;
  onUpdateProfile: (payload: {
    name?: string;
    phone?: string;
    relationship?: string;
    pushNotificationsEnabled?: boolean;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
  onLogout: () => void;
}

export function ProfileAndMobileView({
  user,
  family,
  theme,
  storageMode,
  realtimeMode = 'websocket',
  connectedDevices,
  onToggleTheme,
  onUpdateProfile,
  onLogout,
}: ProfileAndMobileViewProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [relationship, setRelationship] = useState(user.relationship);
  const [pushEnabled, setPushEnabled] = useState(user.pushNotificationsEnabled);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await onUpdateProfile({
        name,
        phone,
        relationship,
        pushNotificationsEnabled: pushEnabled,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Profile and preferences saved and synchronized.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Profile & Mobile App Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {user.email} · {getRoleLabel(user.role)} · {family.name}
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="min-h-[44px] px-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm font-semibold inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Profile & Security Form */}
        <section className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Personal Details & Preferences
          </h2>

          {message && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-300">
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Appearance Mode</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Currently {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <BellRing className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Push Notifications</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Android & iOS alerts for family transactions & budget thresholds
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPushEnabled((v) => !v)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                    pushEnabled
                      ? 'bg-emerald-700 text-white'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {pushEnabled ? 'Enabled' : 'Paused'}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Change Password (Optional)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6)"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[46px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </form>
        </section>

        {/* Right: Cross-Platform Mobile (Expo Android & iOS) + MongoDB Atlas Architecture */}
        <section className="lg:col-span-6 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Shared Backend & Cloud Database
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Storage engine: {storageMode === 'mongodb' ? 'MongoDB Atlas (Connected)' : 'Local Persistent Store (Set MONGODB_URI for Atlas)'}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
              <p>
                Android, iOS, and Web clients all authenticate against this unified Express + JWT API and synchronize via{' '}
                {realtimeMode === 'polling' ? 'cloud HTTPS sync backed by MongoDB Atlas.' : 'WebSockets.'}
              </p>
              <p className="font-mono text-[11px] bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                Active connected clients: {connectedDevices.length} · Family Code: {family.familyCode}
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  React Native Expo App (Android & iOS)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Complete native source included in <span className="font-mono">/mobile</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                  <Terminal className="w-3.5 h-3.5" /> 1. Run Expo Dev Client (Android & iOS)
                </p>
                <pre className="font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto">
{`cd mobile && npm install
EXPO_PUBLIC_API_URL=${window.location.origin} npx expo start`}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  2. Build Android APK & Play Store AAB
                </p>
                <pre className="font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto">
{`eas build -p android --profile preview     # Direct APK install
eas build -p android --profile production  # Google Play AAB`}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  3. Build iOS App Store IPA
                </p>
                <pre className="font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto">
{`eas build -p ios --profile production
eas submit -p ios --latest`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
