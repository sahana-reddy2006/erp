import type {
  AuthResponse,
  Budget,
  ConnectedDevice,
  NotificationItem,
  ReportSummary,
  SavingsGoal,
  Transaction,
  UserProfile,
  UserRole,
} from '../types/erp';

const TOKEN_KEY = 'kinledger_jwt_token';
const API_BASE = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || '').replace(/\/+$/, '');

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    const message =
      (typeof data.error === 'string' && data.error) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  health: () =>
    request<{
      ok: boolean;
      storage: 'mongodb' | 'local-json';
      mongoConnected?: boolean;
      realtime?: 'websocket' | 'polling';
      environment?: 'vercel' | 'node';
    }>('/health'),

  demoAccounts: () =>
    request<{
      familyCode: string;
      defaultPasswordHint: string;
      accounts: Array<{ name: string; email: string; role: UserRole; relationship: string }>;
    }>('/auth/demo-accounts'),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    familyCode?: string;
    familyName?: string;
    relationship?: string;
    phone?: string;
  }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string; expiresInMinutes: number; verificationCode: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),

  me: () => request<{ user: UserProfile; family: AuthResponse['family'] }>('/auth/me'),

  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  updateProfile: (payload: {
    name?: string;
    phone?: string;
    relationship?: string;
    themePreference?: 'light' | 'dark';
    pushNotificationsEnabled?: boolean;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    request<{ user: UserProfile }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getTransactions: (params?: { type?: string; category?: string; memberId?: string; month?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.category) qs.set('category', params.category);
    if (params?.memberId) qs.set('memberId', params.memberId);
    if (params?.month) qs.set('month', params.month);
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString();
    return request<{ transactions: Transaction[] }>(`/transactions${query ? `?${query}` : ''}`);
  },

  createTransaction: (payload: {
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    date: string;
    paymentMethod: string;
    memberId?: string;
    sourceDevice?: 'web' | 'ios' | 'android';
  }) =>
    request<{ transaction: Transaction }>('/transactions', {
      method: 'POST',
      body: JSON.stringify({ ...payload, sourceDevice: payload.sourceDevice || 'web' }),
    }),

  updateTransaction: (id: string, payload: Partial<Transaction>) =>
    request<{ transaction: Transaction }>(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...payload, sourceDevice: 'web' }),
    }),

  deleteTransaction: (id: string) =>
    request<{ deletedId: string }>(`/transactions/${id}`, {
      method: 'DELETE',
    }),

  getBudgets: (month: string) =>
    request<{ budgets: Budget[]; month: string }>(`/budgets?month=${encodeURIComponent(month)}`),

  saveBudget: (payload: { category: string; month: string; limitAmount: number }) =>
    request<{ budget: Budget }>('/budgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteBudget: (id: string) =>
    request<{ deletedId: string }>(`/budgets/${id}`, {
      method: 'DELETE',
    }),

  getGoals: () => request<{ goals: SavingsGoal[] }>('/goals'),

  createGoal: (payload: {
    title: string;
    category: string;
    targetAmount: number;
    currentAmount?: number;
    targetDate: string;
  }) =>
    request<{ goal: SavingsGoal }>('/goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  contributeGoal: (id: string, amount: number, note?: string) =>
    request<{ goal: SavingsGoal }>(`/goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    }),

  deleteGoal: (id: string) =>
    request<{ deletedId: string }>(`/goals/${id}`, {
      method: 'DELETE',
    }),

  getMembers: () => request<{ members: UserProfile[] }>('/members'),

  createMember: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    relationship: string;
    phone?: string;
    monthlyAllowance?: number;
  }) =>
    request<{ member: UserProfile }>('/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMember: (
    id: string,
    payload: {
      role?: UserRole;
      relationship?: string;
      monthlyAllowance?: number;
      activeStatus?: 'active' | 'suspended';
      phone?: string;
    }
  ) =>
    request<{ member: UserProfile }>(`/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteMember: (id: string) =>
    request<{ deletedId: string }>(`/members/${id}`, {
      method: 'DELETE',
    }),

  getReportSummary: (month: string) =>
    request<ReportSummary>(`/reports/summary?month=${encodeURIComponent(month)}`),

  getNotifications: () => request<{ notifications: NotificationItem[] }>('/notifications'),

  markNotificationRead: (id: string) =>
    request<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    request<{ ok: boolean }>('/notifications/read-all', { method: 'POST' }),

  getConnectedDevices: () => request<{ devices: ConnectedDevice[] }>('/devices/connected'),
};
