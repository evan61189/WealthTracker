import { useState, useEffect, FormEvent } from "react";
import { accounts } from "../services/api";
import type { Account, AccountType } from "../types/api";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "brokerage", label: "Brokerage" },
  { value: "401k", label: "401(k)" },
  { value: "ira", label: "IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "hsa", label: "HSA" },
  { value: "loan", label: "Loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "other", label: "Other" },
];

const LIABILITY_TYPES: AccountType[] = ["credit_card", "loan", "mortgage"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AccountsPage() {
  const [accountList, setAccountList] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAccounts = () => {
    accounts
      .list()
      .then(setAccountList)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(loadAccounts, []);

  const totalAssets = accountList
    .filter((a) => !a.is_liability)
    .reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accountList
    .filter((a) => a.is_liability)
    .reduce((s, a) => s + a.balance, 0);

  return (
    <div>
      <div className="flex-between page-header">
        <div>
          <h1>Accounts</h1>
          <p>Manage your financial accounts</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          Add Account
        </button>
      </div>

      <div className="grid-3 mb-24">
        <div className="card">
          <div className="stat-label">Total Assets</div>
          <div className="stat-value text-green" style={{ fontSize: 22 }}>
            {formatCurrency(totalAssets)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Total Liabilities</div>
          <div className="stat-value text-red" style={{ fontSize: 22 }}>
            {formatCurrency(totalLiabilities)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Net</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {formatCurrency(totalAssets - totalLiabilities)}
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : accountList.length === 0 ? (
          <p className="text-muted">
            No accounts yet. Add one or connect via Plaid.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Institution</th>
                <th>Type</th>
                <th className="text-right">Balance</th>
                <th>Synced</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accountList.map((acct) => (
                <tr key={acct.id}>
                  <td style={{ fontWeight: 500 }}>{acct.name}</td>
                  <td className="text-muted">
                    {acct.institution_name || "-"}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        acct.is_liability ? "badge-yellow" : "badge-green"
                      }`}
                    >
                      {formatType(acct.account_type)}
                    </span>
                  </td>
                  <td
                    className={`text-right ${
                      acct.is_liability ? "text-red" : ""
                    }`}
                    style={{ fontWeight: 600 }}
                  >
                    {acct.is_liability ? "-" : ""}
                    {formatCurrency(acct.balance)}
                  </td>
                  <td className="text-muted" style={{ fontSize: 12 }}>
                    {acct.plaid_account_id ? "Plaid" : "Manual"}
                  </td>
                  <td>
                    <button
                      className="btn-danger btn-sm"
                      onClick={async () => {
                        await accounts.delete(acct.id);
                        loadAccounts();
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
        <AddAccountModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadAccounts();
          }}
        />
      )}
    </div>
  );
}

function AddAccountModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await accounts.create({
        name,
        institution_name: institution || null,
        account_type: accountType,
        balance: parseFloat(balance) || 0,
        is_liability: LIABILITY_TYPES.includes(accountType),
      });
      onSaved();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Account</h2>
        {error && (
          <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Account Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Chase Checking"
              required
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Institution</label>
              <input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g., Chase"
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={accountType}
                onChange={(e) =>
                  setAccountType(e.target.value as AccountType)
                }
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Current Balance</label>
            <input
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-8" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary">Add Account</button>
          </div>
        </form>
      </div>
    </div>
  );
}
