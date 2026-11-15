import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  formatCurrency,
  formatShortDate,
  getRecentMonths,
} from '../../lib/format';
import type { Transaction, TransactionType, UserProfile, UserRole } from '../../types/erp';

interface TransactionsViewProps {
  transactions: Transaction[];
  members: UserProfile[];
  currentUserId: string;
  currentUserRole: UserRole;
  currency: string;
  onOpenNew: (type: TransactionType) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
}

export function TransactionsView({
  transactions,
  members,
  currentUserId,
  currentUserRole,
  currency,
  onOpenNew,
  onEdit,
  onDelete,
}: TransactionsViewProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const months = useMemo(() => getRecentMonths(6), []);
  const allCategories = useMemo(
    () => Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])),
    []
  );

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (memberFilter !== 'all' && t.memberId !== memberFilter) return false;
      if (monthFilter !== 'all' && !t.date.startsWith(monthFilter)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !t.description.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q) &&
          !t.memberName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, memberFilter, monthFilter, search]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const canCreate = currentUserRole !== 'viewer';
  const canModifyTx = (tx: Transaction) =>
    currentUserRole === 'admin' ||
    currentUserRole === 'parent' ||
    (currentUserRole === 'member' && tx.memberId === currentUserId);

  const exportExcelCsv = () => {
    const header = ['Date', 'Type', 'Category', 'Description', 'Member', 'Payment Method', 'Device', 'Amount (INR)'];
    const rows = filtered.map((t) => [
      t.date,
      t.type,
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.memberName}"`,
      t.paymentMethod,
      t.sourceDevice,
      `"${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount, currency)}"`,
    ]);
    const csv = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinledger-transactions-inr-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Income & Expense Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {filtered.length} entries · Net {formatCurrency(totals.net, currency)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={exportExcelCsv}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Excel (INR)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            PDF
          </button>
          {canCreate && (
            <>
              <button
                type="button"
                onClick={() => onOpenNew('income')}
                className="min-h-[44px] px-4 rounded-xl border border-emerald-700/30 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Income
              </button>
              <button
                type="button"
                onClick={() => onOpenNew('expense')}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Expense
              </button>
            </>
          )}
        </div>
      </div>

      {currentUserRole === 'viewer' && (
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          Your role is set to <span className="font-semibold text-slate-900 dark:text-slate-100">Viewer</span>. You can inspect all household transactions, budgets, and reports in real time, while modifications require Member, Parent, or Admin privileges.
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Segmented Type Filter */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 md:w-72 shrink-0">
            {(['all', 'income', 'expense'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`min-h-[40px] rounded-lg text-xs font-semibold capitalize transition-colors ${
                  typeFilter === t
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, category, or family member..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Filter by month"
            className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm"
          >
            <option value="all">All Months</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm"
          >
            <option value="all">All Categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            aria-label="Filter by family member"
            className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm"
          >
            <option value="all">All Family Members ({members.length})</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Filtered Income</p>
          <p className="font-mono text-sm sm:text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            +{formatCurrency(totals.income, currency)}
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Filtered Expenses</p>
          <p className="font-mono text-sm sm:text-base font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            -{formatCurrency(totals.expense, currency)}
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Filtered Net</p>
          <p className="font-mono text-sm sm:text-base font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totals.net, currency)}
          </p>
        </div>
      </div>

      {/* Responsive Table (Desktop) + Touch Rows (Mobile) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No transactions match your current filters.
            </p>
            {canCreate && (
              <button
                type="button"
                onClick={() => onOpenNew('expense')}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Log First Entry
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Data Grid */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/50">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Method & Sync</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {filtered.map((tx) => {
                    const editable = canModifyTx(tx);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          {tx.description}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {tx.category}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {tx.memberName}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {tx.paymentMethod} · {tx.sourceDevice.toUpperCase()}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                            tx.type === 'income'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount, currency)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {editable ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEdit(tx)}
                                aria-label={`Edit ${tx.description}`}
                                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === tx.id}
                                onClick={() => handleDelete(tx.id)}
                                aria-label={`Delete ${tx.description}`}
                                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Read-only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Rows */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((tx) => {
                const editable = canModifyTx(tx);
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.type === 'income'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
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
                          {tx.category} · {tx.memberName} · {formatShortDate(tx.date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono text-sm font-bold tabular-nums ${
                          tx.type === 'income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount, currency)}
                      </span>
                      {editable && (
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => onEdit(tx)}
                            aria-label="Edit transaction"
                            className="min-h-[44px] min-w-[40px] flex items-center justify-center text-slate-500"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === tx.id}
                            onClick={() => handleDelete(tx.id)}
                            aria-label="Delete transaction"
                            className="min-h-[44px] min-w-[40px] flex items-center justify-center text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
