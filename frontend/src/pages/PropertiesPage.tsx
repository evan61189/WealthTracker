import { useState, useEffect, useRef, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { properties } from "../services/api";
import { parsePropertiesCSV, type ParsedProperty } from "../services/csvParser";
import type { Property, PropertyType, LeaseType } from "../types/api";

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "residential_primary", label: "Primary Residence" },
  { value: "residential_rental", label: "Residential Rental" },
  { value: "commercial_retail", label: "Commercial - Retail" },
  { value: "commercial_office", label: "Commercial - Office" },
  { value: "commercial_industrial", label: "Commercial - Industrial" },
  { value: "commercial_multifamily", label: "Commercial - Multifamily" },
  { value: "commercial_mixed_use", label: "Commercial - Mixed Use" },
  { value: "land", label: "Land" },
];

const LEASE_TYPES: { value: LeaseType; label: string }[] = [
  { value: "nnn", label: "Triple Net (NNN)" },
  { value: "nn", label: "Double Net (NN)" },
  { value: "net", label: "Net (N)" },
  { value: "modified_gross", label: "Modified Gross" },
  { value: "gross", label: "Gross" },
  { value: "absolute_net", label: "Absolute Net" },
  { value: "percentage", label: "Percentage" },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function isCommercial(type: PropertyType): boolean {
  return type.startsWith("commercial_");
}

export default function PropertiesPage() {
  const navigate = useNavigate();
  const [propertyList, setPropertyList] = useState<Property[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProperties = () => {
    properties
      .list()
      .then(setPropertyList)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(loadProperties, []);

  const totalValue = propertyList.reduce(
    (s, p) => s + (p.current_market_value || p.purchase_price),
    0
  );
  const totalRent = propertyList.reduce((s, p) => s + p.annual_gross_rent, 0);

  return (
    <div>
      <div className="flex-between page-header">
        <div>
          <h1>Real Estate</h1>
          <p>Manage your property portfolio</p>
        </div>
        <div className="flex gap-8">
          <button
            className="btn-secondary"
            onClick={() => setShowUpload(true)}
          >
            Upload CSV
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Add Property
          </button>
        </div>
      </div>

      <div className="grid-3 mb-24">
        <div className="card">
          <div className="stat-label">Portfolio Value</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {formatCurrency(totalValue)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Annual Gross Rent</div>
          <div className="stat-value text-green" style={{ fontSize: 22 }}>
            {formatCurrency(totalRent)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Properties</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {propertyList.length}
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : propertyList.length === 0 ? (
          <p className="text-muted">No properties yet. Add your first property.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Lease</th>
                <th className="text-right">Value</th>
                <th className="text-right">Annual Rent</th>
                <th className="text-right">Cap Rate</th>
                <th className="text-right">Ownership</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {propertyList.map((prop) => (
                <tr
                  key={prop.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/properties/${prop.id}`)}
                >
                  <td>
                    <div style={{ fontWeight: 500 }}>{prop.name}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {prop.city}, {prop.state}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        isCommercial(prop.property_type)
                          ? "badge-blue"
                          : "badge-green"
                      }`}
                    >
                      {PROPERTY_TYPES.find(
                        (t) => t.value === prop.property_type
                      )?.label || prop.property_type}
                    </span>
                  </td>
                  <td className="text-muted">
                    {prop.lease_type
                      ? LEASE_TYPES.find((l) => l.value === prop.lease_type)
                          ?.label || prop.lease_type
                      : "-"}
                  </td>
                  <td className="text-right" style={{ fontWeight: 600 }}>
                    {formatCurrency(
                      prop.current_market_value || prop.purchase_price
                    )}
                  </td>
                  <td className="text-right text-green">
                    {prop.annual_gross_rent
                      ? formatCurrency(prop.annual_gross_rent)
                      : "-"}
                  </td>
                  <td className="text-right">
                    {prop.cap_rate
                      ? `${(prop.cap_rate * 100).toFixed(1)}%`
                      : "-"}
                  </td>
                  <td className="text-right">
                    {prop.ownership_percentage != null &&
                    prop.ownership_percentage < 100
                      ? `${prop.ownership_percentage}%`
                      : "100%"}
                  </td>
                  <td>
                    <button
                      className="btn-danger btn-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await properties.delete(prop.id);
                        loadProperties();
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

      {showModal && (
        <AddPropertyModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadProperties();
          }}
        />
      )}

      {showUpload && (
        <UploadCSVModal
          onClose={() => setShowUpload(false)}
          onImported={() => {
            setShowUpload(false);
            loadProperties();
          }}
        />
      )}
    </div>
  );
}

function UploadCSVModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedProperty[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const results = parsePropertiesCSV(text);
        if (results.length === 0) {
          setError("No data rows found. Check that your CSV has headers and data.");
          return;
        }
        setParsed(results);
      } catch {
        setError("Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    setError("");
    setDone(0);
    const today = new Date().toISOString().split("T")[0];

    try {
      for (const row of parsed) {
        // Parse ownership percentage from the "% ownership & who" field
        let ownershipPct = 100;
        let ownershipNotes = row.ownership;
        const pctMatch = row.ownership.match(/([\d.]+)\s*%/);
        if (pctMatch) {
          ownershipPct = parseFloat(pctMatch[1]);
        }

        // Create property
        const prop = await properties.create({
          name: row.holdingCompany,
          property_type: "residential_rental",
          address: row.address,
          city: row.city || "-",
          state: row.state || "-",
          zip_code: row.zipCode || "-",
          purchase_price: row.value,
          purchase_date: today,
          current_market_value: row.value,
          ownership_percentage: ownershipPct,
          ownership_notes: ownershipNotes || null,
        });

        // Create mortgage if there's debt
        if (row.debtBalance > 0 || row.lender) {
          await properties.createMortgage(prop.id, {
            lender: row.lender || "Unknown",
            original_balance: row.debtBalance,
            current_balance: row.debtBalance,
            interest_rate: row.rate,
            monthly_payment: row.monthlyPayment,
            loan_term_months: 360, // default 30yr
            start_date: today,
            maturity_date: row.maturity || today,
            is_primary: true,
            loan_type: "fixed",
          });
        }

        setDone((d) => d + 1);
      }
      onImported();
    } catch (err: any) {
      setError(err.message);
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 900 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Upload Properties from CSV</h2>
        <p className="text-muted" style={{ marginBottom: 16, fontSize: 13 }}>
          Expected columns: Holding Company, Address, Value, Debt Balance,
          Monthly loan payment, Lender, Rate, Maturity, % ownership & who
        </p>

        {error && (
          <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {parsed.length === 0 ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              style={{ display: "none" }}
            />
            <button
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose CSV File
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 16, fontSize: 14 }}>
              <strong>{parsed.length}</strong> properties found.
              {importing && (
                <span className="text-muted">
                  {" "}
                  Importing... {done}/{parsed.length}
                </span>
              )}
            </div>

            <div style={{ overflowX: "auto", maxHeight: 400 }}>
              <table>
                <thead>
                  <tr>
                    <th>Holding Company</th>
                    <th>Address</th>
                    <th className="text-right">Value</th>
                    <th className="text-right">Debt</th>
                    <th className="text-right">Payment</th>
                    <th>Lender</th>
                    <th className="text-right">Rate</th>
                    <th>Maturity</th>
                    <th>Ownership</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{row.holdingCompany}</td>
                      <td className="text-muted" style={{ fontSize: 12 }}>
                        {row.address}
                        {row.city && `, ${row.city}`}
                        {row.state && `, ${row.state}`}
                      </td>
                      <td className="text-right">
                        {formatCurrency(row.value)}
                      </td>
                      <td className="text-right text-red">
                        {row.debtBalance
                          ? formatCurrency(row.debtBalance)
                          : "-"}
                      </td>
                      <td className="text-right">
                        {row.monthlyPayment
                          ? formatCurrency(row.monthlyPayment)
                          : "-"}
                      </td>
                      <td className="text-muted">{row.lender || "-"}</td>
                      <td className="text-right">
                        {row.rate
                          ? `${(row.rate * 100).toFixed(2)}%`
                          : "-"}
                      </td>
                      <td className="text-muted">{row.maturity || "-"}</td>
                      <td className="text-muted" style={{ fontSize: 12 }}>
                        {row.ownership || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="flex gap-8"
              style={{ justifyContent: "flex-end", marginTop: 16 }}
            >
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={importing}
              >
                {importing
                  ? `Importing ${done}/${parsed.length}...`
                  : `Import ${parsed.length} Properties`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddPropertyModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    property_type: "residential_rental" as PropertyType,
    address: "",
    city: "",
    state: "",
    zip_code: "",
    purchase_price: "",
    purchase_date: "",
    current_market_value: "",
    square_feet: "",
    units: "1",
    lease_type: "nnn" as LeaseType,
    cap_rate: "",
    annual_gross_rent: "",
    annual_property_tax: "",
    annual_insurance: "",
    annual_maintenance: "",
    vacancy_rate: "0.05",
    annual_rent_escalation: "0.03",
  });
  const [error, setError] = useState("");

  const showCommercial = isCommercial(form.property_type);

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await properties.create({
        name: form.name,
        property_type: form.property_type,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        purchase_price: parseFloat(form.purchase_price) || 0,
        purchase_date: form.purchase_date,
        current_market_value: form.current_market_value
          ? parseFloat(form.current_market_value)
          : null,
        square_feet: form.square_feet ? parseInt(form.square_feet) : null,
        units: parseInt(form.units) || 1,
        ...(showCommercial && {
          lease_type: form.lease_type,
          cap_rate: parseFloat(form.cap_rate) || 0,
          annual_gross_rent: parseFloat(form.annual_gross_rent) || 0,
          annual_property_tax: parseFloat(form.annual_property_tax) || 0,
          annual_insurance: parseFloat(form.annual_insurance) || 0,
          annual_maintenance: parseFloat(form.annual_maintenance) || 0,
          vacancy_rate: parseFloat(form.vacancy_rate) || 0.05,
          annual_rent_escalation:
            parseFloat(form.annual_rent_escalation) || 0.03,
        }),
      });
      onSaved();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 700 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Add Property</h2>
        {error && (
          <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Property Name</label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g., Oak Street Office"
                required
              />
            </div>
            <div className="form-group">
              <label>Property Type</label>
              <select
                value={form.property_type}
                onChange={(e) => update("property_type", e.target.value)}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              required
            />
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label>City</label>
              <input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>State</label>
              <input
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Zip</label>
              <input
                value={form.zip_code}
                onChange={(e) => update("zip_code", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label>Purchase Price</label>
              <input
                type="number"
                value={form.purchase_price}
                onChange={(e) => update("purchase_price", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Purchase Date</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => update("purchase_date", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Current Market Value</label>
              <input
                type="number"
                value={form.current_market_value}
                onChange={(e) =>
                  update("current_market_value", e.target.value)
                }
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Square Feet</label>
              <input
                type="number"
                value={form.square_feet}
                onChange={(e) => update("square_feet", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Units</label>
              <input
                type="number"
                value={form.units}
                onChange={(e) => update("units", e.target.value)}
              />
            </div>
          </div>

          {showCommercial && (
            <>
              <h3 style={{ margin: "24px 0 16px", fontSize: 16 }}>
                Commercial Details
              </h3>
              <div className="grid-3">
                <div className="form-group">
                  <label>Lease Type</label>
                  <select
                    value={form.lease_type}
                    onChange={(e) => update("lease_type", e.target.value)}
                  >
                    {LEASE_TYPES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cap Rate (%)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={form.cap_rate}
                    onChange={(e) => update("cap_rate", e.target.value)}
                    placeholder="e.g., 0.065 for 6.5%"
                  />
                </div>
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
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label>Annual Property Tax</label>
                  <input
                    type="number"
                    value={form.annual_property_tax}
                    onChange={(e) =>
                      update("annual_property_tax", e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Annual Insurance</label>
                  <input
                    type="number"
                    value={form.annual_insurance}
                    onChange={(e) =>
                      update("annual_insurance", e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Annual Maintenance</label>
                  <input
                    type="number"
                    value={form.annual_maintenance}
                    onChange={(e) =>
                      update("annual_maintenance", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Vacancy Rate (decimal)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.vacancy_rate}
                    onChange={(e) => update("vacancy_rate", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Annual Rent Escalation (decimal)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.annual_rent_escalation}
                    onChange={(e) =>
                      update("annual_rent_escalation", e.target.value)
                    }
                  />
                </div>
              </div>
            </>
          )}

          <div
            className="flex gap-8"
            style={{ justifyContent: "flex-end", marginTop: 16 }}
          >
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary">Add Property</button>
          </div>
        </form>
      </div>
    </div>
  );
}
