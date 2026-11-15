export type UserRole = 'admin' | 'parent' | 'member' | 'viewer';

export type TransactionType = 'income' | 'expense';

export type DevicePlatform = 'web' | 'ios' | 'android';

export interface Family {
  id: string;
  name: string;
  familyCode: string;
  currency: string;
  createdAt: string;
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
  expoPushTokens: string[];
  activeStatus: 'active' | 'suspended';
  createdAt: string;
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
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  sourceDevice: DevicePlatform;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  familyId: string;
  category: string;
  month: string; // YYYY-MM
  limitAmount: number;
  spentAmount?: number;
  createdBy: string;
  updatedAt: string;
}

export interface SavingsGoalContribution {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  note: string;
}

export interface SavingsGoal {
  id: string;
  familyId: string;
  title: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  contributions: SavingsGoalContribution[];
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  familyId: string;
  recipientId: string | 'all';
  title: string;
  message: string;
  category: 'transaction' | 'budget' | 'goal' | 'member' | 'security';
  isRead: boolean;
  readBy: string[];
  createdAt: string;
}

export interface ConnectedDevice {
  connectionId: string;
  userId: string;
  userName: string;
  role: UserRole;
  platform: DevicePlatform;
  connectedAt: string;
}

export interface MonthlySeriesPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface MemberFinanceSummary {
  memberId: string;
  name: string;
  role: UserRole;
  relationship: string;
  income: number;
  expense: number;
  monthlyAllowance: number;
}

export interface ReportSummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number;
  totalSavingsGoalProgress: number;
  monthlySeries: MonthlySeriesPoint[];
  expenseByCategory: CategoryBreakdownItem[];
  incomeByCategory: CategoryBreakdownItem[];
  memberBreakdown: MemberFinanceSummary[];
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  family: Family;
}

export type RealtimeEventType =
  | 'sync:init'
  | 'transaction:created'
  | 'transaction:updated'
  | 'transaction:deleted'
  | 'budget:created'
  | 'budget:updated'
  | 'budget:deleted'
  | 'goal:created'
  | 'goal:updated'
  | 'goal:deleted'
  | 'member:created'
  | 'member:updated'
  | 'member:deleted'
  | 'notification:created'
  | 'presence:updated';

export interface RealtimeMessage<T = unknown> {
  type: RealtimeEventType;
  payload: T;
  timestamp: string;
  actorName?: string;
  sourcePlatform?: DevicePlatform;
}
