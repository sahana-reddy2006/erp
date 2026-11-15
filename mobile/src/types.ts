export type UserRole = 'admin' | 'parent' | 'member' | 'viewer';
export type TransactionType = 'income' | 'expense';
export type DevicePlatform = 'web' | 'ios' | 'android';

export interface Family {
  id: string;
  name: string;
  familyCode: string;
  currency: string;
}

export interface UserProfile {
  id: string;
  familyId: string;
  name: string;
  email: string;
  role: UserRole;
  relationship: string;
  phone: string;
  monthlyAllowance: number;
  themePreference: 'light' | 'dark';
  pushNotificationsEnabled: boolean;
  activeStatus: 'active' | 'suspended';
}

export interface Transaction {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod: string;
  sourceDevice: DevicePlatform;
}

export interface Budget {
  id: string;
  category: string;
  month: string;
  limitAmount: number;
  spentAmount?: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReportSummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number;
  monthlySeries: Array<{ month: string; label: string; income: number; expense: number }>;
  expenseByCategory: Array<{ category: string; amount: number; percentage: number }>;
}
