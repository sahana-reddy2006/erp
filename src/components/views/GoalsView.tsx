import React, { useState } from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatShortDate } from '../../lib/format';
import type { SavingsGoal, UserRole } from '../../types/erp';
import { ProgressRing } from '../Charts';

interface GoalsViewProps {
  goals: SavingsGoal[];
  userRole: UserRole;
  currency: string;
  onCreateGoal: (payload: {
    title: string;
    category: string;
    targetAmount: number;
    currentAmount?: number;
    targetDate: string;
  }) => Promise<void>;
  onContributeGoal: (id: string, amount: number, note: string) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
}

export function GoalsView({
  goals,
  userRole,
  currency,
  onCreateGoal,
  onContributeGoal,
  onDeleteGoal,
}: GoalsViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Safety Net');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('2027-12-31');
  const [saving, setSaving] = useState(false);

  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');

  const canMutate = userRole !== 'viewer';
  const canDelete = userRole === 'admin' || userRole === 'parent';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateGoal({
        title,
        category,
        targetAmount: Number(targetAmount),
        currentAmount: Number(initialAmount || 0),
        targetDate,
      });
      setTitle('');
      setTargetAmount('');
      setInitialAmount('0');
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoalId || !Number(contribAmount)) return;
    setSaving(true);
    try {
      await onContributeGoal(contributingGoalId, Number(contribAmount), contribNote || 'Household contribution');
      setContributingGoalId(null);
      setContribAmount('');
      setContribNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Family Savings Goals
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Shared long-term reserves funded across all household members
          </p>
        </div>

        {canMutate && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Savings Goal
          </button>
        )}
      </div>

      {showCreate && canMutate && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Create Shared Goal
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Family Home Downpayment"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Amount</label>
              <input
                type="number"
                required
                min="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="500000"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Date</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-5 rounded-xl bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {goals.map((goal) => {
          const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
          const isContributing = contributingGoalId === goal.id;

          return (
            <div
              key={goal.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <ProgressRing percentage={pct} size={68} strokeWidth={6} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {goal.category}
                    </p>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                      {goal.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Target {formatShortDate(goal.targetDate)}</span>
                    </div>
                  </div>
                </div>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDeleteGoal(goal.id)}
                    aria-label={`Delete ${goal.title}`}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Saved</p>
                  <p className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(goal.currentAmount, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Target</p>
                  <p className="font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatCurrency(goal.targetAmount, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Remaining</p>
                  <p className="font-mono font-bold tabular-nums text-slate-700 dark:text-slate-300 mt-0.5">
                    {formatCurrency(remaining, currency)}
                  </p>
                </div>
              </div>

              {goal.contributions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Recent Contributions
                  </p>
                  {goal.contributions.slice(-2).reverse().map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span className="truncate">
                        {c.memberName} · {c.note}
                      </span>
                      <span className="font-mono font-semibold tabular-nums shrink-0 text-emerald-700 dark:text-emerald-400">
                        +{formatCurrency(c.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {canMutate && (
                isContributing ? (
                  <form onSubmit={handleContribute} className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        inputMode="decimal"
                        value={contribAmount}
                        onChange={(e) => setContribAmount(e.target.value)}
                        placeholder="Amount (INR · ₹)"
                        className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        value={contribNote}
                        onChange={(e) => setContribNote(e.target.value)}
                        placeholder="Note (optional)"
                        className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 min-h-[44px] rounded-xl bg-emerald-700 text-white text-sm font-semibold"
                      >
                        {saving ? 'Adding...' : 'Confirm Deposit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setContributingGoalId(null)}
                        className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setContributingGoalId(goal.id)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 transition-colors"
                  >
                    Contribute Funds
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
