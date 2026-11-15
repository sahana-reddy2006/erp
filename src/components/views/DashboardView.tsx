import { ArrowDownLeft, ArrowUpRight, Monitor, Plus, Smartphone, Tablet, TrendingUp } from 'lucide-react';
import { formatCurrency, formatMonthLabel, formatShortDate } from '../../lib/format';
import type {
  Budget,
  ConnectedDevice,
  ReportSummary,
  SavingsGoal,
  Transaction,
  TransactionType,
  UserRole,
} from '../../types/erp';
import { CashflowBarChart, CategoryDonutChart, ProgressRing } from '../Charts';

interface DashboardViewProps {
  month: string;
  userRole: UserRole;
  currency: string;
  report: ReportSummary | null;
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  connectedDevices: ConnectedDevice[];
  wsConnected: boolean;
  onOpenNewTransaction: (type: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onNavigate: (tab: string) => void;
}

export function DashboardView({
  month,
  userRole,
  currency,
  report,
  transactions,
  budgets,
  goals,
  connectedDevices,
  wsConnected,
  onOpenNewTransaction,
  onEditTransaction,
  onNavigate,
}: DashboardViewProps) {
  const canMutate = userRole !== 'viewer';
  const totalIncome = report?.totalIncome ?? 0;
  const totalExpense = report?.totalExpense ?? 0;
  const netBalance = report?.netBalance ?? 0;
  const savingsRate = report?.savingsRate ?? 0;

  const recentTxs = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header Row & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Household Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {formatMonthLabel(month)} · Real-time synchronized treasury
          </p>
        </div>

        {canMutate && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenNewTransaction('income')}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Add Income
            </button>
            <button
              type="button"
              onClick={() => onOpenNewTransaction('expense')}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>
        )}
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Monthly Cashflow</p>
          <p className="mt-2 font-mono text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(netBalance, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {netBalance >= 0 ? 'Surplus position' : 'Deficit position'}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Income</p>
          <p className="mt-2 font-mono text-xl sm:text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(totalIncome, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Combined household inflow
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Expenses</p>
          <p className="mt-2 font-mono text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(totalExpense, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {budgets.length} tracked budget categories
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Savings Rate</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {savingsRate}%
            </p>
            <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Goals funded: {report?.totalSavingsGoalProgress ?? 0}%
          </p>
        </div>
      </div>

      {/* Primary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <section className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Six-Month Cashflow Trend
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Income versus total household spend
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline min-h-[36px] px-2"
            >
              Full Report
            </button>
          </div>
          <CashflowBarChart data={report?.monthlySeries ?? []} />
        </section>

        <section className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Expense Distribution
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Allocation by category for {formatMonthLabel(month)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('budgets')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline min-h-[36px] px-2"
            >
              Budgets
            </button>
          </div>
          <CategoryDonutChart
            items={report?.expenseByCategory ?? []}
            totalLabel="Monthly Spend"
          />
        </section>
      </div>

      {/* Bottom Split: Recent Ledger + Savings Goals & Active Multi-Device Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <section className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Recent Transactions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest activity synced from Web, iOS, and Android
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline min-h-[36px] px-2"
            >
              View Ledger
            </button>
          </div>

          {recentTxs.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTxs.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => canMutate && onEditTransaction(tx)}
                  className="w-full py-3 min-h-[56px] flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 -mx-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {tx.category} · {tx.memberName} · {formatShortDate(tx.date)} · {tx.sourceDevice.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-sm font-bold tabular-nums shrink-0 ${
                      tx.type === 'income'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, currency)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          {/* Savings Goals Snapshot */}
          <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Savings Goals
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('goals')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline min-h-[36px] px-2"
              >
                Manage Goals
              </button>
            </div>
            <div className="space-y-4">
              {goals.slice(0, 3).map((g) => {
                const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
                return (
                  <div key={g.id} className="flex items-center gap-3.5">
                    <ProgressRing percentage={pct} size={52} strokeWidth={5} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {g.title}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatCurrency(g.currentAmount, currency)} / {formatCurrency(g.targetAmount, currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Real-Time Multi-Device Sync Presence */}
          <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Active Sync Sessions
              </h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsConnected ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}
                />
                {wsConnected ? 'Live WebSocket' : 'Reconnecting'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Connected Android, iOS, and Web clients in your family room:
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {connectedDevices.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Connecting active session...</p>
              ) : (
                connectedDevices.slice(0, 5).map((dev) => (
                  <div key={dev.connectionId} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {dev.platform === 'ios' || dev.platform === 'android' ? (
                        <Smartphone className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Monitor className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                      )}
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {dev.userName}
                      </span>
                    </div>
                    <span className="font-mono text-slate-500 dark:text-slate-400 uppercase shrink-0">
                      {dev.platform}
                    </span>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="mt-3 w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              <Tablet className="w-3.5 h-3.5" />
              Android & iOS Expo Setup Guide
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
