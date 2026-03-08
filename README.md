# WealthTracker

A comprehensive wealth tracking application with advanced real estate valuation capabilities. Think Monarch Money, but with a powerful commercial real estate engine that handles cap rate valuations, lease type analysis (NNN, NN, Gross), rent escalation projections, and more.

## Features

### Net Worth Dashboard
- Complete net worth overview across all asset categories
- Asset allocation pie chart and assets vs liabilities comparison
- Real-time balance tracking via Plaid integration

### Financial Accounts
- Connect bank accounts, credit cards, investment/retirement accounts via Plaid
- Manual account entry for any account type
- Historical balance snapshots for trend tracking
- Supports: Checking, Savings, Credit Cards, Brokerage, 401(k), IRA, Roth IRA, HSA, Loans

### Real Estate Portfolio
- **Residential properties**: Track purchase price, market value, mortgage details, equity
- **Commercial properties**: Full income capitalization valuation engine
  - Lease type support: NNN (Triple Net), NN (Double Net), Net, Modified Gross, Gross, Absolute Net
  - Cap rate-based property valuation (Value = NOI / Cap Rate)
  - Automatic NOI calculation adjusted for lease type expense responsibility
  - Tenant management with individual lease terms and rent escalations
  - Multiple mortgage tracking per property
  - Cash-on-cash return and DSCR calculations

### Valuation Calculator
- Standalone commercial property valuation tool
- 10-year (configurable) cash flow and value projections
- Rent escalation modeling (fixed % or CPI-based)
- Mortgage amortization in projections
- Interactive charts for value, equity, and cash flow trends
- Year-by-year detailed projection table

### Lease Type Expense Logic
| Expense | Gross | Modified Gross | Net | NN | NNN | Absolute Net |
|---------|-------|---------------|-----|-----|-----|-------------|
| Property Tax | Landlord | Landlord | Tenant | Tenant | Tenant | Tenant |
| Insurance | Landlord | Landlord | Landlord | Tenant | Tenant | Tenant |
| Maintenance | Landlord | Tenant | Landlord | Landlord | Tenant | Tenant |
| Management | Landlord | Landlord | Landlord | Landlord | Landlord | Tenant |

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic
- **Frontend**: React 19, TypeScript, Vite, Recharts
- **Auth**: JWT (python-jose + passlib/bcrypt)
- **Bank Integration**: Plaid API
- **Styling**: Custom CSS with dark theme

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL 15+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database URL, Plaid keys, and secret key

# Create database
createdb wealthtracker

# Run migrations
alembic upgrade head

# Start the API
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173` with API proxied to `http://localhost:8000`.

### Plaid Setup

1. Create a Plaid account at https://dashboard.plaid.com
2. Get your `client_id` and `secret` from the Plaid dashboard
3. Add them to your `.env` file
4. Use `sandbox` environment for testing

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in (returns JWT)
- `GET /api/auth/me` - Current user

### Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create manual account
- `PATCH /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `GET /api/accounts/:id/snapshots` - Balance history

### Properties
- `GET /api/properties` - List all properties
- `POST /api/properties` - Add property
- `GET /api/properties/:id` - Property detail
- `PATCH /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property
- `POST /api/properties/:id/valuate` - Run cap rate valuation

### Tenants & Mortgages
- `GET/POST /api/properties/:id/tenants` - Manage tenants
- `GET/POST /api/properties/:id/mortgages` - Manage mortgages

### Valuation Calculator
- `POST /api/properties/valuation/calculate` - One-time valuation
- `POST /api/properties/valuation/project` - Multi-year projection

### Dashboard
- `GET /api/dashboard/net-worth` - Net worth summary

### Plaid
- `POST /api/plaid/link-token` - Get Plaid Link token
- `POST /api/plaid/exchange-token` - Exchange public token
- `POST /api/plaid/sync` - Sync all Plaid account balances

## Project Structure

```
WealthTracker/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Config, database, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # Business logic (valuation, Plaid)
│   │   └── main.py       # FastAPI app
│   ├── alembic/          # Database migrations
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/   # Reusable UI components
    │   ├── pages/        # Page components
    │   ├── services/     # API client
    │   └── types/        # TypeScript types
    └── package.json
```
