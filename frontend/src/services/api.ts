const BASE_URL = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; full_name: string }) =>
    request<{ id: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => request<import("../types/api").User>("/auth/me"),
};

// Accounts
export const accounts = {
  list: () => request<import("../types/api").Account[]>("/accounts"),
  create: (data: Record<string, unknown>) =>
    request<import("../types/api").Account>("/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<import("../types/api").Account>(`/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/accounts/${id}`, { method: "DELETE" }),
};

// Properties
export const properties = {
  list: () => request<import("../types/api").Property[]>("/properties"),
  get: (id: string) =>
    request<import("../types/api").Property>(`/properties/${id}`),
  create: (data: Record<string, unknown>) =>
    request<import("../types/api").Property>("/properties", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<import("../types/api").Property>(`/properties/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/properties/${id}`, { method: "DELETE" }),
  valuate: (id: string) =>
    request<import("../types/api").ValuationResult>(
      `/properties/${id}/valuate`,
      { method: "POST" }
    ),

  // Tenants
  listTenants: (propertyId: string) =>
    request<import("../types/api").Tenant[]>(
      `/properties/${propertyId}/tenants`
    ),
  createTenant: (propertyId: string, data: Record<string, unknown>) =>
    request<import("../types/api").Tenant>(
      `/properties/${propertyId}/tenants`,
      { method: "POST", body: JSON.stringify(data) }
    ),
  updateTenant: (
    propertyId: string,
    tenantId: string,
    data: Record<string, unknown>
  ) =>
    request<import("../types/api").Tenant>(
      `/properties/${propertyId}/tenants/${tenantId}`,
      { method: "PATCH", body: JSON.stringify(data) }
    ),
  deleteTenant: (propertyId: string, tenantId: string) =>
    request<void>(`/properties/${propertyId}/tenants/${tenantId}`, {
      method: "DELETE",
    }),

  // Mortgages
  listMortgages: (propertyId: string) =>
    request<import("../types/api").Mortgage[]>(
      `/properties/${propertyId}/mortgages`
    ),
  createMortgage: (propertyId: string, data: Record<string, unknown>) =>
    request<import("../types/api").Mortgage>(
      `/properties/${propertyId}/mortgages`,
      { method: "POST", body: JSON.stringify(data) }
    ),
  updateMortgage: (
    propertyId: string,
    mortgageId: string,
    data: Record<string, unknown>
  ) =>
    request<import("../types/api").Mortgage>(
      `/properties/${propertyId}/mortgages/${mortgageId}`,
      { method: "PATCH", body: JSON.stringify(data) }
    ),
  deleteMortgage: (propertyId: string, mortgageId: string) =>
    request<void>(`/properties/${propertyId}/mortgages/${mortgageId}`, {
      method: "DELETE",
    }),
};

// Valuation calculator
export const valuation = {
  calculate: (data: Record<string, unknown>) =>
    request<import("../types/api").ValuationResult>(
      "/properties/valuation/calculate",
      { method: "POST", body: JSON.stringify(data) }
    ),
  project: (data: Record<string, unknown>) =>
    request<import("../types/api").ProjectionYear[]>(
      "/properties/valuation/project",
      { method: "POST", body: JSON.stringify(data) }
    ),
};

// Dashboard
export const dashboard = {
  netWorth: () =>
    request<import("../types/api").NetWorthSummary>("/dashboard/net-worth"),
};

// Plaid
export const plaid = {
  getLinkToken: () =>
    request<{ link_token: string }>("/plaid/link-token", { method: "POST" }),
  exchangeToken: (publicToken: string) =>
    request<import("../types/api").Account[]>(
      `/plaid/exchange-token?public_token=${encodeURIComponent(publicToken)}`,
      { method: "POST" }
    ),
  sync: () => request<{ synced: number }>("/plaid/sync", { method: "POST" }),
};
