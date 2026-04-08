"use client";

import { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { startOfWeek, startOfMonth, subMonths, format, isAfter, isEqual } from "date-fns";
import { formatCents } from "@/lib/domain/splits";
import type { Purchase, Category } from "@prisma/client";

type PurchaseWithCategory = Purchase & { category: Category | null };
type Period = "week" | "month" | "6months" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  week: "This Week",
  month: "This Month",
  "6months": "Last 6 Months",
  all: "All Time",
};

// Fallback colors for categories without a color
const PALETTE = ["#7c3aed", "#3B82F6", "#10B981", "#F97316", "#F59E0B", "#06B6D4", "#EC4899", "#8B5CF6"];

function getCategoryColor(cat: Category | null, index: number): string {
  return cat?.color ?? PALETTE[index % PALETTE.length];
}

function filterByPeriod(purchases: PurchaseWithCategory[], period: Period): PurchaseWithCategory[] {
  const now = new Date();
  if (period === "all") return purchases;
  const cutoff =
    period === "week" ? startOfWeek(now, { weekStartsOn: 1 }) :
    period === "month" ? startOfMonth(now) :
    subMonths(now, 6);
  return purchases.filter((p) => isAfter(new Date(p.date), cutoff) || isEqual(new Date(p.date), cutoff));
}

function groupByCategory(purchases: PurchaseWithCategory[]) {
  const map = new Map<string, { name: string; total: number; color: string; icon: string }>();
  purchases.forEach((p) => {
    const key = p.category?.id ?? "uncategorized";
    const name = p.category?.name ?? "Uncategorized";
    const existing = map.get(key);
    if (existing) {
      existing.total += p.amount + p.tax + p.tip;
    } else {
      map.set(key, { name, total: p.amount + p.tax + p.tip, color: p.category?.color ?? "#94a3b8", icon: p.category?.icon ?? "🏷️" });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function buildBarData(purchases: PurchaseWithCategory[], period: Period) {
  if (period === "week") {
    // Group by day of week
    const days: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayKeys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    purchases.forEach((p) => {
      const key = format(new Date(p.date), "EEE");
      if (key in days) days[key] += p.amount + p.tax + p.tip;
    });
    return dayKeys.map((d) => ({ label: d, amount: days[d] }));
  }
  if (period === "month") {
    // Group by week of month
    const weeks: Record<string, number> = { "Wk 1": 0, "Wk 2": 0, "Wk 3": 0, "Wk 4": 0 };
    purchases.forEach((p) => {
      const day = new Date(p.date).getDate();
      const wk = day <= 7 ? "Wk 1" : day <= 14 ? "Wk 2" : day <= 21 ? "Wk 3" : "Wk 4";
      weeks[wk] += p.amount + p.tax + p.tip;
    });
    return Object.entries(weeks).map(([label, amount]) => ({ label, amount }));
  }
  // 6 months / all — group by month
  const monthMap = new Map<string, number>();
  purchases.forEach((p) => {
    const key = format(new Date(p.date), "MMM yy");
    monthMap.set(key, (monthMap.get(key) ?? 0) + p.amount + p.tax + p.tip);
  });
  return Array.from(monthMap.entries())
    .sort((a, b) => new Date("01 " + a[0]).getTime() - new Date("01 " + b[0]).getTime())
    .map(([label, amount]) => ({ label, amount }));
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-background border border-border rounded-xl px-3 py-2 text-sm shadow-lg">
        <p className="font-semibold">{payload[0].name}</p>
        <p className="text-primary">{formatCents(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-background border border-border rounded-xl px-3 py-2 text-sm shadow-lg">
        <p className="font-medium">{label}</p>
        <p className="text-primary">{formatCents(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function SummaryClient({ purchases }: { purchases: PurchaseWithCategory[] }) {
  const [period, setPeriod] = useState<Period>("month");

  const filtered = useMemo(() => filterByPeriod(purchases, period), [purchases, period]);
  const categoryData = useMemo(() => groupByCategory(filtered), [filtered]);
  const barData = useMemo(() => buildBarData(filtered, period), [filtered, period]);

  const total = filtered.reduce((s, p) => s + p.amount + p.tax + p.tip, 0);
  const avgPerPurchase = filtered.length > 0 ? Math.round(total / filtered.length) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 pt-12 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Summary</h1>
        {/* Period selector */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                period === p
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Spent</p>
            <p className="text-2xl font-bold mt-1">{formatCents(total)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Purchases</p>
            <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-medium">No purchases in this period</p>
            <p className="text-sm mt-1">Add some purchases to see your summary.</p>
          </div>
        ) : (
          <>
            {/* Pie chart — by category */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="font-semibold text-sm">Spending by Category</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="space-y-2">
                {categoryData.map((cat) => {
                  const pct = total > 0 ? Math.round((cat.total / total) * 100) : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium truncate">{cat.name}</span>
                          <span className="text-muted-foreground ml-2 shrink-0">{formatCents(cat.total)} · {pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bar chart — spending over time */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="font-semibold text-sm">
                {period === "week" ? "Daily Spending" : period === "month" ? "Weekly Spending" : "Monthly Spending"}
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="amount" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top merchants */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="font-semibold text-sm">Top Merchants</h2>
              {Object.entries(
                filtered.reduce((acc, p) => {
                  acc[p.merchant] = (acc[p.merchant] ?? 0) + p.amount + p.tax + p.tip;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([merchant, amount], i) => (
                  <div key={merchant} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {i + 1}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">{merchant}</span>
                    <span className="text-sm font-semibold">{formatCents(amount)}</span>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
