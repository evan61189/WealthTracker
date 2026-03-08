from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.models.account import Account, AccountType
from app.api.schemas import AccountResponse
from app.api.deps import get_current_user
from app.services.plaid_service import (
    create_link_token,
    exchange_public_token,
    get_accounts,
    map_plaid_type_to_account_type,
)

router = APIRouter(prefix="/plaid", tags=["plaid"])


@router.post("/link-token")
async def get_link_token(
    current_user: User = Depends(get_current_user),
):
    """Get a Plaid Link token to initialize the Link flow."""
    try:
        link_token = await create_link_token(current_user.id)
        return {"link_token": link_token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create link token: {e}")


@router.post("/exchange-token", response_model=list[AccountResponse])
async def exchange_token(
    public_token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exchange a Plaid public token and import accounts."""
    try:
        token_data = await exchange_public_token(public_token)
        access_token = token_data["access_token"]
        item_id = token_data["item_id"]

        plaid_accounts = await get_accounts(access_token)

        created_accounts = []
        for pa in plaid_accounts:
            account_type_str = map_plaid_type_to_account_type(
                pa["type"], pa.get("subtype")
            )
            try:
                account_type = AccountType(account_type_str)
            except ValueError:
                account_type = AccountType.OTHER

            is_liability = pa["type"] in ("credit", "loan")

            account = Account(
                user_id=current_user.id,
                name=pa.get("official_name") or pa["name"],
                institution_name=None,
                account_type=account_type,
                balance=pa["balance"],
                currency=pa["currency"],
                is_liability=is_liability,
                plaid_access_token=access_token,
                plaid_account_id=pa["plaid_account_id"],
                plaid_item_id=item_id,
            )
            db.add(account)
            created_accounts.append(account)

        await db.flush()
        for acct in created_accounts:
            await db.refresh(acct)

        return created_accounts
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to exchange token: {e}"
        )


@router.post("/sync")
async def sync_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sync all Plaid-connected account balances."""
    from datetime import datetime, timezone
    from sqlalchemy import select
    from app.models.account import AccountSnapshot

    result = await db.execute(
        select(Account).where(
            Account.user_id == current_user.id,
            Account.plaid_access_token.isnot(None),
        )
    )
    accounts = result.scalars().all()

    # Group by access token to minimize API calls
    token_groups: dict[str, list[Account]] = {}
    for acct in accounts:
        token_groups.setdefault(acct.plaid_access_token, []).append(acct)

    synced = 0
    for access_token, accts in token_groups.items():
        try:
            plaid_accounts = await get_accounts(access_token)
            plaid_map = {pa["plaid_account_id"]: pa for pa in plaid_accounts}

            for acct in accts:
                if acct.plaid_account_id in plaid_map:
                    pa = plaid_map[acct.plaid_account_id]
                    acct.balance = pa["balance"]
                    acct.last_synced = datetime.now(timezone.utc)

                    snapshot = AccountSnapshot(
                        account_id=acct.id,
                        balance=pa["balance"],
                    )
                    db.add(snapshot)
                    synced += 1
        except Exception:
            continue

    return {"synced": synced, "total": len(accounts)}
