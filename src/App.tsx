import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  PieChart,
  Sun,
  Target,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { AuthViews } from './components/AuthViews';
import { BrandLogo } from './components/BrandLogo';
import { SplashScreen } from './components/SplashScreen';
import { TransactionModal } from './components/TransactionModal';
import { BudgetsView } from './components/views/BudgetsView';
import { DashboardView } from './components/views/DashboardView';
import { FamilyMembersView } from './components/views/FamilyMembersView';
import { GoalsView } from './components/views/GoalsView';
import { NotificationsView } from './components/views/NotificationsView';
import { ProfileAndMobileView } from './components/views/ProfileAndMobileView';
import { ReportsView } from './components/views/ReportsView';
import { TransactionsView } from './components/views/TransactionsView';
import { api, getStoredToken, setStoredToken } from './lib/api';
import { getCurrentMonthKey, getInitials, getRoleLabel } from './lib/format';
import type {
  AuthResponse,
  Budget,
  ConnectedDevice,
  Family,
  NotificationItem,
  RealtimeMessage,
  ReportSummary,
  SavingsGoal,
  Transaction,
  TransactionType,
  UserProfile,
  UserRole,
} from './types/erp';

type NavTab =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'goals'
  | 'reports'
  | 'members'
  | 'notifications'
  | 'profile';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('kinledger_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [user, setUser] = useState<UserProfile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [storageMode, setStorageMode] = useState<'mongodb' | 'local-json'>('local-json');
  const [realtimeMode, setRealtimeMode] = useState<'websocket' | 'polling'>('websocket');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);

  // Transaction Modal State
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [defaultTxType, setDefaultTxType] = useState<TransactionType>('expense');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const selectedMonthRef = useRef(selectedMonth);
  selectedMonthRef.current = selectedMonth;

  // Apply Tailwind v4 `.dark` class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('kinledger_theme', theme);
  }, [theme]);

  const loadWorkspaceData = useCallback(async (month: string) => {
    const [txRes, bdgRes, goalRes, memRes, notifRes, repRes, devRes] = await Promise.all([
      api.getTransactions(),
      api.getBudgets(month),
      api.getGoals(),
      api.getMembers(),
      api.getNotifications(),
      api.getReportSummary(month),
      api.getConnectedDevices(),
    ]);
    setTransactions(txRes.transactions);
    setBudgets(bdgRes.budgets);
    setGoals(goalRes.goals);
    setMembers(memRes.members);
    setNotifications(notifRes.notifications);
    setReport(repRes);
    setConnectedDevices(devRes.devices);
  }, []);

  const refreshAnalyticsAndBudgets = useCallback(async (month: string) => {
    const [bdgRes, repRes] = await Promise.all([
      api.getBudgets(month),
      api.getReportSummary(month),
    ]);
    setBudgets(bdgRes.budgets);
    setReport(repRes);
  }, []);

  // Boot session + splash
  useEffect(() => {
    let active = true;
    const minSplash = new Promise((resolve) => setTimeout(resolve, 650));

    async function hydrate() {
      try {
        const health = await api.health().catch(() => ({
          ok: true,
          storage: 'local-json' as const,
          realtime: 'websocket' as const,
        }));
        if (active) {
          setStorageMode(health.storage);
          setRealtimeMode(health.realtime === 'polling' ? 'polling' : 'websocket');
        }

        const token = getStoredToken();
        if (token) {
          const me = await api.me();
          if (active) {
            setUser(me.user);
            setFamily(me.family);
            if (me.user.themePreference) {
              setTheme(me.user.themePreference);
            }
            await loadWorkspaceData(selectedMonthRef.current);
          }
        }
      } catch {
        setStoredToken(null);
      } finally {
        await minSplash;
        if (active) setBooting(false);
      }
    }

    void hydrate();
    return () => {
      active = false;
    };
  }, [loadWorkspaceData]);

  // Reload month-scoped data when month selector changes
  useEffect(() => {
    if (!user) return;
    void refreshAnalyticsAndBudgets(selectedMonth);
  }, [selectedMonth, user, refreshAnalyticsAndBudgets]);

  // Real-time Sync Connection (WebSocket on Node servers, HTTPS polling on Vercel Serverless)
  useEffect(() => {
    if (!user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    if (realtimeMode === 'polling') {
      setWsConnected(true);
      const syncNow = () => {
        void loadWorkspaceData(selectedMonthRef.current).catch(() => {});
      };
      const pollId = window.setInterval(syncNow, 15000);
      window.addEventListener('focus', syncNow);
      return () => {
        window.clearInterval(pollId);
        window.removeEventListener('focus', syncNow);
      };
    }

    let cancelled = false;

    const connectWs = () => {
      const token = getStoredToken();
      if (!token || cancelled) return;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}&platform=web`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as RealtimeMessage;

          if (msg.type === 'sync:init' || msg.type === 'presence:updated') {
            setConnectedDevices(msg.payload as ConnectedDevice[]);
            return;
          }

          if (msg.type === 'transaction:created') {
            const incoming = msg.payload as Transaction;
            setTransactions((prev) =>
              prev.some((t) => t.id === incoming.id) ? prev : [incoming, ...prev]
            );
            void refreshAnalyticsAndBudgets(selectedMonthRef.current);
            if (msg.actorName && msg.actorName !== user.name) {
              setSyncBanner(`${msg.actorName} added a ${incoming.type} via ${(msg.sourcePlatform || 'web').toUpperCase()}`);
              setTimeout(() => setSyncBanner(null), 4000);
            }
          } else if (msg.type === 'transaction:updated') {
            const updated = msg.payload as Transaction;
            setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            void refreshAnalyticsAndBudgets(selectedMonthRef.current);
          } else if (msg.type === 'transaction:deleted') {
            const { id } = msg.payload as { id: string };
            setTransactions((prev) => prev.filter((t) => t.id !== id));
            void refreshAnalyticsAndBudgets(selectedMonthRef.current);
          } else if (msg.type === 'budget:created' || msg.type === 'budget:updated' || msg.type === 'budget:deleted') {
            void refreshAnalyticsAndBudgets(selectedMonthRef.current);
          } else if (msg.type === 'goal:created') {
            const g = msg.payload as SavingsGoal;
            setGoals((prev) => (prev.some((item) => item.id === g.id) ? prev : [...prev, g]));
          } else if (msg.type === 'goal:updated') {
            const g = msg.payload as SavingsGoal;
            setGoals((prev) => prev.map((item) => (item.id === g.id ? g : item)));
          } else if (msg.type === 'goal:deleted') {
            const { id } = msg.payload as { id: string };
            setGoals((prev) => prev.filter((item) => item.id !== id));
          } else if (msg.type === 'member:created') {
            const m = msg.payload as UserProfile;
            setMembers((prev) => (prev.some((item) => item.id === m.id) ? prev : [...prev, m]));
          } else if (msg.type === 'member:updated') {
            const m = msg.payload as UserProfile;
            setMembers((prev) => prev.map((item) => (item.id === m.id ? m : item)));
            if (m.id === user.id) setUser(m);
          } else if (msg.type === 'member:deleted') {
            const { id } = msg.payload as { id: string };
            setMembers((prev) => prev.filter((item) => item.id !== id));
          } else if (msg.type === 'notification:created') {
            const n = msg.payload as NotificationItem;
            setNotifications((prev) => (prev.some((item) => item.id === n.id) ? prev : [n, ...prev]));
          }
        } catch {
          // Ignore malformed WS payloads
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setWsConnected(false);
        reconnectTimerRef.current = window.setTimeout(connectWs, 2500);
      };
    };

    connectWs();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [user, realtimeMode, refreshAnalyticsAndBudgets, loadWorkspaceData]);

  const handleAuthenticated = async (auth: AuthResponse) => {
    setStoredToken(auth.token);
    setUser(auth.user);
    setFamily(auth.family);
    if (auth.user.themePreference) {
      setTheme(auth.user.themePreference);
    }
    await loadWorkspaceData(selectedMonth);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setStoredToken(null);
    setUser(null);
    setFamily(null);
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
    setMembers([]);
    setNotifications([]);
    setReport(null);
  };

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (user) {
      await api.updateProfile({ themePreference: next }).catch(() => {});
    }
  };

  // Mutation Handlers
  const handleSaveTransaction = async (payload: {
    id?: string;
    type: TransactionType;
    category: string;
    amount: number;
    description: string;
    date: string;
    paymentMethod: string;
    memberId?: string;
  }) => {
    if (payload.id) {
      const res = await api.updateTransaction(payload.id, payload);
      setTransactions((prev) => prev.map((t) => (t.id === res.transaction.id ? res.transaction : t)));
    } else {
      const res = await api.createTransaction(payload);
      setTransactions((prev) =>
        prev.some((t) => t.id === res.transaction.id) ? prev : [res.transaction, ...prev]
      );
    }
    await refreshAnalyticsAndBudgets(selectedMonth);
  };

  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await refreshAnalyticsAndBudgets(selectedMonth);
  };

  const handleSaveBudget = async (payload: { category: string; month: string; limitAmount: number }) => {
    await api.saveBudget(payload);
    await refreshAnalyticsAndBudgets(selectedMonth);
  };

  const handleDeleteBudget = async (id: string) => {
    await api.deleteBudget(id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  const handleCreateGoal = async (payload: {
    title: string;
    category: string;
    targetAmount: number;
    currentAmount?: number;
    targetDate: string;
  }) => {
    const res = await api.createGoal(payload);
    setGoals((prev) => (prev.some((g) => g.id === res.goal.id) ? prev : [...prev, res.goal]));
  };

  const handleContributeGoal = async (id: string, amount: number, note: string) => {
    const res = await api.contributeGoal(id, amount, note);
    setGoals((prev) => prev.map((g) => (g.id === res.goal.id ? res.goal : g)));
  };

  const handleDeleteGoal = async (id: string) => {
    await api.deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleCreateMember = async (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    relationship: string;
    phone?: string;
    monthlyAllowance?: number;
  }) => {
    const res = await api.createMember(payload);
    setMembers((prev) => (prev.some((m) => m.id === res.member.id) ? prev : [...prev, res.member]));
  };

  const handleUpdateMember = async (
    id: string,
    payload: {
      role?: UserRole;
      relationship?: string;
      monthlyAllowance?: number;
      activeStatus?: 'active' | 'suspended';
    }
  ) => {
    const res = await api.updateMember(id, payload);
    setMembers((prev) => prev.map((m) => (m.id === res.member.id ? res.member : m)));
  };

  const handleDeleteMember = async (id: string) => {
    await api.deleteMember(id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMarkNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleUpdateProfile = async (payload: {
    name?: string;
    phone?: string;
    relationship?: string;
    pushNotificationsEnabled?: boolean;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    const res = await api.updateProfile(payload);
    setUser(res.user);
    setMembers((prev) => prev.map((m) => (m.id === res.user.id ? res.user : m)));
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  if (booting) {
    return <SplashScreen />;
  }

  if (!user || !family) {
    return (
      <AuthViews
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const navItems: Array<{ id: NavTab; label: string; icon: typeof LayoutDashboard; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Ledger', icon: ListOrdered },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'members', label: 'Family', icon: Users },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: unreadCount },
    { id: 'profile', label: 'Profile', icon: UserCircle },
  ];

  const navigateTo = (tab: string) => {
    setActiveTab(tab as NavTab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30 print:hidden">
        <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <BrandLogo size={32} />
          <div className="min-w-0">
            <p className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              KinLedger
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {family.name}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center justify-between gap-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge && item.badge > 0 ? (
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-display text-xs font-bold shrink-0">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {user.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {getRoleLabel(user.role)} · {connectedDevices.length} devices
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 print:pl-0 flex flex-col min-w-0">
        {/* Mobile Top App Bar (Compact 52px) */}
        <header className="md:hidden print:hidden sticky top-0 z-30 h-[52px] px-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size={26} />
            <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {navItems.find((i) => i.id === activeTab)?.label || 'KinLedger'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Live Cross-Device Sync Toast */}
        {syncBanner && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-3 rounded-xl bg-emerald-700 text-white text-xs font-semibold flex items-center justify-between gap-3">
            <span>{syncBanner}</span>
            <button type="button" onClick={() => setSyncBanner(null)} className="underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Active View Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              month={selectedMonth}
              userRole={user.role}
              currency={family.currency}
              report={report}
              transactions={transactions}
              budgets={budgets}
              goals={goals}
              connectedDevices={connectedDevices}
              wsConnected={wsConnected}
              realtimeMode={realtimeMode}
              onOpenNewTransaction={(t) => {
                setEditingTx(null);
                setDefaultTxType(t);
                setTxModalOpen(true);
              }}
              onEditTransaction={(tx) => {
                setEditingTx(tx);
                setTxModalOpen(true);
              }}
              onNavigate={navigateTo}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              members={members}
              currentUserId={user.id}
              currentUserRole={user.role}
              currency={family.currency}
              onOpenNew={(t) => {
                setEditingTx(null);
                setDefaultTxType(t);
                setTxModalOpen(true);
              }}
              onEdit={(tx) => {
                setEditingTx(tx);
                setTxModalOpen(true);
              }}
              onDelete={handleDeleteTransaction}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsView
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              budgets={budgets}
              userRole={user.role}
              currency={family.currency}
              onSaveBudget={handleSaveBudget}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsView
              goals={goals}
              userRole={user.role}
              currency={family.currency}
              onCreateGoal={handleCreateGoal}
              onContributeGoal={handleContributeGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              report={report}
              currency={family.currency}
            />
          )}

          {activeTab === 'members' && (
            <FamilyMembersView
              family={family}
              members={members}
              currentUser={user}
              onCreateMember={handleCreateMember}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileAndMobileView
              user={user}
              family={family}
              theme={theme}
              storageMode={storageMode}
              realtimeMode={realtimeMode}
              connectedDevices={connectedDevices}
              onToggleTheme={toggleTheme}
              onUpdateProfile={handleUpdateProfile}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (5 Thumb-Friendly Tabs) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden print:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {(
            [
              { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
              { id: 'transactions', label: 'Ledger', icon: ListOrdered },
              { id: 'budgets', label: 'Budgets', icon: PieChart },
              { id: 'goals', label: 'Goals', icon: Target },
              { id: 'members', label: 'Family', icon: Users },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigateTo(tab.id)}
                className={`h-full flex flex-col items-center justify-center gap-1 transition-colors ${
                  active
                    ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Drawer Menu for Reports, Alerts, Profile & Logout */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium ${
                        active
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </span>
                      {item.badge && item.badge > 0 ? (
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full min-h-[44px] px-4 rounded-xl border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        open={txModalOpen}
        initialTransaction={editingTx}
        defaultType={defaultTxType}
        members={members}
        currentUserId={user.id}
        currentUserRole={user.role}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
        }}
        onSubmit={handleSaveTransaction}
      />
    </div>
  );
}
