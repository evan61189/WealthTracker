/**
 * Data access layer using Supabase directly.
 * No backend server needed — all CRUD goes straight to Supabase PostgreSQL.
 */

import { supabase } from "./supabase";
import type {
  Account,
  Property,
  Tenant,
  Mortgage,
  NetWorthSummary,
} from "../types/api";

// ──── Accounts ────────────────────────────────────────────────────────────────

export const accounts = {
  async list(): Promise<Account[]> {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async create(account: Partial<Account>): Promise<Account> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("accounts")
      .insert({ ...account, user_id: user.id })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Create initial snapshot
    await supabase
      .from("account_snapshots")
      .insert({ account_id: data.id, balance: data.balance });

    return data;
  },

  async update(id: string, updates: Partial<Account>): Promise<Account> {
    // Get old balance for snapshot
    const { data: old } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("accounts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Record snapshot if balance changed
    if (updates.balance !== undefined && old && updates.balance !== old.balance) {
      await supabase
        .from("account_snapshots")
        .insert({ account_id: id, balance: updates.balance });
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

// ──── Properties ──────────────────────────────────────────────────────────────

export const properties = {
  async list(): Promise<Property[]> {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async get(id: string): Promise<Property> {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async create(property: Partial<Property>): Promise<Property> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Not authenticated");
    const insert: Record<string, unknown> = { ...property, user_id: user.id };
    if (insert.current_market_value) {
      insert.market_value_date = new Date().toISOString().split("T")[0];
    }
    const { data, error } = await supabase
      .from("properties")
      .insert(insert)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async update(id: string, updates: Partial<Property>): Promise<Property> {
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.current_market_value !== undefined) {
      payload.market_value_date = new Date().toISOString().split("T")[0];
    }
    const { data, error } = await supabase
      .from("properties")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  // Tenants
  async listTenants(propertyId: string): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async createTenant(
    propertyId: string,
    tenant: Partial<Tenant>
  ): Promise<Tenant> {
    const { data, error } = await supabase
      .from("tenants")
      .insert({ ...tenant, property_id: propertyId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteTenant(propertyId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("id", tenantId)
      .eq("property_id", propertyId);
    if (error) throw new Error(error.message);
  },

  // Mortgages
  async listMortgages(propertyId: string): Promise<Mortgage[]> {
    const { data, error } = await supabase
      .from("mortgages")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async createMortgage(
    propertyId: string,
    mortgage: Partial<Mortgage>
  ): Promise<Mortgage> {
    const { data, error } = await supabase
      .from("mortgages")
      .insert({ ...mortgage, property_id: propertyId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteMortgage(propertyId: string, mortgageId: string): Promise<void> {
    const { error } = await supabase
      .from("mortgages")
      .delete()
      .eq("id", mortgageId)
      .eq("property_id", propertyId);
    if (error) throw new Error(error.message);
  },

  // Valuate a property and save the result
  async valuate(
    id: string,
    valuationResult: {
      estimated_value: number;
      noi: number;
      cap_rate: number;
    }
  ): Promise<void> {
    // Record valuation history
    await supabase.from("property_valuations").insert({
      property_id: id,
      value: valuationResult.estimated_value,
      noi: valuationResult.noi,
      cap_rate_used: valuationResult.cap_rate,
      valuation_method: "cap_rate",
    });

    // Update property market value
    await supabase
      .from("properties")
      .update({
        current_market_value: valuationResult.estimated_value,
        market_value_date: new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  },
};

// ──── Dashboard ─────────────────────────────────────────────────────────────

const CASH_TYPES = ["checking", "savings"];
const INVESTMENT_TYPES = ["brokerage"];
const RETIREMENT_TYPES = ["401k", "ira", "roth_ira", "hsa"];
const LIABILITY_TYPES = ["credit_card", "loan", "mortgage"];

export const dashboard = {
  async netWorth(): Promise<NetWorthSummary> {
    const [accountsRes, propertiesRes, mortgagesRes] = await Promise.all([
      supabase.from("accounts").select("account_type, balance, is_liability"),
      supabase
        .from("properties")
        .select("purchase_price, current_market_value")
        .eq("is_active", true),
      supabase.from("mortgages").select("current_balance"),
    ]);

    const accts = accountsRes.data ?? [];
    const props = propertiesRes.data ?? [];
    const mtgs = mortgagesRes.data ?? [];

    const cashAndBanking = accts
      .filter((a) => CASH_TYPES.includes(a.account_type))
      .reduce((s, a) => s + Number(a.balance), 0);
    const investments = accts
      .filter((a) => INVESTMENT_TYPES.includes(a.account_type))
      .reduce((s, a) => s + Number(a.balance), 0);
    const retirement = accts
      .filter((a) => RETIREMENT_TYPES.includes(a.account_type))
      .reduce((s, a) => s + Number(a.balance), 0);
    const otherAssets = accts
      .filter(
        (a) =>
          !CASH_TYPES.includes(a.account_type) &&
          !INVESTMENT_TYPES.includes(a.account_type) &&
          !RETIREMENT_TYPES.includes(a.account_type) &&
          !LIABILITY_TYPES.includes(a.account_type)
      )
      .reduce((s, a) => s + Number(a.balance), 0);
    const accountLiabilities = accts
      .filter((a) => LIABILITY_TYPES.includes(a.account_type))
      .reduce((s, a) => s + Number(a.balance), 0);

    const realEstateValue = props.reduce(
      (s, p) => s + Number(p.current_market_value ?? p.purchase_price),
      0
    );
    const mortgageDebt = mtgs.reduce(
      (s, m) => s + Number(m.current_balance),
      0
    );
    const realEstateEquity = realEstateValue - mortgageDebt;

    const totalAssets =
      cashAndBanking + investments + retirement + otherAssets + realEstateValue;
    const totalLiabilities = accountLiabilities + mortgageDebt;

    return {
      total_assets: Math.round(totalAssets * 100) / 100,
      total_liabilities: Math.round(totalLiabilities * 100) / 100,
      net_worth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
      real_estate_value: Math.round(realEstateValue * 100) / 100,
      real_estate_equity: Math.round(realEstateEquity * 100) / 100,
      cash_and_banking: Math.round(cashAndBanking * 100) / 100,
      investments: Math.round(investments * 100) / 100,
      retirement: Math.round(retirement * 100) / 100,
      other_assets: Math.round(otherAssets * 100) / 100,
    };
  },
};
