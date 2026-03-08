-- WealthTracker Database Schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard > SQL Editor)

-- ──── Tables ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  institution_name varchar(255),
  account_type varchar(15) NOT NULL,
  balance numeric(15,2) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  is_liability boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  balance numeric(15,2) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  property_type varchar(22) NOT NULL,
  address varchar(500) NOT NULL,
  city varchar(100) NOT NULL,
  state varchar(50) NOT NULL,
  zip_code varchar(20) NOT NULL,
  county varchar(100),
  purchase_price numeric(15,2) NOT NULL,
  purchase_date date NOT NULL,
  closing_costs numeric(15,2) NOT NULL DEFAULT 0,
  current_market_value numeric(15,2),
  market_value_date date,
  manual_value_override boolean NOT NULL DEFAULT false,
  square_feet integer,
  lot_size_sqft integer,
  year_built integer,
  units integer NOT NULL DEFAULT 1,
  description text,
  lease_type varchar(14),
  cap_rate numeric(5,3),
  annual_property_tax numeric(12,2) NOT NULL DEFAULT 0,
  annual_insurance numeric(12,2) NOT NULL DEFAULT 0,
  annual_maintenance numeric(12,2) NOT NULL DEFAULT 0,
  annual_management_fee numeric(12,2) NOT NULL DEFAULT 0,
  annual_other_expenses numeric(12,2) NOT NULL DEFAULT 0,
  vacancy_rate numeric(5,3) NOT NULL DEFAULT 0.05,
  annual_gross_rent numeric(12,2) NOT NULL DEFAULT 0,
  annual_rent_escalation numeric(5,3) NOT NULL DEFAULT 0.03,
  rent_escalation_type varchar(20) NOT NULL DEFAULT 'fixed',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  unit varchar(50),
  lease_start date NOT NULL,
  lease_end date NOT NULL,
  monthly_rent numeric(12,2) NOT NULL,
  annual_escalation numeric(5,3) NOT NULL DEFAULT 0.03,
  security_deposit numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  contact_email varchar(255),
  contact_phone varchar(50),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mortgages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lender varchar(255) NOT NULL,
  original_balance numeric(15,2) NOT NULL,
  current_balance numeric(15,2) NOT NULL,
  interest_rate numeric(6,4) NOT NULL,
  monthly_payment numeric(12,2) NOT NULL,
  loan_term_months integer NOT NULL,
  start_date date NOT NULL,
  maturity_date date NOT NULL,
  is_primary boolean NOT NULL DEFAULT true,
  loan_type varchar(50) NOT NULL DEFAULT 'fixed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  value numeric(15,2) NOT NULL,
  noi numeric(12,2),
  cap_rate_used numeric(5,3),
  valuation_method varchar(50) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- ──── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_snapshots_account_id ON account_snapshots(account_id);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_property_id ON mortgages(property_id);
CREATE INDEX IF NOT EXISTS idx_property_valuations_property_id ON property_valuations(property_id);

-- ──── Row Level Security (RLS) ──────────────────────────────────────────────

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgages ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_valuations ENABLE ROW LEVEL SECURITY;

-- Accounts: users can only access their own
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Account snapshots: access via account ownership
CREATE POLICY "Users can view own account snapshots" ON account_snapshots
  FOR SELECT USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own account snapshots" ON account_snapshots
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- Properties: users can only access their own
CREATE POLICY "Users can view own properties" ON properties
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own properties" ON properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own properties" ON properties
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own properties" ON properties
  FOR DELETE USING (auth.uid() = user_id);

-- Tenants: access via property ownership
CREATE POLICY "Users can view own tenants" ON tenants
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own tenants" ON tenants
  FOR INSERT WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own tenants" ON tenants
  FOR UPDATE USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own tenants" ON tenants
  FOR DELETE USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );

-- Mortgages: access via property ownership
CREATE POLICY "Users can view own mortgages" ON mortgages
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own mortgages" ON mortgages
  FOR INSERT WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own mortgages" ON mortgages
  FOR UPDATE USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own mortgages" ON mortgages
  FOR DELETE USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );

-- Property valuations: access via property ownership
CREATE POLICY "Users can view own valuations" ON property_valuations
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own valuations" ON property_valuations
  FOR INSERT WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
