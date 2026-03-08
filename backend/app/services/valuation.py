"""Real estate valuation engine.

Supports commercial property valuation based on:
- Cap rate methodology (NOI / Cap Rate = Value)
- Lease type adjustments (NNN, NN, Gross, Modified Gross)
- Rent escalation projections (fixed % or CPI-based)
- Cash flow analysis and equity tracking
"""

from dataclasses import dataclass
from datetime import date
from enum import Enum


class LeaseExpenseProfile(str, Enum):
    """Defines which expenses the landlord is responsible for by lease type."""

    GROSS = "gross"
    MODIFIED_GROSS = "modified_gross"
    NET = "net"
    DOUBLE_NET = "nn"
    TRIPLE_NET = "nnn"
    ABSOLUTE_NET = "absolute_net"


@dataclass
class OperatingExpenses:
    property_tax: float = 0
    insurance: float = 0
    maintenance: float = 0
    management_fee: float = 0
    other: float = 0

    @property
    def total(self) -> float:
        return (
            self.property_tax
            + self.insurance
            + self.maintenance
            + self.management_fee
            + self.other
        )


@dataclass
class ValuationResult:
    gross_rent: float
    landlord_expenses: float
    noi: float
    cap_rate: float
    estimated_value: float
    price_per_sqft: float | None
    equity: float
    total_debt: float
    cash_on_cash_return: float | None
    dscr: float | None  # Debt Service Coverage Ratio


@dataclass
class ProjectionYear:
    year: int
    gross_rent: float
    noi: float
    estimated_value: float
    equity: float
    mortgage_balance: float
    cash_flow: float  # NOI minus debt service
    cumulative_cash_flow: float


def calculate_landlord_expenses(
    lease_type: str,
    expenses: OperatingExpenses,
) -> float:
    """Calculate the operating expenses the landlord is responsible for based on lease type.

    Lease type expense responsibility:
    - Gross: Landlord pays ALL operating expenses
    - Modified Gross: Landlord pays taxes + insurance; tenant pays maintenance
    - Net (N): Landlord pays insurance + maintenance; tenant pays taxes
    - Double Net (NN): Landlord pays maintenance only; tenant pays taxes + insurance
    - Triple Net (NNN): Tenant pays taxes + insurance + maintenance
    - Absolute Net: Tenant pays EVERYTHING (even structural repairs)

    Management fees and other expenses are always the landlord's responsibility
    (except in absolute net leases).
    """
    match lease_type:
        case "gross":
            return expenses.total
        case "modified_gross":
            return (
                expenses.property_tax
                + expenses.insurance
                + expenses.management_fee
                + expenses.other
            )
        case "net":
            return (
                expenses.insurance
                + expenses.maintenance
                + expenses.management_fee
                + expenses.other
            )
        case "nn":
            return (
                expenses.maintenance + expenses.management_fee + expenses.other
            )
        case "nnn":
            return expenses.management_fee + expenses.other
        case "absolute_net":
            return 0
        case _:
            # Default to gross (most conservative)
            return expenses.total


def calculate_noi(
    annual_gross_rent: float,
    lease_type: str,
    expenses: OperatingExpenses,
    vacancy_rate: float = 0.05,
) -> float:
    """Calculate Net Operating Income.

    NOI = Effective Gross Income - Landlord Operating Expenses
    Effective Gross Income = Gross Rent * (1 - Vacancy Rate)
    """
    effective_gross_income = annual_gross_rent * (1 - vacancy_rate)
    landlord_expenses = calculate_landlord_expenses(lease_type, expenses)
    return effective_gross_income - landlord_expenses


def calculate_property_value(noi: float, cap_rate: float) -> float:
    """Calculate property value using income capitalization approach.

    Value = NOI / Cap Rate
    """
    if cap_rate <= 0:
        raise ValueError("Cap rate must be positive")
    return noi / cap_rate


def calculate_valuation(
    annual_gross_rent: float,
    lease_type: str,
    expenses: OperatingExpenses,
    cap_rate: float,
    vacancy_rate: float = 0.05,
    square_feet: int | None = None,
    total_debt: float = 0,
    annual_debt_service: float = 0,
    total_cash_invested: float = 0,
) -> ValuationResult:
    """Full property valuation calculation."""
    landlord_expenses = calculate_landlord_expenses(lease_type, expenses)
    noi = calculate_noi(annual_gross_rent, lease_type, expenses, vacancy_rate)
    estimated_value = calculate_property_value(noi, cap_rate)
    equity = estimated_value - total_debt

    price_per_sqft = estimated_value / square_feet if square_feet else None

    # Cash-on-Cash Return = Annual Pre-Tax Cash Flow / Total Cash Invested
    annual_cash_flow = noi - annual_debt_service
    cash_on_cash = (
        annual_cash_flow / total_cash_invested if total_cash_invested > 0 else None
    )

    # DSCR = NOI / Annual Debt Service
    dscr = noi / annual_debt_service if annual_debt_service > 0 else None

    return ValuationResult(
        gross_rent=annual_gross_rent,
        landlord_expenses=landlord_expenses,
        noi=noi,
        cap_rate=cap_rate,
        estimated_value=round(estimated_value, 2),
        price_per_sqft=round(price_per_sqft, 2) if price_per_sqft else None,
        equity=round(equity, 2),
        total_debt=total_debt,
        cash_on_cash_return=round(cash_on_cash, 4) if cash_on_cash else None,
        dscr=round(dscr, 2) if dscr else None,
    )


def project_future_values(
    annual_gross_rent: float,
    lease_type: str,
    expenses: OperatingExpenses,
    cap_rate: float,
    vacancy_rate: float,
    annual_rent_escalation: float,
    escalation_type: str,  # "fixed" or "cpi"
    cpi_rate: float = 0.025,
    mortgage_balance: float = 0,
    monthly_mortgage_payment: float = 0,
    mortgage_interest_rate: float = 0,
    projection_years: int = 10,
    expense_growth_rate: float = 0.02,
) -> list[ProjectionYear]:
    """Project property values, cash flows, and equity over time.

    Supports:
    - Fixed annual rent escalations (e.g., 3% per year)
    - CPI-based escalations
    - Declining mortgage balance (amortization)
    - Expense growth assumptions
    """
    projections = []
    current_rent = annual_gross_rent
    current_balance = mortgage_balance
    annual_debt_service = monthly_mortgage_payment * 12
    monthly_rate = mortgage_interest_rate / 12
    cumulative_cf = 0

    current_expenses = OperatingExpenses(
        property_tax=expenses.property_tax,
        insurance=expenses.insurance,
        maintenance=expenses.maintenance,
        management_fee=expenses.management_fee,
        other=expenses.other,
    )

    for year in range(1, projection_years + 1):
        # Escalate rent
        if year > 1:
            if escalation_type == "cpi":
                current_rent *= 1 + cpi_rate
            else:
                current_rent *= 1 + annual_rent_escalation

            # Grow expenses
            current_expenses.property_tax *= 1 + expense_growth_rate
            current_expenses.insurance *= 1 + expense_growth_rate
            current_expenses.maintenance *= 1 + expense_growth_rate
            current_expenses.management_fee *= 1 + expense_growth_rate
            current_expenses.other *= 1 + expense_growth_rate

        noi = calculate_noi(current_rent, lease_type, current_expenses, vacancy_rate)
        value = calculate_property_value(noi, cap_rate)

        # Amortize mortgage for the year (12 monthly payments)
        if current_balance > 0 and monthly_rate > 0:
            for _ in range(12):
                interest = current_balance * monthly_rate
                principal = monthly_mortgage_payment - interest
                current_balance = max(0, current_balance - principal)

        equity = value - current_balance
        cash_flow = noi - annual_debt_service
        cumulative_cf += cash_flow

        projections.append(
            ProjectionYear(
                year=year,
                gross_rent=round(current_rent, 2),
                noi=round(noi, 2),
                estimated_value=round(value, 2),
                equity=round(equity, 2),
                mortgage_balance=round(current_balance, 2),
                cash_flow=round(cash_flow, 2),
                cumulative_cash_flow=round(cumulative_cf, 2),
            )
        )

    return projections


def calculate_residential_equity(
    market_value: float,
    mortgage_balances: list[float],
) -> float:
    """Simple equity calculation for residential properties."""
    return market_value - sum(mortgage_balances)


def estimate_monthly_mortgage_payment(
    principal: float,
    annual_rate: float,
    term_months: int,
) -> float:
    """Calculate monthly mortgage payment using standard amortization formula."""
    if annual_rate <= 0:
        return principal / term_months if term_months > 0 else 0

    monthly_rate = annual_rate / 12
    payment = principal * (
        monthly_rate * (1 + monthly_rate) ** term_months
    ) / ((1 + monthly_rate) ** term_months - 1)
    return round(payment, 2)


def calculate_remaining_balance(
    original_principal: float,
    annual_rate: float,
    term_months: int,
    start_date: date,
    as_of_date: date | None = None,
) -> float:
    """Calculate remaining mortgage balance as of a given date."""
    if as_of_date is None:
        as_of_date = date.today()

    months_elapsed = (as_of_date.year - start_date.year) * 12 + (
        as_of_date.month - start_date.month
    )
    months_elapsed = min(months_elapsed, term_months)

    if annual_rate <= 0:
        return max(0, original_principal - (original_principal / term_months) * months_elapsed)

    monthly_rate = annual_rate / 12
    monthly_payment = estimate_monthly_mortgage_payment(
        original_principal, annual_rate, term_months
    )

    balance = original_principal
    for _ in range(months_elapsed):
        interest = balance * monthly_rate
        principal = monthly_payment - interest
        balance -= principal

    return max(0, round(balance, 2))
