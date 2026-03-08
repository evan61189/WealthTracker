import { useState, useEffect, FormEvent } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "../services/supabase";
import type { Account, Property, Mortgage } from "../types/api";

// ──── Types ─────────────────────────────────────────────────────────────────

interface Assumptions {
  years: number;
  appreciationRate: number; // annual RE appreciation, e.g. 0.03
  investmentReturnRate: number; // annual return on investment accounts
  monthlyContribution: number; // additional monthly investment contributions
  contributionGrowthRate: number; // annual increase in contributions, e.g. 0.03
  inflationRate: number; // for reference line
}

interface ProjectionRow {
  year: number;
  realEstateValue: number;
  mortgageBalance: number;
  realEstateEquity: number;
  investmentBalance: number;
  cashAndOther: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

// ──── Helpers ───────────────────────────────────────────────────────────────

const INVESTMENT_TYPES = ["brokerage", "401k", "ira", "roth_ira", "hsa"];
const LIABILITY_TYPES = ["credit_card", "loan", "mortgage"];
const CASH_TYPES = ["checking", "savings"];

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

// ──── Projection Engine ─────────────────────────────────────────────────────

interface PropertyWithMortgages {
  value: number;
  ownershipPct: number;
  mortgages: { balance: number; rate: number; monthlyPayment: number }[];
}

function runProjection(
  props: PropertyWithMortgages[],
  investmentBalance: number,
  cashAndOther: number,
  accountLiabilities: number,
  assumptions: Assumptions
): ProjectionRow[] {
  const rows: ProjectionRow[] = [];

  // Deep copy mutable state
  let properties = props.map((p) => ({
    value: p.value,
    ownershipPct: p.ownershipPct,
    mortgages: p.mortgages.map((m) => ({
      balance: m.balance,
      rate: m.rate,
      monthlyPayment: m.monthlyPayment,
    })),
  }));

  let invBal = investmentBalance;
  let contribution = assumptions.monthlyContribution;

  // Year 0 = current state
  const snap = () => {
    const reValue = properties.reduce(
      (s, p) => s + p.value * p.ownershipPct,
      0
    );
    const mtgBal = properties.reduce(
      (s, p) =>
        s +
        p.mortgages.reduce((ms, m) => ms + m.balance, 0) * p.ownershipPct,
      0
    );
    return {
      realEstateValue: reValue,
      mortgageBalance: mtgBal,
      realEstateEquity: reValue - mtgBal,
      investmentBalance: invBal,
      cashAndOther,
      totalAssets: reValue + invBal + cashAndOther,
      totalLiabilities: mtgBal + accountLiabilities,
      netWorth: reValue + invBal + cashAndOther - mtgBal - accountLiabilities,
    };
  };

  const y0 = snap();
  rows.push({ year: 0, ...y0 });

  for (let year = 1; year <= assumptions.years; year++) {
    // Appreciate properties
    for (const p of properties) {
      p.value *= 1 + assumptions.appreciationRate;
    }

    // Amortize mortgages (12 monthly payments)
    for (const p of properties) {
      for (const m of p.mortgages) {
        if (m.balance <= 0) continue;
        const monthlyRate = m.rate / 12;
        for (let mo = 0; mo < 12; mo++) {
          if (m.balance <= 0) break;
          const interest = m.balance * monthlyRate;
          const principal = Math.min(
            m.monthlyPayment - interest,
            m.balance
          );
          m.balance = Math.max(0, m.balance - principal);
        }
      }
    }

    // Grow investments: monthly compounding + monthly contributions
    const monthlyReturn = Math.pow(1 + assumptions.investmentReturnRate, 1 / 12) - 1;
    for (let mo = 0; mo < 12; mo++) {
      invBal *= 1 + monthlyReturn;
      invBal += contribution;
    }

    // Grow contributions for next year
    contribution *= 1 + assumptions.contributionGrowthRate;

    const s = snap();
    rows.push({ year, ...s });
  }

  return rows;
}

// ──── Component ─────────────────────────────────────────────────────────────

export default function ProjectionsPage() {
  const [loading, setLoading] = useState(true);
  const [projections, setProjections] = useState<ProjectionRow[]>([]);

  // Data from Supabase
  const [propData, setPropData] = useState<PropertyWithMortgages[]>([]);
  const [investmentBalance, setInvestmentBalance] = useState(0);
  const [cashAndOther, setCashAndOther] = useState(0);
  const [accountLiabilities, setAccountLiabilities] = useState(0);

  const [assumptions, setAssumptions] = useState<Assumptions>({
    years: 10,
    appreciationRate: 0.03,
    investmentReturnRate: 0.08,
    monthlyContribution: 1000,
    contributionGrowthRate: 0.03,
    inflationRate: 0.025,
  });

  // Load data
  useEffect(() => {
    async function load() {
      const [acctRes, propRes, mtgRes] = await Promise.all([
        supabase.from("accounts").select("*"),
        supabase.from("properties").select("*").eq("is_active", true),
        supabase.from("mortgages").select("*"),
      ]);

      const accts: Account[] = acctRes.data ?? [];
      const props: Property[] = propRes.data ?? [];
      const mtgs: Mortgage[] = mtgRes.data ?? [];

      // Group mortgages by property
      const mtgMap = new Map<string, Mortgage[]>();
      for (const m of mtgs) {
        const list = mtgMap.get(m.property_id) ?? [];
        list.push(m);
        mtgMap.set(m.property_id, list);
      }

      const propertyData: PropertyWithMortgages[] = props.map((p) => ({
        value: Number(p.current_market_value ?? p.purchase_price),
        ownershipPct: (p.ownership_percentage ?? 100) / 100,
        mortgages: (mtgMap.get(p.id) ?? []).map((m) => ({
          balance: Number(m.current_balance),
          rate: Number(m.interest_rate),
          monthlyPayment: Number(m.monthly_payment),
        })),
      }));

      const invBal = accts
        .filter((a) => INVESTMENT_TYPES.includes(a.account_type))
        .reduce((s, a) => s + Number(a.balance), 0);

      const cashOther = accts
        .filter(
          (a) =>
            CASH_TYPES.includes(a.account_type) ||
            (!INVESTMENT_TYPES.includes(a.account_type) &&
              !LIABILITY_TYPES.includes(a.account_type) &&
              a.account_type !== "other")
        )
        .reduce((s, a) => s + Number(a.balance), 0) +
        accts
          .filter((a) => a.account_type === "other" && !a.is_liability)
          .reduce((s, a) => s + Number(a.balance), 0);

      const acctLiab = accts
        .filter((a) => LIABILITY_TYPES.includes(a.account_type))
        .reduce((s, a) => s + Number(a.balance), 0);

      setPropData(propertyData);
      setInvestmentBalance(invBal);
      setCashAndOther(cashOther);
      setAccountLiabilities(acctLiab);
      setLoading(false);
    }
    load();
  }, []);

  // Recalculate when data or assumptions change
  useEffect(() => {
    if (loading) return;
    setProjections(
      runProjection(
        propData,
        investmentBalance,
        cashAndOther,
        accountLiabilities,
        assumptions
      )
    );
  }, [propData, investmentBalance, cashAndOther, accountLiabilities, assumptions, loading]);

  const update = (field: keyof Assumptions, value: string) => {
    setAssumptions((a) => ({ ...a, [field]: parseFloat(value) || 0 }));
  };

  if (loading) return <p className="text-muted">Loading...</p>;

  const lastRow = projections[projections.length - 1];
  const firstRow = projections[0];

  return (
    <div>
      <div className="page-header">
        <h1>Net Worth Projections</h1>
        <p>Model your wealth growth through time</p>
      </div>

      {/* Assumptions Panel */}
      <div className="card mb-24">
        <h3 style={{ marginBottom: 16 }}>Assumptions</h3>
        <div className="grid-3">
          <div className="form-group">
            <label>Projection Years</label>
            <input
              type="number"
              min="1"
              max="40"
              value={assumptions.years}
              onChange={(e) => update("years", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>RE Appreciation Rate</label>
            <input
              type="number"
              step="0.005"
              value={assumptions.appreciationRate}
              onChange={(e) => update("appreciationRate", e.target.value)}
            />
            <span className="text-muted" style={{ fontSize: 11 }}>
              {(assumptions.appreciationRate * 100).toFixed(1)}% / year
            </span>
          </div>
          <div className="form-group">
            <label>Investment Return Rate</label>
            <input
              type="number"
              step="0.005"
              value={assumptions.investmentReturnRate}
              onChange={(e) => update("investmentReturnRate", e.target.value)}
            />
            <span className="text-muted" style={{ fontSize: 11 }}>
              {(assumptions.investmentReturnRate * 100).toFixed(1)}% / year
            </span>
          </div>
        </div>
        <div className="grid-3">
          <div className="form-group">
            <label>Monthly Contribution</label>
            <input
              type="number"
              step="100"
              value={assumptions.monthlyContribution}
              onChange={(e) => update("monthlyContribution", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Contribution Growth Rate</label>
            <input
              type="number"
              step="0.005"
              value={assumptions.contributionGrowthRate}
              onChange={(e) => update("contributionGrowthRate", e.target.value)}
            />
            <span className="text-muted" style={{ fontSize: 11 }}>
              {(assumptions.contributionGrowthRate * 100).toFixed(1)}% / year
            </span>
          </div>
          <div className="form-group">
            <label>Inflation Rate (reference)</label>
            <input
              type="number"
              step="0.005"
              value={assumptions.inflationRate}
              onChange={(e) => update("inflationRate", e.target.value)}
            />
            <span className="text-muted" style={{ fontSize: 11 }}>
              {(assumptions.inflationRate * 100).toFixed(1)}% / year
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {lastRow && firstRow && (
        <div className="grid-4 mb-24">
          <div className="card">
            <div className="stat-label">Current Net Worth</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {formatCurrencyFull(firstRow.netWorth)}
            </div>
          </div>
          <div className="card">
            <div className="stat-label">
              Year {lastRow.year} Net Worth
            </div>
            <div
              className="stat-value"
              style={{ fontSize: 22, color: "var(--green)" }}
            >
              {formatCurrencyFull(lastRow.netWorth)}
            </div>
          </div>
          <div className="card">
            <div className="stat-label">Total Growth</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {formatCurrencyFull(lastRow.netWorth - firstRow.netWorth)}
            </div>
          </div>
          <div className="card">
            <div className="stat-label">
              Year {lastRow.year} RE Equity
            </div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {formatCurrencyFull(lastRow.realEstateEquity)}
            </div>
          </div>
        </div>
      )}

      {/* Net Worth Chart */}
      <div className="card mb-24">
        <h3 style={{ marginBottom: 16 }}>Net Worth Projection</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={projections}>
            <XAxis
              dataKey="year"
              stroke="var(--text-muted)"
              label={{ value: "Year", position: "bottom" }}
            />
            <YAxis
              stroke="var(--text-muted)"
              tickFormatter={(v) => formatCurrency(v)}
            />
            <Tooltip
              formatter={(value: number) => formatCurrencyFull(value)}
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="netWorth"
              name="Net Worth"
              stroke="#22c55e"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="realEstateEquity"
              name="RE Equity"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="investmentBalance"
              name="Investments"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="totalLiabilities"
              name="Total Debt"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              strokeDasharray="6 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Asset Breakdown Chart */}
      <div className="card mb-24">
        <h3 style={{ marginBottom: 16 }}>Asset Breakdown Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={projections}>
            <XAxis dataKey="year" stroke="var(--text-muted)" />
            <YAxis
              stroke="var(--text-muted)"
              tickFormatter={(v) => formatCurrency(v)}
            />
            <Tooltip
              formatter={(value: number) => formatCurrencyFull(value)}
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="realEstateValue"
              name="RE Value (your share)"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="mortgageBalance"
              name="Mortgage Debt"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="investmentBalance"
              name="Investments"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="cashAndOther"
              name="Cash & Other"
              stroke="#eab308"
              strokeWidth={1}
              dot={false}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Year-by-Year Table */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Year-by-Year Breakdown</h3>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th className="text-right">RE Value</th>
                <th className="text-right">Mortgage</th>
                <th className="text-right">RE Equity</th>
                <th className="text-right">Investments</th>
                <th className="text-right">Cash/Other</th>
                <th className="text-right">Net Worth</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((row) => (
                <tr
                  key={row.year}
                  style={row.year === 0 ? { fontWeight: 600 } : {}}
                >
                  <td>{row.year === 0 ? "Now" : row.year}</td>
                  <td className="text-right">
                    {formatCurrencyFull(row.realEstateValue)}
                  </td>
                  <td className="text-right text-red">
                    {formatCurrencyFull(row.mortgageBalance)}
                  </td>
                  <td className="text-right">
                    {formatCurrencyFull(row.realEstateEquity)}
                  </td>
                  <td className="text-right">
                    {formatCurrencyFull(row.investmentBalance)}
                  </td>
                  <td className="text-right text-muted">
                    {formatCurrencyFull(row.cashAndOther)}
                  </td>
                  <td
                    className="text-right"
                    style={{
                      fontWeight: 600,
                      color: row.netWorth >= 0 ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {formatCurrencyFull(row.netWorth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
