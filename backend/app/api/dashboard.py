from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User
from app.models.account import Account, AccountType
from app.models.property import Property
from app.api.schemas import NetWorthSummary
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

INVESTMENT_TYPES = {AccountType.BROKERAGE}
RETIREMENT_TYPES = {
    AccountType.RETIREMENT_401K,
    AccountType.RETIREMENT_IRA,
    AccountType.RETIREMENT_ROTH,
    AccountType.HSA,
}
CASH_TYPES = {AccountType.CHECKING, AccountType.SAVINGS}
LIABILITY_TYPES = {AccountType.CREDIT_CARD, AccountType.LOAN, AccountType.MORTGAGE}


@router.get("/net-worth", response_model=NetWorthSummary)
async def get_net_worth(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch all accounts
    result = await db.execute(
        select(Account).where(Account.user_id == current_user.id)
    )
    accounts = result.scalars().all()

    # Fetch all properties with mortgages
    result = await db.execute(
        select(Property)
        .where(Property.user_id == current_user.id, Property.is_active.is_(True))
        .options(selectinload(Property.mortgages))
    )
    properties = result.scalars().all()

    # Calculate account totals
    cash_and_banking = sum(
        float(a.balance) for a in accounts if a.account_type in CASH_TYPES
    )
    investments = sum(
        float(a.balance) for a in accounts if a.account_type in INVESTMENT_TYPES
    )
    retirement = sum(
        float(a.balance) for a in accounts if a.account_type in RETIREMENT_TYPES
    )
    other_assets = sum(
        float(a.balance)
        for a in accounts
        if a.account_type not in CASH_TYPES | INVESTMENT_TYPES | RETIREMENT_TYPES | LIABILITY_TYPES
    )
    account_liabilities = sum(
        float(a.balance) for a in accounts if a.account_type in LIABILITY_TYPES
    )

    # Calculate real estate totals
    real_estate_value = sum(
        float(p.current_market_value or p.purchase_price) for p in properties
    )
    mortgage_debt = sum(
        float(m.current_balance) for p in properties for m in p.mortgages
    )
    real_estate_equity = real_estate_value - mortgage_debt

    total_assets = cash_and_banking + investments + retirement + other_assets + real_estate_value
    total_liabilities = account_liabilities + mortgage_debt
    net_worth = total_assets - total_liabilities

    return NetWorthSummary(
        total_assets=round(total_assets, 2),
        total_liabilities=round(total_liabilities, 2),
        net_worth=round(net_worth, 2),
        real_estate_value=round(real_estate_value, 2),
        real_estate_equity=round(real_estate_equity, 2),
        cash_and_banking=round(cash_and_banking, 2),
        investments=round(investments, 2),
        retirement=round(retirement, 2),
        other_assets=round(other_assets, 2),
    )
