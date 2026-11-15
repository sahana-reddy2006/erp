import { Download, Printer } from 'lucide-react';
import { formatCurrency, formatMonthLabel, getRecentMonths, getRoleLabel } from '../../lib/format';
import type { ReportSummary } from '../../types/erp';
import { CashflowBarChart, CategoryDonutChart } from '../Charts';

interface ReportsViewProps {
  month: string;
  onMonthChange: (month: string) => void;
  report: ReportSummary | null;
  currency: string;
}

export function ReportsView({ month, onMonthChange, report, currency }: ReportsViewProps) {
  const months = getRecentMonths(6);

  const exportExcelReport = () => {
    if (!report) return;
    const summaryRows = [
      ['KinLedger Family Finance ERP Statement', formatMonthLabel(month)],
      ['Total Monthly Income (INR)', `"${formatCurrency(report.totalIncome, currency)}"`],
      ['Total Monthly Expenses (INR)', `"${formatCurrency(report.totalExpense, currency)}"`],
      ['Net Cashflow (INR)', `"${formatCurrency(report.netBalance, currency)}"`],
      ['Savings Rate', `${report.savingsRate}%`],
      [],
      ['Member', 'Role', 'Relationship', 'Monthly Income (INR)', 'Monthly Expense (INR)', 'Monthly Allowance (INR)', 'Variance (INR)'],
      ...report.memberBreakdown.map((m) => {
        const variance = m.monthlyAllowance - m.expense;
        return [
          `"${m.name}"`,
          m.role,
          `"${m.relationship}"`,
          `"${formatCurrency(m.income, currency)}"`,
          `"${formatCurrency(m.expense, currency)}"`,
          `"${formatCurrency(m.monthlyAllowance, currency)}"`,
          `"${variance >= 0 ? '+' : ''}${formatCurrency(variance, currency)}"`,
        ];
      }),
    ];
    const csv = '\uFEFF' + summaryRows.map((l) => l.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinledger-report-inr-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Financial Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-member household cashflow, allocation, and allowance statements in INR (₹)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <select
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            aria-label="Select report month"
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-medium"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={exportExcelReport}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export Excel (₹)
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            Export PDF (₹)
          </button>
        </div>
      </div>

      {!report ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
          Loading financial analytics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            <section className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                6-Month Income & Expense Velocity
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Aggregated across all family members and linked devices
              </p>
              <CashflowBarChart data={report.monthlySeries} />
            </section>

            <section className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                {formatMonthLabel(month)} Expenses
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Category share of total outflow
              </p>
              <CategoryDonutChart items={report.expenseByCategory} totalLabel="Outflow" />
            </section>
          </div>

          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Member Financial Statement ({report.memberBreakdown.length} Members)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Individual monthly income, spending, and allowance utilization for {formatMonthLabel(month)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/50">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Role & Relationship</th>
                    <th className="py-3 px-4 text-right">Income</th>
                    <th className="py-3 px-4 text-right">Expenses</th>
                    <th className="py-3 px-4 text-right">Monthly Allowance</th>
                    <th className="py-3 px-4 text-right">Allowance Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {report.memberBreakdown.map((m) => {
                    const variance = m.monthlyAllowance - m.expense;
                    return (
                      <tr key={m.memberId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {m.name}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {getRoleLabel(m.role)} · {m.relationship}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(m.income, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(m.expense, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatCurrency(m.monthlyAllowance, currency)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                            variance < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {variance >= 0 ? '+' : ''}
                          {formatCurrency(variance, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
