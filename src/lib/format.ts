import type { UserRole } from '../types/erp';

export const INCOME_CATEGORIES = [
  'Salary',
  'Business',
  'Freelance',
  'Investments',
  'Rental Income',
  'Allowance',
  'Other Income',
];

export const EXPENSE_CATEGORIES = [
  'Housing',
  'Groceries',
  'Education',
  'Utilities',
  'Healthcare',
  'Transportation',
  'Dining & Leisure',
  'Subscriptions',
  'Insurance',
  'Family Travel',
  'Other Expense',
];

export const PAYMENT_METHODS = [
  'UPI',
  'Bank Transfer',
  'NEFT / IMPS',
  'Direct Deposit',
  'Family Card',
  'Credit Card',
  'Debit Card',
  'Cash',
];

export function formatCurrency(amount: number, currency = 'INR'): string {
  const targetCurrency = currency === 'USD' || !currency ? 'INR' : currency;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactINR(amount: number): string {
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${Number.isInteger(cr) ? cr : cr.toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    const l = amount / 100000;
    return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${Math.round(amount / 1000)}k`;
  }
  return `₹${amount}`;
}

export function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-');
  if (!y || !m) return monthStr;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getRecentMonths(count = 6): Array<{ value: string; label: string }> {
  const now = new Date();
  const list: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    list.push({
      value: val,
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    });
  }
  return list;
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'parent':
      return 'Parent';
    case 'member':
      return 'Member';
    case 'viewer':
      return 'Viewer';
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}
