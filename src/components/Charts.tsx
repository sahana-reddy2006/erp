import { useState } from 'react';
import { formatCompactINR, formatCurrency } from '../lib/format';
import type { CategoryBreakdownItem, MonthlySeriesPoint } from '../types/erp';

const CHART_COLORS = [
  '#047857', // emerald-700
  '#0284c7', // sky-600
  '#d97706', // amber-600
  '#475569', // slate-600
  '#0d9488', // teal-600
  '#dc2626', // red-600
  '#6366f1', // indigo-500
  '#94a3b8', // slate-400
];

export function CashflowBarChart({ data }: { data: MonthlySeriesPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-60 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No cashflow records available for this period.
      </div>
    );
  }

  const maxVal = Math.max(
    10000,
    ...data.flatMap((d) => [d.income, d.expense])
  );
  const step = maxVal >= 100000 ? 100000 : 25000;
  const yCeiling = Math.ceil(maxVal / step) * step || maxVal * 1.15;

  const width = 640;
  const height = 240;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const groupW = plotW / data.length;
  const barW = Math.min(22, groupW * 0.28);

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700 dark:bg-emerald-500" />
            Income
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 dark:bg-slate-600" />
            Expenses
          </span>
        </div>
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300">
            {data[hoveredIdx].label}: +{formatCurrency(data[hoveredIdx].income)} / -{formatCurrency(data[hoveredIdx].expense)}
          </div>
        )}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Six month income and expense comparison chart"
        >
          {ticks.map((t) => {
            const y = padTop + plotH * (1 - t);
            const val = Math.round(yCeiling * t);
            return (
              <g key={t}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="1"
                  strokeDasharray={t === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                >
                  {formatCompactINR(val)}
                </text>
              </g>
            );
          })}

          {data.map((d, idx) => {
            const centerX = padLeft + groupW * idx + groupW / 2;
            const incH = (d.income / yCeiling) * plotH;
            const expH = (d.expense / yCeiling) * plotH;
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={d.month}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {isHovered && (
                  <rect
                    x={padLeft + groupW * idx + 4}
                    y={padTop}
                    width={groupW - 8}
                    height={plotH}
                    rx={6}
                    className="fill-slate-100/80 dark:fill-slate-800/50"
                  />
                )}
                <rect
                  x={centerX - barW - 2}
                  y={padTop + plotH - incH}
                  width={barW}
                  height={Math.max(2, incH)}
                  rx={4}
                  className="fill-emerald-700 dark:fill-emerald-500 transition-opacity"
                  opacity={hoveredIdx === null || isHovered ? 1 : 0.6}
                />
                <rect
                  x={centerX + 2}
                  y={padTop + plotH - expH}
                  width={barW}
                  height={Math.max(2, expH)}
                  rx={4}
                  className="fill-slate-400 dark:fill-slate-600 transition-opacity"
                  opacity={hoveredIdx === null || isHovered ? 1 : 0.6}
                />
                <text
                  x={centerX}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-slate-600 dark:fill-slate-400 text-[11px] font-medium"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function CategoryDonutChart({
  items,
  totalLabel = 'Total',
}: {
  items: CategoryBreakdownItem[];
  totalLabel?: string;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const total = items.reduce((s, i) => s + i.amount, 0);

  if (items.length === 0 || total === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        No expense categories recorded for this month.
      </div>
    );
  }

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const activeItem = items.find((i) => i.category === activeCategory);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          {items.map((item, idx) => {
            const fraction = item.amount / total;
            const dash = fraction * circumference;
            const currentOffset = offset;
            offset += dash;
            const color = CHART_COLORS[idx % CHART_COLORS.length];
            const isDimmed = activeCategory !== null && activeCategory !== item.category;

            return (
              <circle
                key={item.category}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth="16"
                strokeDasharray={`${Math.max(1, dash - 2)} ${circumference}`}
                strokeDashoffset={-currentOffset}
                opacity={isDimmed ? 0.3 : 1}
                onMouseEnter={() => setActiveCategory(item.category)}
                onMouseLeave={() => setActiveCategory(null)}
                className="cursor-pointer transition-opacity"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-full">
            {activeItem ? activeItem.category : totalLabel}
          </span>
          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
            {formatCurrency(activeItem ? activeItem.amount : total)}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {items.slice(0, 6).map((item, idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          return (
            <div
              key={item.category}
              onMouseEnter={() => setActiveCategory(item.category)}
              onMouseLeave={() => setActiveCategory(null)}
              className="flex items-center justify-between gap-3 text-sm cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-700 dark:text-slate-300 truncate">{item.category}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums text-xs">
                <span className="text-slate-500 dark:text-slate-400">{item.percentage}%</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 w-20 text-right">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProgressRing({
  percentage,
  size = 64,
  strokeWidth = 6,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="stroke-emerald-700 dark:stroke-emerald-500 transition-all duration-300"
        />
      </svg>
      <span className="absolute font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
