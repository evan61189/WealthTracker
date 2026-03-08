# WealthTracker

A wealth tracking app with advanced commercial real estate valuation. Track net worth across all asset categories, with a real estate engine that handles cap rate valuations, lease type analysis (NNN, NN, Gross), rent escalation projections, and more.

**Stack**: React + TypeScript + Supabase + Netlify. No backend server needed.

## Features

- **Net Worth Dashboard** — asset allocation, pie charts, assets vs liabilities
- **Manual Accounts** — checking, savings, credit cards, brokerage, 401(k), IRA, HSA, loans
- **Real Estate Portfolio** — residential & commercial property tracking
- **Commercial Valuation** — cap rate methodology with lease type expense adjustments
- **Valuation Calculator** — standalone tool with 10-year projections, cash flow charts
- **Tenant & Mortgage Management** — per-property tracking

## Setup (Two Steps)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the contents of `supabase/schema.sql` — click **Run**
3. From **Settings > API**, copy your Project URL and `anon` public key

### 2. Netlify

1. Connect this repo to [Netlify](https://app.netlify.com)
2. It will auto-detect settings from `netlify.toml`
3. Add environment variables in Netlify dashboard:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
4. Deploy

That's it. Two services, both free tier.

## Local Development

```bash
cd frontend
cp .env.example .env
# Edit .env with your Supabase URL and anon key

npm install
npm run dev
```

Open `http://localhost:5173`.

## Project Structure

```
WealthTracker/
├── frontend/
│   ├── src/
│   │   ├── pages/        # Dashboard, Accounts, Properties, Calculator
│   │   ├── services/     # Supabase client, valuation engine
│   │   └── types/        # TypeScript types
│   └── package.json
├── supabase/
│   └── schema.sql        # Tables + Row Level Security policies
└── netlify.toml           # Build config
```
