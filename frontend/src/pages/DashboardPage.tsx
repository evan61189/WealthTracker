import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { dashboard } from "../services/api";
import type { NetWorthSummary } from "../types/api";

const COLORS = ["#6366f1", "#22c55e", "#3b82f6", "#eab308", "#ef4444"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const [data, setData] = useState<NetWorthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboard
      .netWorth()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading...</p>;

  if (!data)
    return (
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Add accounts and properties to see your net worth.</p>
      </div>
    );

  const allocationData = [
    { name: "Real Estate Equity", value: data.real_estate_equity },
    { name: "Cash & Banking", value: data.cash_and_banking },
    { name: "Investments", value: data.investments },
    { name: "Retirement", value: data.retirement },
    { name: "Other", value: data.other_assets },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: "Assets", value: data.total_assets },
    { name: "Liabilities", value: data.total_liabilities },
    { name: "Net Worth", value: data.net_worth },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your complete financial picture</p>
      </div>

      {/* Net Worth Cards */}
      <div className="grid-3 mb-24">
        <div className="card">
          <div className="stat-label">Net Worth</div>
          <div
            className="stat-value"
            style={{ color: data.net_worth >= 0 ? "var(--green)" : "var(--red)" }}
          >
            {formatCurrency(data.net_worth)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Total Assets</div>
          <div className="stat-value">{formatCurrency(data.total_assets)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Total Liabilities</div>
          <div className="stat-value text-red">
            {formatCurrency(data.total_liabilities)}
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid-4 mb-24">
        <div className="card">
          <div className="stat-label">Real Estate Equity</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {formatCurrency(data.real_estate_equity)}
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
            Value: {formatCurrency(data.real_estate_value)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Cash & Banking</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {formatCurrency(data.cash_and_banking)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Investments</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {formatCurrency(data.investments)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Retirement</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {formatCurrency(data.retirement)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Asset Allocation</h3>
          {allocationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted">No assets to display</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Assets vs Liabilities</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis
                stroke="var(--text-muted)"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.name === "Liabilities"
                        ? "var(--red)"
                        : entry.name === "Net Worth"
                        ? "var(--green)"
                        : "var(--accent)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
