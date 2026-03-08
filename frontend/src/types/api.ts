export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "brokerage"
  | "401k"
  | "ira"
  | "roth_ira"
  | "hsa"
  | "loan"
  | "mortgage"
  | "other";

export type PropertyType =
  | "residential_primary"
  | "residential_rental"
  | "commercial_retail"
  | "commercial_office"
  | "commercial_industrial"
  | "commercial_multifamily"
  | "commercial_mixed_use"
  | "land";

export type LeaseType =
  | "gross"
  | "modified_gross"
  | "net"
  | "nn"
  | "nnn"
  | "absolute_net"
  | "percentage";

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  institution_name: string | null;
  account_type: AccountType;
  balance: number;
  currency: string;
  is_liability: boolean;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  name: string;
  property_type: PropertyType;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  county: string | null;
  purchase_price: number;
  purchase_date: string;
  closing_costs: number;
  current_market_value: number | null;
  market_value_date: string | null;
  manual_value_override: boolean;
  square_feet: number | null;
  lot_size_sqft: number | null;
  year_built: number | null;
  units: number;
  description: string | null;
  lease_type: LeaseType | null;
  cap_rate: number | null;
  annual_property_tax: number;
  annual_insurance: number;
  annual_maintenance: number;
  annual_management_fee: number;
  annual_other_expenses: number;
  vacancy_rate: number;
  annual_gross_rent: number;
  annual_rent_escalation: number;
  rent_escalation_type: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  property_id: string;
  name: string;
  unit: string | null;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  annual_escalation: number;
  security_deposit: number;
  is_active: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface Mortgage {
  id: string;
  property_id: string;
  lender: string;
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number;
  loan_term_months: number;
  start_date: string;
  maturity_date: string;
  is_primary: boolean;
  loan_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  real_estate_value: number;
  real_estate_equity: number;
  cash_and_banking: number;
  investments: number;
  retirement: number;
  other_assets: number;
}

export interface ValuationResult {
  gross_rent: number;
  landlord_expenses: number;
  noi: number;
  cap_rate: number;
  estimated_value: number;
  price_per_sqft: number | null;
  equity: number;
  total_debt: number;
  cash_on_cash_return: number | null;
  dscr: number | null;
}

export interface ProjectionYear {
  year: number;
  gross_rent: number;
  noi: number;
  estimated_value: number;
  equity: number;
  mortgage_balance: number;
  cash_flow: number;
  cumulative_cash_flow: number;
}
