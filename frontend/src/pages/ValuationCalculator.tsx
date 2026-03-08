import { useState, FormEvent } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { valuation } from "../services/api";
import type { ValuationResult, ProjectionYear } from "../types/api";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export default function ValuationCalculator() {
  const [form, setForm] = useState({
    annual_gross_rent: "120000",
    lease_type: "nnn",
    cap_rate: "0.065",
    vacancy_rate: "0.05",
    property_tax: "15000",
    insurance: "5000",
    maintenance: "8000",
    management_fee: "3000",
    other_expenses: "2000",
    square_feet: "10000",
    total_debt: "1200000",
    annual_debt_service: "96000",
    total_cash_invested: "400000",
    annual_rent_escalation: "0.03",
    escalation_type: "fixed",
    mortgage_balance: "1200000",
    monthly_mortgage_payment: "8000",
    mortgage_interest_rate: "0.065",
    projection_years: "10",
  });

  const [result, setResult] = useState<ValuationResult | null>(null);
  const [projections, setProjections] = useState<ProjectionYear[]>([]);
  const [activeTab, setActiveTab] = useState<"valuation" | "projection">(
    "valuation"
  );

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleCalculate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await valuation.calculate({
        annual_gross_rent: parseFloat(form.annual_gross_rent),
        lease_type: form.lease_type,
        cap_rate: parseFloat(form.cap_rate),
        vacancy_rate: parseFloat(form.vacancy_rate),
        property_tax: parseFloat(form.property_tax),
        insurance: parseFloat(form.insurance),
        maintenance: parseFloat(form.maintenance),
        management_fee: parseFloat(form.management_fee),
        other_expenses: parseFloat(form.other_expenses),
        square_feet: parseInt(form.square_feet) || null,
        total_debt: parseFloat(form.total_debt),
        annual_debt_service: parseFloat(form.annual_debt_service),
        total_cash_invested: parseFloat(form.total_cash_invested),
      });
      setResult(res);

      const proj = await valuation.project({
        annual_gross_rent: parseFloat(form.annual_gross_rent),
        lease_type: form.lease_type,
        cap_rate: parseFloat(form.cap_rate),
        vacancy_rate: parseFloat(form.vacancy_rate),
        property_tax: parseFloat(form.property_tax),
        insurance: parseFloat(form.insurance),
        maintenance: parseFloat(form.maintenance),
        management_fee: parseFloat(form.management_fee),
        other_expenses: parseFloat(form.other_expenses),
        annual_rent_escalation: parseFloat(form.annual_rent_escalation),
        escalation_type: form.escalation_type,
        mortgage_balance: parseFloat(form.mortgage_balance),
        monthly_mortgage_payment: parseFloat(form.monthly_mortgage_payment),
        mortgage_interest_rate: parseFloat(form.mortgage_interest_rate),
        projection_years: parseInt(form.projection_years),
      });
      setProjections(proj);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Valuation Calculator</h1>
        <p>Commercial real estate valuation using income capitalization</p>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {/* Input Form */}
        <div style={{ width: 400, flexShrink: 0 }}>
          <form className="card" onSubmit={handleCalculate}>
            <h3 style={{ marginBottom: 16 }}>Property Inputs</h3>

            <div className="form-group">
              <label>Lease Type</label>
              <select
                value={form.lease_type}
                onChange={(e) => update("lease_type", e.target.value)}
              >
                <option value="nnn">Triple Net (NNN)</option>
                <option value="nn">Double Net (NN)</option>
                <option value="net">Net (N)</option>
                <option value="modified_gross">Modified Gross</option>
                <option value="gross">Gross</option>
                <option value="absolute_net">Absolute Net</option>
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Annual Gross Rent</label>
                <input
                  type="number"
                  value={form.annual_gross_rent}
                  onChange={(e) =>
                    update("annual_gross_rent", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Cap Rate</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.cap_rate}
                  onChange={(e) => update("cap_rate", e.target.value)}
                />
              </div>
            </div>

            <h4
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: "16px 0 8px",
              }}
            >
              Operating Expenses
            </h4>
            <div className="grid-2">
              <div className="form-group">
                <label>Property Tax</label>
                <input
                  type="number"
                  value={form.property_tax}
                  onChange={(e) => update("property_tax", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Insurance</label>
                <input
                  type="number"
                  value={form.insurance}
                  onChange={(e) => update("insurance", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Maintenance</label>
                <input
                  type="number"
                  value={form.maintenance}
                  onChange={(e) => update("maintenance", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Management Fee</label>
                <input
                  type="number"
                  value={form.management_fee}
                  onChange={(e) => update("management_fee", e.target.value)}
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Vacancy Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.vacancy_rate}
                  onChange={(e) => update("vacancy_rate", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Sq Ft</label>
                <input
                  type="number"
                  value={form.square_feet}
                  onChange={(e) => update("square_feet", e.target.value)}
                />
              </div>
            </div>

            <h4
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: "16px 0 8px",
              }}
            >
              Financing
            </h4>
            <div className="grid-2">
              <div className="form-group">
                <label>Total Debt</label>
                <input
                  type="number"
                  value={form.total_debt}
                  onChange={(e) => update("total_debt", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Annual Debt Service</label>
                <input
                  type="number"
                  value={form.annual_debt_service}
                  onChange={(e) =>
                    update("annual_debt_service", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Cash Invested</label>
                <input
                  type="number"
                  value={form.total_cash_invested}
                  onChange={(e) =>
                    update("total_cash_invested", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Mortgage Rate</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.mortgage_interest_rate}
                  onChange={(e) =>
                    update("mortgage_interest_rate", e.target.value)
                  }
                />
              </div>
            </div>

            <h4
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: "16px 0 8px",
              }}
            >
              Projections
            </h4>
            <div className="grid-2">
              <div className="form-group">
                <label>Rent Escalation</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.annual_rent_escalation}
                  onChange={(e) =>
                    update("annual_rent_escalation", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Years</label>
                <input
                  type="number"
                  value={form.projection_years}
                  onChange={(e) =>
                    update("projection_years", e.target.value)
                  }
                />
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: 8 }}
            >
              Calculate
            </button>
          </form>
        </div>

        {/* Results */}
        <div style={{ flex: 1 }}>
          {result && (
            <>
              {/* Tabs */}
              <div className="flex gap-8 mb-16">
                <button
                  className={
                    activeTab === "valuation"
                      ? "btn-primary btn-sm"
                      : "btn-secondary btn-sm"
                  }
                  onClick={() => setActiveTab("valuation")}
                >
                  Valuation
                </button>
                <button
                  className={
                    activeTab === "projection"
                      ? "btn-primary btn-sm"
                      : "btn-secondary btn-sm"
                  }
                  onClick={() => setActiveTab("projection")}
                >
                  Projections
                </button>
              </div>

              {activeTab === "valuation" && (
                <div>
                  <div className="grid-3 mb-24">
                    <div className="card">
                      <div className="stat-label">Estimated Value</div>
                      <div
                        className="stat-value"
                        style={{ fontSize: 24, color: "var(--accent)" }}
                      >
                        {formatCurrency(result.estimated_value)}
                      </div>
                    </div>
                    <div className="card">
                      <div className="stat-label">NOI</div>
                      <div
                        className="stat-value text-green"
                        style={{ fontSize: 24 }}
                      >
                        {formatCurrency(result.noi)}
                      </div>
                    </div>
                    <div className="card">
                      <div className="stat-label">Equity</div>
                      <div className="stat-value" style={{ fontSize: 24 }}>
                        {formatCurrency(result.equity)}
                      </div>
                    </div>
                  </div>

                  <div className="card mb-24">
                    <h3 style={{ marginBottom: 16 }}>Income Analysis</h3>
                    <table>
                      <tbody>
                        <tr>
                          <td>Gross Rent</td>
                          <td className="text-right">
                            {formatCurrency(result.gross_rent)}
                          </td>
                        </tr>
                        <tr>
                          <td>Landlord Operating Expenses</td>
                          <td className="text-right text-red">
                            -{formatCurrency(result.landlord_expenses)}
                          </td>
                        </tr>
                        <tr style={{ fontWeight: 700 }}>
                          <td>Net Operating Income (NOI)</td>
                          <td className="text-right text-green">
                            {formatCurrency(result.noi)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="card">
                    <h3 style={{ marginBottom: 16 }}>Key Metrics</h3>
                    <div className="grid-2">
                      <div>
                        <div className="stat-label">Cap Rate</div>
                        <div style={{ fontWeight: 600 }}>
                          {pct(result.cap_rate)}
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Price per Sq Ft</div>
                        <div style={{ fontWeight: 600 }}>
                          {result.price_per_sqft
                            ? formatCurrency(result.price_per_sqft)
                            : "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Cash-on-Cash Return</div>
                        <div style={{ fontWeight: 600 }}>
                          {result.cash_on_cash_return
                            ? pct(result.cash_on_cash_return)
                            : "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">DSCR</div>
                        <div style={{ fontWeight: 600 }}>
                          {result.dscr ? `${result.dscr}x` : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "projection" && projections.length > 0 && (
                <div>
                  <div className="card mb-24">
                    <h3 style={{ marginBottom: 16 }}>
                      Value & Equity Projection
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={projections}>
                        <XAxis
                          dataKey="year"
                          stroke="var(--text-muted)"
                          label={{
                            value: "Year",
                            position: "bottom",
                          }}
                        />
                        <YAxis
                          stroke="var(--text-muted)"
                          tickFormatter={(v) =>
                            `$${(v / 1000000).toFixed(1)}M`
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="estimated_value"
                          name="Property Value"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="equity"
                          name="Equity"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="mortgage_balance"
                          name="Mortgage"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card mb-24">
                    <h3 style={{ marginBottom: 16 }}>
                      Cash Flow Projection
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={projections}>
                        <XAxis dataKey="year" stroke="var(--text-muted)" />
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
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="cash_flow"
                          name="Annual Cash Flow"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="cumulative_cash_flow"
                          name="Cumulative"
                          stroke="#eab308"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card">
                    <h3 style={{ marginBottom: 16 }}>Year-by-Year</h3>
                    <div style={{ overflowX: "auto" }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Year</th>
                            <th className="text-right">Gross Rent</th>
                            <th className="text-right">NOI</th>
                            <th className="text-right">Value</th>
                            <th className="text-right">Mortgage</th>
                            <th className="text-right">Equity</th>
                            <th className="text-right">Cash Flow</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projections.map((p) => (
                            <tr key={p.year}>
                              <td>{p.year}</td>
                              <td className="text-right">
                                {formatCurrency(p.gross_rent)}
                              </td>
                              <td className="text-right text-green">
                                {formatCurrency(p.noi)}
                              </td>
                              <td className="text-right">
                                {formatCurrency(p.estimated_value)}
                              </td>
                              <td className="text-right text-red">
                                {formatCurrency(p.mortgage_balance)}
                              </td>
                              <td className="text-right">
                                {formatCurrency(p.equity)}
                              </td>
                              <td className="text-right">
                                {formatCurrency(p.cash_flow)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!result && (
            <div
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 400,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <h3 className="text-muted">Enter property details</h3>
                <p className="text-muted" style={{ marginTop: 8 }}>
                  Adjust inputs and click Calculate to see valuation results
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
