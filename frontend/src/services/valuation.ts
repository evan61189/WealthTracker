/**
 * Real estate valuation engine (client-side).
 *
 * Cap rate methodology: Value = NOI / Cap Rate
 * Lease type adjustments for expense responsibility.
 */

import type { ValuationResult, ProjectionYear } from "../types/api";

interface OperatingExpenses {
  property_tax: number;
  insurance: number;
  maintenance: number;
  management_fee: number;
  other: number;
}

function totalExpenses(e: OperatingExpenses): number {
  return e.property_tax + e.insurance + e.maintenance + e.management_fee + e.other;
}

export function calculateLandlordExpenses(
  leaseType: string,
  expenses: OperatingExpenses
): number {
  switch (leaseType) {
    case "gross":
      return totalExpenses(expenses);
    case "modified_gross":
      return expenses.property_tax + expenses.insurance + expenses.management_fee + expenses.other;
    case "net":
      return expenses.insurance + expenses.maintenance + expenses.management_fee + expenses.other;
    case "nn":
      return expenses.maintenance + expenses.management_fee + expenses.other;
    case "nnn":
      return expenses.management_fee + expenses.other;
    case "absolute_net":
      return 0;
    default:
      return totalExpenses(expenses);
  }
}

export function calculateNoi(
  annualGrossRent: number,
  leaseType: string,
  expenses: OperatingExpenses,
  vacancyRate: number = 0.05
): number {
  const effectiveGrossIncome = annualGrossRent * (1 - vacancyRate);
  const landlordExpenses = calculateLandlordExpenses(leaseType, expenses);
  return effectiveGrossIncome - landlordExpenses;
}

export function calculateValuation(params: {
  annual_gross_rent: number;
  lease_type: string;
  cap_rate: number;
  vacancy_rate?: number;
  property_tax?: number;
  insurance?: number;
  maintenance?: number;
  management_fee?: number;
  other_expenses?: number;
  square_feet?: number | null;
  total_debt?: number;
  annual_debt_service?: number;
  total_cash_invested?: number;
}): ValuationResult {
  const expenses: OperatingExpenses = {
    property_tax: params.property_tax ?? 0,
    insurance: params.insurance ?? 0,
    maintenance: params.maintenance ?? 0,
    management_fee: params.management_fee ?? 0,
    other: params.other_expenses ?? 0,
  };
  const vacancyRate = params.vacancy_rate ?? 0.05;
  const totalDebt = params.total_debt ?? 0;
  const annualDebtService = params.annual_debt_service ?? 0;
  const totalCashInvested = params.total_cash_invested ?? 0;

  const landlordExpenses = calculateLandlordExpenses(params.lease_type, expenses);
  const noi = calculateNoi(params.annual_gross_rent, params.lease_type, expenses, vacancyRate);
  const estimatedValue = noi / params.cap_rate;
  const equity = estimatedValue - totalDebt;

  const pricePerSqft = params.square_feet ? estimatedValue / params.square_feet : null;

  const annualCashFlow = noi - annualDebtService;
  const cashOnCash = totalCashInvested > 0 ? annualCashFlow / totalCashInvested : null;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : null;

  return {
    gross_rent: params.annual_gross_rent,
    landlord_expenses: Math.round(landlordExpenses * 100) / 100,
    noi: Math.round(noi * 100) / 100,
    cap_rate: params.cap_rate,
    estimated_value: Math.round(estimatedValue * 100) / 100,
    price_per_sqft: pricePerSqft ? Math.round(pricePerSqft * 100) / 100 : null,
    equity: Math.round(equity * 100) / 100,
    total_debt: totalDebt,
    cash_on_cash_return: cashOnCash ? Math.round(cashOnCash * 10000) / 10000 : null,
    dscr: dscr ? Math.round(dscr * 100) / 100 : null,
  };
}

export function projectFutureValues(params: {
  annual_gross_rent: number;
  lease_type: string;
  cap_rate: number;
  vacancy_rate?: number;
  property_tax?: number;
  insurance?: number;
  maintenance?: number;
  management_fee?: number;
  other_expenses?: number;
  annual_rent_escalation?: number;
  escalation_type?: string;
  cpi_rate?: number;
  mortgage_balance?: number;
  monthly_mortgage_payment?: number;
  mortgage_interest_rate?: number;
  projection_years?: number;
  expense_growth_rate?: number;
}): ProjectionYear[] {
  const projections: ProjectionYear[] = [];
  let currentRent = params.annual_gross_rent;
  let currentBalance = params.mortgage_balance ?? 0;
  const monthlyPayment = params.monthly_mortgage_payment ?? 0;
  const annualDebtService = monthlyPayment * 12;
  const monthlyRate = (params.mortgage_interest_rate ?? 0) / 12;
  const years = params.projection_years ?? 10;
  const expGrowth = params.expense_growth_rate ?? 0.02;
  const rentEsc = params.annual_rent_escalation ?? 0.03;
  const escType = params.escalation_type ?? "fixed";
  const cpiRate = params.cpi_rate ?? 0.025;
  let cumulativeCf = 0;

  const expenses = {
    property_tax: params.property_tax ?? 0,
    insurance: params.insurance ?? 0,
    maintenance: params.maintenance ?? 0,
    management_fee: params.management_fee ?? 0,
    other: params.other_expenses ?? 0,
  };

  for (let year = 1; year <= years; year++) {
    if (year > 1) {
      currentRent *= 1 + (escType === "cpi" ? cpiRate : rentEsc);
      expenses.property_tax *= 1 + expGrowth;
      expenses.insurance *= 1 + expGrowth;
      expenses.maintenance *= 1 + expGrowth;
      expenses.management_fee *= 1 + expGrowth;
      expenses.other *= 1 + expGrowth;
    }

    const noi = calculateNoi(currentRent, params.lease_type, expenses, params.vacancy_rate ?? 0.05);
    const value = noi / params.cap_rate;

    if (currentBalance > 0 && monthlyRate > 0) {
      for (let m = 0; m < 12; m++) {
        const interest = currentBalance * monthlyRate;
        const principal = monthlyPayment - interest;
        currentBalance = Math.max(0, currentBalance - principal);
      }
    }

    const equity = value - currentBalance;
    const cashFlow = noi - annualDebtService;
    cumulativeCf += cashFlow;

    projections.push({
      year,
      gross_rent: Math.round(currentRent * 100) / 100,
      noi: Math.round(noi * 100) / 100,
      estimated_value: Math.round(value * 100) / 100,
      equity: Math.round(equity * 100) / 100,
      mortgage_balance: Math.round(currentBalance * 100) / 100,
      cash_flow: Math.round(cashFlow * 100) / 100,
      cumulative_cash_flow: Math.round(cumulativeCf * 100) / 100,
    });
  }

  return projections;
}
