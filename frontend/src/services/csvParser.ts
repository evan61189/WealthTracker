/**
 * CSV parser for real estate spreadsheet upload.
 *
 * Expected columns:
 *   Holding Company, Address, Value, Debt Balance,
 *   Monthly loan payment, Lender, Rate, Maturity, % ownership & who
 */

export interface ParsedProperty {
  holdingCompany: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  value: number;
  debtBalance: number;
  monthlyPayment: number;
  lender: string;
  rate: number; // as decimal, e.g. 0.065
  maturity: string; // ISO date string
  ownership: string;
}

/** Parse CSV text into rows of string arrays. Handles quoted fields with commas. */
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        row.push(current.trim());
        current = "";
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
        if (ch === "\r") i++;
      } else {
        current += ch;
      }
    }
  }
  // Last row
  row.push(current.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);

  return rows;
}

/** Normalize header text for flexible matching. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Map a header to our known column names. */
function matchHeader(header: string): string | null {
  const n = normalize(header);
  if (n.includes("holding") || n.includes("company") || n.includes("entity"))
    return "holdingCompany";
  if (n.includes("address") || n.includes("location")) return "address";
  if (n === "value" || n === "marketvalue" || n === "currentvalue" || n === "propertyvalue")
    return "value";
  if (n.includes("debt") || n.includes("loanbalance") || n.includes("balance"))
    return "debtBalance";
  if (n.includes("monthly") || n.includes("payment") || n.includes("loanpayment"))
    return "monthlyPayment";
  if (n.includes("lender") || n.includes("bank")) return "lender";
  if (n.includes("rate") || n.includes("interest")) return "rate";
  if (n.includes("maturity") || n.includes("matur")) return "maturity";
  if (n.includes("ownership") || n.includes("who") || n.includes("percent"))
    return "ownership";
  return null;
}

/** Parse a currency string like "$1,200,000" or "1200000" to a number. */
function parseCurrency(s: string): number {
  const cleaned = s.replace(/[$,\s]/g, "");
  return parseFloat(cleaned) || 0;
}

/** Parse a rate like "6.5%", "0.065", or "6.5" to a decimal. */
function parseRate(s: string): number {
  const cleaned = s.replace(/[%\s]/g, "");
  const num = parseFloat(cleaned) || 0;
  // If > 1, assume it's a percentage (e.g., 6.5 → 0.065)
  return num > 1 ? num / 100 : num;
}

/** Try to parse a date string in various formats. */
function parseDate(s: string): string {
  if (!s) return "";
  // Try native Date parse first
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  // Try MM/DD/YYYY
  const parts = s.split(/[/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map((p) => parseInt(p));
    if (c > 100) {
      // MM/DD/YYYY
      return `${c}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    }
    if (a > 100) {
      // YYYY/MM/DD
      return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
    }
  }
  return "";
}

/**
 * Try to extract city, state, zip from an address string.
 * Handles formats like: "123 Main St, Austin, TX 78701"
 */
function parseAddress(fullAddress: string): {
  address: string;
  city: string;
  state: string;
  zipCode: string;
} {
  // Try to match ", City, ST ZIPCODE" at the end
  const match = fullAddress.match(
    /^(.+?),\s*([^,]+?),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/i
  );
  if (match) {
    return {
      address: match[1].trim(),
      city: match[2].trim(),
      state: match[3].toUpperCase(),
      zipCode: (match[4] || "").trim(),
    };
  }

  // Try ", City, ST" without zip
  const match2 = fullAddress.match(/^(.+?),\s*([^,]+?),\s*([A-Z]{2})$/i);
  if (match2) {
    return {
      address: match2[1].trim(),
      city: match2[2].trim(),
      state: match2[3].toUpperCase(),
      zipCode: "",
    };
  }

  // Can't parse — use full string as address
  return {
    address: fullAddress,
    city: "",
    state: "",
    zipCode: "",
  };
}

/** Parse CSV text into structured property data. */
export function parsePropertiesCSV(csvText: string): ParsedProperty[] {
  const rows = parseCSVRows(csvText);
  if (rows.length < 2) return [];

  // Map headers
  const headers = rows[0];
  const columnMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = matchHeader(h);
    if (key) columnMap[key] = i;
  });

  const results: ParsedProperty[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (key: string) => row[columnMap[key]] ?? "";

    const holdingCompany = get("holdingCompany");
    if (!holdingCompany && !get("address")) continue; // skip empty rows

    const parsed = parseAddress(get("address"));

    results.push({
      holdingCompany: holdingCompany || "Unnamed Property",
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      zipCode: parsed.zipCode,
      value: parseCurrency(get("value")),
      debtBalance: parseCurrency(get("debtBalance")),
      monthlyPayment: parseCurrency(get("monthlyPayment")),
      lender: get("lender"),
      rate: parseRate(get("rate")),
      maturity: parseDate(get("maturity")),
      ownership: get("ownership"),
    });
  }

  return results;
}
