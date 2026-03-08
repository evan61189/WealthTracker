"""Plaid integration service for connecting to financial accounts."""

from datetime import datetime, timezone

import plaid
from plaid.api import plaid_api
from plaid.model.country_code import CountryCode
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.products import Products

from app.core.config import settings


def _get_plaid_client() -> plaid_api.PlaidApi:
    env_map = {
        "sandbox": plaid.Environment.Sandbox,
        "development": plaid.Environment.Development,
        "production": plaid.Environment.Production,
    }
    configuration = plaid.Configuration(
        host=env_map.get(settings.PLAID_ENV, plaid.Environment.Sandbox),
        api_key={
            "clientId": settings.PLAID_CLIENT_ID,
            "secret": settings.PLAID_SECRET,
        },
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


async def create_link_token(user_id: str) -> str:
    """Create a Plaid Link token for the frontend."""
    client = _get_plaid_client()
    request = LinkTokenCreateRequest(
        products=[Products("transactions"), Products("investments")],
        client_name=settings.APP_NAME,
        country_codes=[CountryCode("US")],
        language="en",
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
    )
    response = client.link_token_create(request)
    return response.link_token


async def exchange_public_token(public_token: str) -> dict:
    """Exchange a public token for an access token."""
    client = _get_plaid_client()
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)
    return {
        "access_token": response.access_token,
        "item_id": response.item_id,
    }


async def get_accounts(access_token: str) -> list[dict]:
    """Fetch accounts from Plaid."""
    client = _get_plaid_client()
    request = AccountsGetRequest(access_token=access_token)
    response = client.accounts_get(request)

    accounts = []
    for acct in response.accounts:
        accounts.append(
            {
                "plaid_account_id": acct.account_id,
                "name": acct.name,
                "official_name": acct.official_name,
                "type": acct.type.value,
                "subtype": acct.subtype.value if acct.subtype else None,
                "balance": acct.balances.current or 0,
                "available_balance": acct.balances.available,
                "currency": acct.balances.iso_currency_code or "USD",
            }
        )
    return accounts


def map_plaid_type_to_account_type(plaid_type: str, plaid_subtype: str | None) -> str:
    """Map Plaid account types to our AccountType enum."""
    type_map = {
        ("depository", "checking"): "checking",
        ("depository", "savings"): "savings",
        ("credit", None): "credit_card",
        ("credit", "credit card"): "credit_card",
        ("investment", "401k"): "401k",
        ("investment", "ira"): "ira",
        ("investment", "roth"): "roth_ira",
        ("investment", "hsa"): "hsa",
        ("investment", "brokerage"): "brokerage",
        ("investment", None): "brokerage",
        ("loan", "mortgage"): "mortgage",
        ("loan", None): "loan",
    }
    return type_map.get((plaid_type, plaid_subtype), "other")
