import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { EXPENSE_CATEGORIES, formatCurrency, formatMonthLabel, getRecentMonths } from '../../lib/format';
import type { Budget, UserRole } from '../../types/erp';

interface BudgetsViewProps {
  month: string;
  onMonthChange: (month: string) => void;
  budgets: Budget[];
  userRole: UserRole;
  currency: string;
  onSaveBudget: (payload: { category: string; month: string; limitAmount: number }) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
}

export function BudgetsView({
  month,
  onMonthChange,
  budgets,
  userRole,
  currency,
  onSaveBudget,
  onDeleteBudget,
}: BudgetsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [limitAmount, setLimitAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = userRole === 'admin' || userRole === 'parent';
  const months = getRecentMonths(6);

  const totalBudget = budgets.reduce((s, b) => s + b.limitAmount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spentAmount || 0), 0);
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(limitAmount);
    if (!numeric || numeric <= 0) {
      setError('Enter a valid monthly budget amount.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveBudget({ category, month, limitAmount: numeric });
      setLimitAmount('');
      setShowForm(false);
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
            Monthly Budgets
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {formatMonthLabel(month)} · {formatCurrency(totalSpent, currency)} spent of {formatCurrency(totalBudget, currency)} ({overallPct}%)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            aria-label="Select budget month"
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-medium"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {canManage && (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Set Budget
            </button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <form
          onSubmit={handleSave}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Configure Category Budget ({formatMonthLabel(month)})
          </h2>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Expense Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Monthly Limit (INR · ₹)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="decimal"
                required
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                placeholder="25000"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Budget'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {budgets.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No budgets configured for {formatMonthLabel(month)}.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-700 text-white text-sm font-semibold"
            >
              Create First Category Budget
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const spent = b.spentAmount || 0;
            const ratio = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
            const isOver = spent > b.limitAmount;
            const isWarning = !isOver && ratio >= 80;
            const statusText = isOver ? 'Over Budget' : isWarning ? 'Near Limit' : 'On Track';

            return (
              <div
                key={b.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      {b.category}
                    </h3>
                    <div
                      className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${
                        isOver
                          ? 'text-red-600 dark:text-red-400'
                          : isWarning
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {isOver || isWarning ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>{statusText}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{Math.round(ratio)}% used</span>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onDeleteBudget(b.id)}
                      aria-label={`Delete ${b.category} budget`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver
                        ? 'bg-red-600 dark:bg-red-500'
                        : isWarning
                          ? 'bg-amber-500'
                          : 'bg-emerald-700 dark:bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, ratio)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  <span>Spent: {formatCurrency(spent, currency)}</span>
                  <span>Limit: {formatCurrency(b.limitAmount, currency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
