import { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { properties } from "../services/api";
import type {
  Property,
  Tenant,
  Mortgage,
  ValuationResult,
} from "../types/api";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showMortgageModal, setShowMortgageModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      properties.get(id).then(setProperty),
      properties.listTenants(id).then(setTenants),
      properties.listMortgages(id).then(setMortgages),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleValuate = async () => {
    if (!id) return;
    try {
      const result = await properties.valuate(id);
      setValuation(result);
      // Refresh property to get updated market value
      properties.get(id).then(setProperty);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <p className="text-muted">Loading...</p>;
  if (!property) return <p className="text-red">Property not found</p>;

  const isCommercial = property.property_type.startsWith("commercial_");
  const totalMortgageBalance = mortgages.reduce(
    (s, m) => s + m.current_balance,
    0
  );
  const equity =
    (property.current_market_value || property.purchase_price) -
    totalMortgageBalance;

  return (
    <div>
      <div className="flex-between page-header">
        <div>
          <button
            className="btn-secondary btn-sm"
            onClick={() => navigate("/properties")}
            style={{ marginBottom: 8 }}
          >
            Back to Properties
          </button>
          <h1>{property.name}</h1>
          <p>
            {property.address}, {property.city}, {property.state}{" "}
            {property.zip_code}
          </p>
        </div>
        {isCommercial && property.cap_rate && (
          <button className="btn-primary" onClick={handleValuate}>
            Run Valuation
          </button>
        )}
      </div>

      {/* Property Overview */}
      <div className="grid-4 mb-24">
        <div className="card">
          <div className="stat-label">Market Value</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {formatCurrency(
              property.current_market_value || property.purchase_price
            )}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Purchase Price</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {formatCurrency(property.purchase_price)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Total Debt</div>
          <div className="stat-value text-red" style={{ fontSize: 22 }}>
            {formatCurrency(totalMortgageBalance)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Equity</div>
          <div
            className="stat-value"
            style={{
              fontSize: 22,
              color: equity >= 0 ? "var(--green)" : "var(--red)",
            }}
          >
            {formatCurrency(equity)}
          </div>
        </div>
      </div>

      {/* Commercial Details */}
      {isCommercial && (
        <div className="card mb-24">
          <h3 style={{ marginBottom: 16 }}>Commercial Details</h3>
          <div className="grid-4">
            <div>
              <div className="stat-label">Lease Type</div>
              <div style={{ fontWeight: 600 }}>
                {property.lease_type?.toUpperCase() || "-"}
              </div>
            </div>
            <div>
              <div className="stat-label">Cap Rate</div>
              <div style={{ fontWeight: 600 }}>
                {property.cap_rate ? pct(property.cap_rate) : "-"}
              </div>
            </div>
            <div>
              <div className="stat-label">Annual Gross Rent</div>
              <div style={{ fontWeight: 600 }}>
                {formatCurrency(property.annual_gross_rent)}
              </div>
            </div>
            <div>
              <div className="stat-label">Vacancy Rate</div>
              <div style={{ fontWeight: 600 }}>{pct(property.vacancy_rate)}</div>
            </div>
          </div>
          <div className="grid-4 mt-8">
            <div>
              <div className="stat-label">Property Tax</div>
              <div>{formatCurrency(property.annual_property_tax)}</div>
            </div>
            <div>
              <div className="stat-label">Insurance</div>
              <div>{formatCurrency(property.annual_insurance)}</div>
            </div>
            <div>
              <div className="stat-label">Maintenance</div>
              <div>{formatCurrency(property.annual_maintenance)}</div>
            </div>
            <div>
              <div className="stat-label">Rent Escalation</div>
              <div>
                {pct(property.annual_rent_escalation)} /{" "}
                {property.rent_escalation_type}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Valuation Result */}
      {valuation && (
        <div className="card mb-24" style={{ borderColor: "var(--accent)" }}>
          <h3 style={{ marginBottom: 16 }}>Valuation Result</h3>
          <div className="grid-4">
            <div>
              <div className="stat-label">Estimated Value</div>
              <div className="stat-value" style={{ fontSize: 22 }}>
                {formatCurrency(valuation.estimated_value)}
              </div>
            </div>
            <div>
              <div className="stat-label">NOI</div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>
                {formatCurrency(valuation.noi)}
              </div>
            </div>
            <div>
              <div className="stat-label">Cash-on-Cash Return</div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>
                {valuation.cash_on_cash_return
                  ? pct(valuation.cash_on_cash_return)
                  : "N/A"}
              </div>
            </div>
            <div>
              <div className="stat-label">DSCR</div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>
                {valuation.dscr ? `${valuation.dscr}x` : "N/A"}
              </div>
            </div>
          </div>
          <div className="grid-3 mt-8">
            <div>
              <div className="stat-label">Landlord Expenses</div>
              <div>{formatCurrency(valuation.landlord_expenses)}</div>
            </div>
            <div>
              <div className="stat-label">Equity</div>
              <div>{formatCurrency(valuation.equity)}</div>
            </div>
            <div>
              <div className="stat-label">Price/SqFt</div>
              <div>
                {valuation.price_per_sqft
                  ? formatCurrency(valuation.price_per_sqft)
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenants */}
      <div className="card mb-24">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h3>Tenants ({tenants.length})</h3>
          <button
            className="btn-primary btn-sm"
            onClick={() => setShowTenantModal(true)}
          >
            Add Tenant
          </button>
        </div>
        {tenants.length === 0 ? (
          <p className="text-muted">No tenants</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Unit</th>
                <th>Lease Period</th>
                <th className="text-right">Monthly Rent</th>
                <th>Escalation</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td>{t.unit || "-"}</td>
                  <td className="text-muted" style={{ fontSize: 12 }}>
                    {t.lease_start} to {t.lease_end}
                  </td>
                  <td className="text-right" style={{ fontWeight: 600 }}>
                    {formatCurrency(t.monthly_rent)}
                  </td>
                  <td>{pct(t.annual_escalation)}</td>
                  <td>
                    <span
                      className={`badge ${
                        t.is_active ? "badge-green" : "badge-yellow"
                      }`}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-danger btn-sm"
                      onClick={async () => {
                        await properties.deleteTenant(property.id, t.id);
                        properties.listTenants(property.id).then(setTenants);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mortgages */}
      <div className="card mb-24">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h3>Mortgages ({mortgages.length})</h3>
          <button
            className="btn-primary btn-sm"
            onClick={() => setShowMortgageModal(true)}
          >
            Add Mortgage
          </button>
        </div>
        {mortgages.length === 0 ? (
          <p className="text-muted">No mortgages</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Lender</th>
                <th>Type</th>
                <th className="text-right">Original</th>
                <th className="text-right">Current Balance</th>
                <th>Rate</th>
                <th className="text-right">Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mortgages.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.lender}</td>
                  <td className="text-muted">{m.loan_type}</td>
                  <td className="text-right">
                    {formatCurrency(m.original_balance)}
                  </td>
                  <td className="text-right" style={{ fontWeight: 600 }}>
                    {formatCurrency(m.current_balance)}
                  </td>
                  <td>{pct(m.interest_rate)}</td>
                  <td className="text-right">
                    {formatCurrency(m.monthly_payment)}/mo
                  </td>
                  <td>
                    <button
                      className="btn-danger btn-sm"
                      onClick={async () => {
                        await properties.deleteMortgage(property.id, m.id);
                        properties
                          .listMortgages(property.id)
                          .then(setMortgages);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showTenantModal && (
        <AddTenantModal
          propertyId={property.id}
          onClose={() => setShowTenantModal(false)}
          onSaved={() => {
            setShowTenantModal(false);
            properties.listTenants(property.id).then(setTenants);
          }}
        />
      )}
      {showMortgageModal && (
        <AddMortgageModal
          propertyId={property.id}
          onClose={() => setShowMortgageModal(false)}
          onSaved={() => {
            setShowMortgageModal(false);
            properties.listMortgages(property.id).then(setMortgages);
          }}
        />
      )}
    </div>
  );
}

function AddTenantModal({
  propertyId,
  onClose,
  onSaved,
}: {
  propertyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    unit: "",
    lease_start: "",
    lease_end: "",
    monthly_rent: "",
    annual_escalation: "0.03",
    security_deposit: "0",
    contact_email: "",
    contact_phone: "",
  });
  const [error, setError] = useState("");

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await properties.createTenant(propertyId, {
        name: form.name,
        unit: form.unit || null,
        lease_start: form.lease_start,
        lease_end: form.lease_end,
        monthly_rent: parseFloat(form.monthly_rent) || 0,
        annual_escalation: parseFloat(form.annual_escalation) || 0.03,
        security_deposit: parseFloat(form.security_deposit) || 0,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Tenant</h2>
        {error && (
          <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Tenant Name</label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Unit/Suite</label>
              <input
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Lease Start</label>
              <input
                type="date"
                value={form.lease_start}
                onChange={(e) => update("lease_start", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Lease End</label>
              <input
                type="date"
                value={form.lease_end}
                onChange={(e) => update("lease_end", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid-3">
            <div className="form-group">
              <label>Monthly Rent</label>
              <input
                type="number"
                value={form.monthly_rent}
                onChange={(e) => update("monthly_rent", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Annual Escalation</label>
              <input
                type="number"
                step="0.01"
                value={form.annual_escalation}
                onChange={(e) => update("annual_escalation", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Security Deposit</label>
              <input
                type="number"
                value={form.security_deposit}
                onChange={(e) => update("security_deposit", e.target.value)}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => update("contact_email", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                value={form.contact_phone}
                onChange={(e) => update("contact_phone", e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-8" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary">Add Tenant</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMortgageModal({
  propertyId,
  onClose,
  onSaved,
}: {
  propertyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    lender: "",
    original_balance: "",
    current_balance: "",
    interest_rate: "",
    monthly_payment: "",
    loan_term_months: "360",
    start_date: "",
    maturity_date: "",
    loan_type: "fixed",
  });
  const [error, setError] = useState("");

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await properties.createMortgage(propertyId, {
        lender: form.lender,
        original_balance: parseFloat(form.original_balance) || 0,
        current_balance: parseFloat(form.current_balance) || 0,
        interest_rate: parseFloat(form.interest_rate) || 0,
        monthly_payment: parseFloat(form.monthly_payment) || 0,
        loan_term_months: parseInt(form.loan_term_months) || 360,
        start_date: form.start_date,
        maturity_date: form.maturity_date,
        loan_type: form.loan_type,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Mortgage</h2>
        {error && (
          <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Lender</label>
              <input
                value={form.lender}
                onChange={(e) => update("lender", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Loan Type</label>
              <select
                value={form.loan_type}
                onChange={(e) => update("loan_type", e.target.value)}
              >
                <option value="fixed">Fixed Rate</option>
                <option value="arm">Adjustable Rate (ARM)</option>
                <option value="interest_only">Interest Only</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Original Balance</label>
              <input
                type="number"
                value={form.original_balance}
                onChange={(e) => update("original_balance", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Current Balance</label>
              <input
                type="number"
                value={form.current_balance}
                onChange={(e) => update("current_balance", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid-3">
            <div className="form-group">
              <label>Interest Rate (decimal)</label>
              <input
                type="number"
                step="0.0001"
                value={form.interest_rate}
                onChange={(e) => update("interest_rate", e.target.value)}
                placeholder="e.g., 0.0725"
                required
              />
            </div>
            <div className="form-group">
              <label>Monthly Payment</label>
              <input
                type="number"
                value={form.monthly_payment}
                onChange={(e) => update("monthly_payment", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Term (months)</label>
              <input
                type="number"
                value={form.loan_term_months}
                onChange={(e) => update("loan_term_months", e.target.value)}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Maturity Date</label>
              <input
                type="date"
                value={form.maturity_date}
                onChange={(e) => update("maturity_date", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex gap-8" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary">Add Mortgage</button>
          </div>
        </form>
      </div>
    </div>
  );
}
