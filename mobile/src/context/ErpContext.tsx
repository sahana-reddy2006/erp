import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DEVICE_PLATFORM, getWebSocketUrl, loadToken, mobileRequest, saveToken } from '../lib/api';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import type {
  Budget,
  Family,
  NotificationItem,
  ReportSummary,
  SavingsGoal,
  Transaction,
  TransactionType,
  UserProfile,
  UserRole,
} from '../types';
import { useTheme } from './ThemeContext';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface ErpContextValue {
  booting: boolean;
  user: UserProfile | null;
  family: Family | null;
  month: string;
  setMonth: (m: string) => void;
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  members: UserProfile[];
  notifications: NotificationItem[];
  report: ReportSummary | null;
  wsConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    familyCode?: string;
    familyName?: string;
    relationship?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAll: () => Promise<void>;
  saveTransaction: (payload: {
    id?: string;
    type: TransactionType;
    category: string;
    amount: number;
    description: string;
    date: string;
    paymentMethod: string;
  }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveBudget: (category: string, limitAmount: number) => Promise<void>;
  contributeGoal: (goalId: string, amount: number, note: string) => Promise<void>;
  createGoal: (title: string, category: string, targetAmount: number, targetDate: string) => Promise<void>;
  addMember: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    relationship: string;
    monthlyAllowance: number;
  }) => Promise<void>;
  updateMemberRole: (memberId: string, role: UserRole) => Promise<void>;
  updateProfile: (payload: { name?: string; phone?: string; themePreference?: 'light' | 'dark'; pushNotificationsEnabled?: boolean }) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

const ErpContext = createContext<ErpContextValue | null>(null);

export function ErpProvider({ children }: { children: React.ReactNode }) {
  const { setMode } = useTheme();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [month, setMonth] = useState(currentMonthKey());

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const monthRef = useRef(month);
  monthRef.current = month;

  const refreshAll = useCallback(async (targetMonth = monthRef.current) => {
    const [txRes, bdgRes, goalRes, memRes, notifRes, repRes] = await Promise.all([
      mobileRequest<{ transactions: Transaction[] }>('/transactions'),
      mobileRequest<{ budgets: Budget[] }>(`/budgets?month=${encodeURIComponent(targetMonth)}`),
      mobileRequest<{ goals: SavingsGoal[] }>('/goals'),
      mobileRequest<{ members: UserProfile[] }>('/members'),
      mobileRequest<{ notifications: NotificationItem[] }>('/notifications'),
      mobileRequest<ReportSummary>(`/reports/summary?month=${encodeURIComponent(targetMonth)}`),
    ]);
    setTransactions(txRes.transactions);
    setBudgets(bdgRes.budgets);
    setGoals(goalRes.goals);
    setMembers(memRes.members);
    setNotifications(notifRes.notifications);
    setReport(repRes);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await loadToken();
        if (token) {
          const me = await mobileRequest<{ user: UserProfile; family: Family }>('/auth/me');
          if (active) {
            setUser(me.user);
            setFamily(me.family);
            setMode(me.user.themePreference || 'light');
            await refreshAll();
            void registerForPushNotificationsAsync();
          }
        }
      } catch {
        await saveToken(null);
      } finally {
        if (active) setBooting(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshAll, setMode]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const connect = async () => {
      const token = await loadToken();
      if (!token || cancelled) return;

      const ws = new WebSocket(getWebSocketUrl(token));
      wsRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type: string; payload: unknown };
          if (
            msg.type.startsWith('transaction:') ||
            msg.type.startsWith('budget:') ||
            msg.type.startsWith('goal:') ||
            msg.type.startsWith('member:') ||
            msg.type.startsWith('notification:')
          ) {
            void refreshAll(monthRef.current);
          }
        } catch {
          // Ignore invalid socket frame
        }
      };

      ws.onclose = () => {
        if (!cancelled) {
          setWsConnected(false);
          setTimeout(connect, 3000);
        }
      };
    };

    void connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
    };
  }, [user, refreshAll]);

  const login = async (email: string, password: string) => {
    const auth = await mobileRequest<{ token: string; user: UserProfile; family: Family }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await saveToken(auth.token);
    setUser(auth.user);
    setFamily(auth.family);
    setMode(auth.user.themePreference || 'light');
    await refreshAll();
    void registerForPushNotificationsAsync();
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    familyCode?: string;
    familyName?: string;
    relationship?: string;
  }) => {
    const auth = await mobileRequest<{ token: string; user: UserProfile; family: Family }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await saveToken(auth.token);
    setUser(auth.user);
    setFamily(auth.family);
    await refreshAll();
    void registerForPushNotificationsAsync();
  };

  const logout = async () => {
    await mobileRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    await saveToken(null);
    setUser(null);
    setFamily(null);
    wsRef.current?.close();
  };

  const saveTransaction = async (payload: {
    id?: string;
    type: TransactionType;
    category: string;
    amount: number;
    description: string;
    date: string;
    paymentMethod: string;
  }) => {
    if (payload.id) {
      await mobileRequest(`/transactions/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...payload, sourceDevice: DEVICE_PLATFORM }),
      });
    } else {
      await mobileRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify({ ...payload, sourceDevice: DEVICE_PLATFORM }),
      });
    }
    await refreshAll();
  };

  const deleteTransaction = async (id: string) => {
    await mobileRequest(`/transactions/${id}`, { method: 'DELETE' });
    await refreshAll();
  };

  const saveBudget = async (category: string, limitAmount: number) => {
    await mobileRequest('/budgets', {
      method: 'POST',
      body: JSON.stringify({ category, month, limitAmount }),
    });
    await refreshAll();
  };

  const contributeGoal = async (goalId: string, amount: number, note: string) => {
    await mobileRequest(`/goals/${goalId}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    });
    await refreshAll();
  };

  const createGoal = async (title: string, category: string, targetAmount: number, targetDate: string) => {
    await mobileRequest('/goals', {
      method: 'POST',
      body: JSON.stringify({ title, category, targetAmount, targetDate }),
    });
    await refreshAll();
  };

  const addMember = async (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    relationship: string;
    monthlyAllowance: number;
  }) => {
    await mobileRequest('/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshAll();
  };

  const updateMemberRole = async (memberId: string, role: UserRole) => {
    await mobileRequest(`/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    await refreshAll();
  };

  const updateProfile = async (payload: {
    name?: string;
    phone?: string;
    themePreference?: 'light' | 'dark';
    pushNotificationsEnabled?: boolean;
  }) => {
    const res = await mobileRequest<{ user: UserProfile }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setUser(res.user);
    if (payload.themePreference) setMode(payload.themePreference);
  };

  const markNotificationRead = async (id: string) => {
    await mobileRequest(`/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  return (
    <ErpContext.Provider
      value={{
        booting,
        user,
        family,
        month,
        setMonth,
        transactions,
        budgets,
        goals,
        members,
        notifications,
        report,
        wsConnected,
        login,
        register,
        logout,
        refreshAll,
        saveTransaction,
        deleteTransaction,
        saveBudget,
        contributeGoal,
        createGoal,
        addMember,
        updateMemberRole,
        updateProfile,
        markNotificationRead,
      }}
    >
      {children}
    </ErpContext.Provider>
  );
}

export function useErp() {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error('useErp must be used inside ErpProvider');
  return ctx;
}
