"""Pydantic schemas for API request/response validation."""

from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field

from app.models.account import AccountType
from app.models.property import PropertyType, LeaseType


# ──── Auth (Supabase handles registration/login) ─────────────────────────────


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ──── Accounts ────────────────────────────────────────────────────────────────


class AccountCreate(BaseModel):
    name: str
    institution_name: str | None = None
    account_type: AccountType
    balance: float = 0
    currency: str = "USD"
    is_liability: bool = False


class AccountUpdate(BaseModel):
    name: str | None = None
    institution_name: str | None = None
    account_type: AccountType | None = None
    balance: float | None = None
    is_liability: bool | None = None


class AccountResponse(BaseModel):
    id: str
    name: str
    institution_name: str | None
    account_type: AccountType
    balance: float
    currency: str
    is_liability: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AccountSnapshotResponse(BaseModel):
    id: str
    account_id: str
    balance: float
    recorded_at: datetime

    model_config = {"from_attributes": True}


# ──── Properties ──────────────────────────────────────────────────────────────


class PropertyCreate(BaseModel):
    name: str
    property_type: PropertyType
    address: str
    city: str
    state: str
    zip_code: str
    county: str | None = None
    purchase_price: float
    purchase_date: date
    closing_costs: float = 0
    current_market_value: float | None = None
    manual_value_override: bool = False
    square_feet: int | None = None
    lot_size_sqft: int | None = None
    year_built: int | None = None
    units: int = 1
    description: str | None = None

    # Commercial fields
    lease_type: LeaseType | None = None
    cap_rate: float | None = None
    annual_property_tax: float = 0
    annual_insurance: float = 0
    annual_maintenance: float = 0
    annual_management_fee: float = 0
    annual_other_expenses: float = 0
    vacancy_rate: float = 0.05
    annual_gross_rent: float = 0
    annual_rent_escalation: float = 0.03
    rent_escalation_type: str = "fixed"
    notes: str | None = None


class PropertyUpdate(BaseModel):
    name: str | None = None
    property_type: PropertyType | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    county: str | None = None
    current_market_value: float | None = None
    manual_value_override: bool | None = None
    square_feet: int | None = None
    lot_size_sqft: int | None = None
    year_built: int | None = None
    units: int | None = None
    description: str | None = None
    lease_type: LeaseType | None = None
    cap_rate: float | None = None
    annual_property_tax: float | None = None
    annual_insurance: float | None = None
    annual_maintenance: float | None = None
    annual_management_fee: float | None = None
    annual_other_expenses: float | None = None
    vacancy_rate: float | None = None
    annual_gross_rent: float | None = None
    annual_rent_escalation: float | None = None
    rent_escalation_type: str | None = None
    notes: str | None = None


class PropertyResponse(BaseModel):
    id: str
    name: str
    property_type: PropertyType
    address: str
    city: str
    state: str
    zip_code: str
    county: str | None
    purchase_price: float
    purchase_date: date
    closing_costs: float
    current_market_value: float | None
    market_value_date: date | None
    manual_value_override: bool
    square_feet: int | None
    lot_size_sqft: int | None
    year_built: int | None
    units: int
    description: str | None
    lease_type: LeaseType | None
    cap_rate: float | None
    annual_property_tax: float
    annual_insurance: float
    annual_maintenance: float
    annual_management_fee: float
    annual_other_expenses: float
    vacancy_rate: float
    annual_gross_rent: float
    annual_rent_escalation: float
    rent_escalation_type: str
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ──── Tenants ─────────────────────────────────────────────────────────────────


class TenantCreate(BaseModel):
    name: str
    unit: str | None = None
    lease_start: date
    lease_end: date
    monthly_rent: float
    annual_escalation: float = 0.03
    security_deposit: float = 0
    is_active: bool = True
    contact_email: str | None = None
    contact_phone: str | None = None
    notes: str | None = None


class TenantUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    lease_start: date | None = None
    lease_end: date | None = None
    monthly_rent: float | None = None
    annual_escalation: float | None = None
    security_deposit: float | None = None
    is_active: bool | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    notes: str | None = None


class TenantResponse(BaseModel):
    id: str
    property_id: str
    name: str
    unit: str | None
    lease_start: date
    lease_end: date
    monthly_rent: float
    annual_escalation: float
    security_deposit: float
    is_active: bool
    contact_email: str | None
    contact_phone: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ──── Mortgages ───────────────────────────────────────────────────────────────


class MortgageCreate(BaseModel):
    lender: str
    original_balance: float
    current_balance: float
    interest_rate: float
    monthly_payment: float
    loan_term_months: int
    start_date: date
    maturity_date: date
    is_primary: bool = True
    loan_type: str = "fixed"
    notes: str | None = None


class MortgageUpdate(BaseModel):
    lender: str | None = None
    current_balance: float | None = None
    interest_rate: float | None = None
    monthly_payment: float | None = None
    is_primary: bool | None = None
    loan_type: str | None = None
    notes: str | None = None


class MortgageResponse(BaseModel):
    id: str
    property_id: str
    lender: str
    original_balance: float
    current_balance: float
    interest_rate: float
    monthly_payment: float
    loan_term_months: int
    start_date: date
    maturity_date: date
    is_primary: bool
    loan_type: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ──── Valuation ───────────────────────────────────────────────────────────────


class ValuationRequest(BaseModel):
    """Request to calculate commercial property valuation."""

    annual_gross_rent: float
    lease_type: str  # gross, modified_gross, net, nn, nnn, absolute_net
    cap_rate: float = Field(gt=0, lt=1)
    vacancy_rate: float = Field(ge=0, lt=1, default=0.05)
    property_tax: float = 0
    insurance: float = 0
    maintenance: float = 0
    management_fee: float = 0
    other_expenses: float = 0
    square_feet: int | None = None
    total_debt: float = 0
    annual_debt_service: float = 0
    total_cash_invested: float = 0


class ValuationResponse(BaseModel):
    gross_rent: float
    landlord_expenses: float
    noi: float
    cap_rate: float
    estimated_value: float
    price_per_sqft: float | None
    equity: float
    total_debt: float
    cash_on_cash_return: float | None
    dscr: float | None


class ProjectionRequest(BaseModel):
    annual_gross_rent: float
    lease_type: str
    cap_rate: float = Field(gt=0, lt=1)
    vacancy_rate: float = Field(ge=0, lt=1, default=0.05)
    property_tax: float = 0
    insurance: float = 0
    maintenance: float = 0
    management_fee: float = 0
    other_expenses: float = 0
    annual_rent_escalation: float = 0.03
    escalation_type: str = "fixed"
    cpi_rate: float = 0.025
    mortgage_balance: float = 0
    monthly_mortgage_payment: float = 0
    mortgage_interest_rate: float = 0
    projection_years: int = Field(default=10, ge=1, le=30)
    expense_growth_rate: float = 0.02


class ProjectionYearResponse(BaseModel):
    year: int
    gross_rent: float
    noi: float
    estimated_value: float
    equity: float
    mortgage_balance: float
    cash_flow: float
    cumulative_cash_flow: float


# ──── Dashboard ───────────────────────────────────────────────────────────────


class NetWorthSummary(BaseModel):
    total_assets: float
    total_liabilities: float
    net_worth: float
    real_estate_value: float
    real_estate_equity: float
    cash_and_banking: float
    investments: float
    retirement: float
    other_assets: float


