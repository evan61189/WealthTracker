from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User
from app.models.property import Property, Tenant, Mortgage, PropertyValuation
from app.api.schemas import (
    PropertyCreate,
    PropertyUpdate,
    PropertyResponse,
    TenantCreate,
    TenantUpdate,
    TenantResponse,
    MortgageCreate,
    MortgageUpdate,
    MortgageResponse,
    ValuationRequest,
    ValuationResponse,
    ProjectionRequest,
    ProjectionYearResponse,
)
from app.api.deps import get_current_user
from app.services.valuation import (
    OperatingExpenses,
    calculate_valuation,
    project_future_values,
)

router = APIRouter(prefix="/properties", tags=["properties"])


# ──── Properties CRUD ─────────────────────────────────────────────────────────


@router.get("", response_model=list[PropertyResponse])
async def list_properties(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Property).where(Property.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("", response_model=PropertyResponse, status_code=201)
async def create_property(
    prop_in: PropertyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prop = Property(user_id=current_user.id, **prop_in.model_dump())
    if prop.current_market_value:
        prop.market_value_date = date.today()
    db.add(prop)
    await db.flush()
    await db.refresh(prop)
    return prop


@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Property).where(
            Property.id == property_id, Property.user_id == current_user.id
        )
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


@router.patch("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: str,
    prop_in: PropertyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Property).where(
            Property.id == property_id, Property.user_id == current_user.id
        )
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    update_data = prop_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prop, field, value)

    if "current_market_value" in update_data:
        prop.market_value_date = date.today()

    await db.flush()
    await db.refresh(prop)
    return prop


@router.delete("/{property_id}", status_code=204)
async def delete_property(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Property).where(
            Property.id == property_id, Property.user_id == current_user.id
        )
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    await db.delete(prop)


# ──── Tenants ─────────────────────────────────────────────────────────────────


@router.get("/{property_id}/tenants", response_model=list[TenantResponse])
async def list_tenants(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_property_ownership(property_id, current_user.id, db)
    result = await db.execute(
        select(Tenant).where(Tenant.property_id == property_id)
    )
    return result.scalars().all()


@router.post("/{property_id}/tenants", response_model=TenantResponse, status_code=201)
async def create_tenant(
    property_id: str,
    tenant_in: TenantCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_property_ownership(property_id, current_user.id, db)
    tenant = Tenant(property_id=property_id, **tenant_in.model_dump())
    db.add(tenant)
    await db.flush()
    await db.refresh(tenant)
    return tenant


@router.patch("/{property_id}/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    property_id: str,
    tenant_id: str,
    tenant_in: TenantUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_property_ownership(property_id, current_user.id, db)
    result = await db.execute(
        select(Tenant).where(
            Tenant.id == tenant_id, Tenant.property_id == property_id
        )
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    for field, value in tenant_in.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)

    await db.flush()
    await db.refresh(tenant)
    return tenant


@router.delete("/{property_id}/tenants/{tenant_id}", status_code=204)
async def delete_tenant(
    property_id: str,
    tenant_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_property_ownership(property_id, current_user.id, db)
    result = await db.execute(
        select(Tenant).where(
            Tenant.id == tenant_id, Tenant.property_id == property_id
        )
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await db.delete(tenant)


# ──── Mortgages ───────────────────────────────────────────────────────────────


@router.get("/{property_id}/mortgages", response_model=list[MortgageResponse])
async def list_mortgages(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_property_ownership(property_id, current_user.id, db)
    result = await db.execute(
        select(Mortgage).where(Mortgage.property_id == property_id)
    )
    return result.scalars().all()


@router.post(
    "/{property_id}/mortgages", response_model=MortgageResponse, status_code=201
)
async def create_mortgage(
    property_id: str,
    mortgage_in: MortgageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_property_ownership(property_id, current_user.id, db)
    mortgage = Mortgage(property_id=property_id, **mortgage_in.model_dump())
    db.add(mortgage)
    await db.flush()
    await db.refresh(mortgage)
    return mortgage


@router.patch(
    "/{property_id}/mortgages/{mortgage_id}", response_model=MortgageResponse
)
async def update_mortgage(
    property_id: str,
    mortgage_id: str,
    mortgage_in: MortgageUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_property_ownership(property_id, current_user.id, db)
    result = await db.execute(
        select(Mortgage).where(
            Mortgage.id == mortgage_id, Mortgage.property_id == property_id
        )
    )
    mortgage = result.scalar_one_or_none()
    if not mortgage:
        raise HTTPException(status_code=404, detail="Mortgage not found")

    for field, value in mortgage_in.model_dump(exclude_unset=True).items():
        setattr(mortgage, field, value)

    await db.flush()
    await db.refresh(mortgage)
    return mortgage


@router.delete("/{property_id}/mortgages/{mortgage_id}", status_code=204)
async def delete_mortgage(
    property_id: str,
    mortgage_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_property_ownership(property_id, current_user.id, db)
    result = await db.execute(
        select(Mortgage).where(
            Mortgage.id == mortgage_id, Mortgage.property_id == property_id
        )
    )
    mortgage = result.scalar_one_or_none()
    if not mortgage:
        raise HTTPException(status_code=404, detail="Mortgage not found")
    await db.delete(mortgage)


# ──── Valuation endpoints ────────────────────────────────────────────────────


@router.post("/valuation/calculate", response_model=ValuationResponse)
async def calculate_property_valuation(
    req: ValuationRequest,
    current_user: User = Depends(get_current_user),
):
    """Calculate commercial property valuation based on cap rate methodology."""
    expenses = OperatingExpenses(
        property_tax=req.property_tax,
        insurance=req.insurance,
        maintenance=req.maintenance,
        management_fee=req.management_fee,
        other=req.other_expenses,
    )
    result = calculate_valuation(
        annual_gross_rent=req.annual_gross_rent,
        lease_type=req.lease_type,
        expenses=expenses,
        cap_rate=req.cap_rate,
        vacancy_rate=req.vacancy_rate,
        square_feet=req.square_feet,
        total_debt=req.total_debt,
        annual_debt_service=req.annual_debt_service,
        total_cash_invested=req.total_cash_invested,
    )
    return result


@router.post(
    "/valuation/project", response_model=list[ProjectionYearResponse]
)
async def project_property_values(
    req: ProjectionRequest,
    current_user: User = Depends(get_current_user),
):
    """Project property values, cash flows, and equity over time."""
    expenses = OperatingExpenses(
        property_tax=req.property_tax,
        insurance=req.insurance,
        maintenance=req.maintenance,
        management_fee=req.management_fee,
        other=req.other_expenses,
    )
    projections = project_future_values(
        annual_gross_rent=req.annual_gross_rent,
        lease_type=req.lease_type,
        expenses=expenses,
        cap_rate=req.cap_rate,
        vacancy_rate=req.vacancy_rate,
        annual_rent_escalation=req.annual_rent_escalation,
        escalation_type=req.escalation_type,
        cpi_rate=req.cpi_rate,
        mortgage_balance=req.mortgage_balance,
        monthly_mortgage_payment=req.monthly_mortgage_payment,
        mortgage_interest_rate=req.mortgage_interest_rate,
        projection_years=req.projection_years,
        expense_growth_rate=req.expense_growth_rate,
    )
    return projections


@router.post("/{property_id}/valuate", response_model=ValuationResponse)
async def valuate_property(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate valuation for an existing property using its stored data."""
    result = await db.execute(
        select(Property)
        .where(Property.id == property_id, Property.user_id == current_user.id)
        .options(selectinload(Property.mortgages))
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if not prop.cap_rate or not prop.lease_type:
        raise HTTPException(
            status_code=400,
            detail="Property must have cap_rate and lease_type for valuation",
        )

    expenses = OperatingExpenses(
        property_tax=float(prop.annual_property_tax),
        insurance=float(prop.annual_insurance),
        maintenance=float(prop.annual_maintenance),
        management_fee=float(prop.annual_management_fee),
        other=float(prop.annual_other_expenses),
    )

    total_debt = sum(float(m.current_balance) for m in prop.mortgages)
    annual_debt_service = sum(float(m.monthly_payment) * 12 for m in prop.mortgages)
    total_cash_invested = float(prop.purchase_price) + float(prop.closing_costs) - sum(
        float(m.original_balance) for m in prop.mortgages
    )

    valuation = calculate_valuation(
        annual_gross_rent=float(prop.annual_gross_rent),
        lease_type=prop.lease_type.value,
        expenses=expenses,
        cap_rate=float(prop.cap_rate),
        vacancy_rate=float(prop.vacancy_rate),
        square_feet=prop.square_feet,
        total_debt=total_debt,
        annual_debt_service=annual_debt_service,
        total_cash_invested=max(total_cash_invested, 0),
    )

    # Record the valuation
    record = PropertyValuation(
        property_id=prop.id,
        value=valuation.estimated_value,
        noi=valuation.noi,
        cap_rate_used=valuation.cap_rate,
        valuation_method="cap_rate",
    )
    db.add(record)

    # Update property market value
    prop.current_market_value = valuation.estimated_value
    prop.market_value_date = date.today()

    return valuation


# ──── Helpers ─────────────────────────────────────────────────────────────────


async def _verify_property_ownership(
    property_id: str, user_id: str, db: AsyncSession
) -> Property:
    result = await db.execute(
        select(Property).where(
            Property.id == property_id, Property.user_id == user_id
        )
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop
