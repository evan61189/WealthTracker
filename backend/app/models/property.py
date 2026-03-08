import enum
import uuid
from datetime import datetime, date, timezone

from sqlalchemy import (
    String,
    DateTime,
    Date,
    Numeric,
    ForeignKey,
    Enum,
    Boolean,
    Text,
    Integer,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PropertyType(str, enum.Enum):
    RESIDENTIAL_PRIMARY = "residential_primary"
    RESIDENTIAL_RENTAL = "residential_rental"
    COMMERCIAL_RETAIL = "commercial_retail"
    COMMERCIAL_OFFICE = "commercial_office"
    COMMERCIAL_INDUSTRIAL = "commercial_industrial"
    COMMERCIAL_MULTIFAMILY = "commercial_multifamily"
    COMMERCIAL_MIXED_USE = "commercial_mixed_use"
    LAND = "land"


class LeaseType(str, enum.Enum):
    GROSS = "gross"  # Landlord pays all operating expenses
    MODIFIED_GROSS = "modified_gross"  # Shared expenses
    NET = "net"  # Tenant pays one category (usually taxes)
    DOUBLE_NET = "nn"  # Tenant pays taxes + insurance
    TRIPLE_NET = "nnn"  # Tenant pays taxes + insurance + maintenance
    ABSOLUTE_NET = "absolute_net"  # Tenant pays everything including structure
    PERCENTAGE = "percentage"  # Base rent + percentage of sales


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    property_type: Mapped[PropertyType] = mapped_column(Enum(PropertyType))
    address: Mapped[str] = mapped_column(String(500))
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(50))
    zip_code: Mapped[str] = mapped_column(String(20))
    county: Mapped[str | None] = mapped_column(String(100))

    # Purchase info
    purchase_price: Mapped[float] = mapped_column(Numeric(15, 2))
    purchase_date: Mapped[date] = mapped_column(Date)
    closing_costs: Mapped[float] = mapped_column(Numeric(15, 2), default=0)

    # Valuation
    current_market_value: Mapped[float | None] = mapped_column(Numeric(15, 2))
    market_value_date: Mapped[date | None] = mapped_column(Date)
    manual_value_override: Mapped[bool] = mapped_column(Boolean, default=False)

    # Property details
    square_feet: Mapped[int | None] = mapped_column(Integer)
    lot_size_sqft: Mapped[int | None] = mapped_column(Integer)
    year_built: Mapped[int | None] = mapped_column(Integer)
    units: Mapped[int] = mapped_column(Integer, default=1)
    description: Mapped[str | None] = mapped_column(Text)

    # Commercial-specific fields
    lease_type: Mapped[LeaseType | None] = mapped_column(Enum(LeaseType))
    cap_rate: Mapped[float | None] = mapped_column(Numeric(5, 3))  # e.g., 0.065 = 6.5%

    # Annual operating expenses (landlord's responsibility varies by lease type)
    annual_property_tax: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    annual_insurance: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    annual_maintenance: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    annual_management_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    annual_other_expenses: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    vacancy_rate: Mapped[float] = mapped_column(Numeric(5, 3), default=0.05)  # 5%

    # Rent info (for rental/commercial)
    annual_gross_rent: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    annual_rent_escalation: Mapped[float] = mapped_column(
        Numeric(5, 3), default=0.03
    )  # 3% default
    rent_escalation_type: Mapped[str] = mapped_column(
        String(20), default="fixed"
    )  # fixed, cpi

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="properties")  # noqa: F821
    tenants: Mapped[list["Tenant"]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    mortgages: Mapped[list["Mortgage"]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    valuations: Mapped[list["PropertyValuation"]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    unit: Mapped[str | None] = mapped_column(String(50))  # Unit/suite number
    lease_start: Mapped[date] = mapped_column(Date)
    lease_end: Mapped[date] = mapped_column(Date)
    monthly_rent: Mapped[float] = mapped_column(Numeric(12, 2))
    annual_escalation: Mapped[float] = mapped_column(
        Numeric(5, 3), default=0.03
    )  # tenant-specific escalation
    security_deposit: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    property: Mapped["Property"] = relationship(back_populates="tenants")


class Mortgage(Base):
    __tablename__ = "mortgages"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id"), index=True)
    lender: Mapped[str] = mapped_column(String(255))
    original_balance: Mapped[float] = mapped_column(Numeric(15, 2))
    current_balance: Mapped[float] = mapped_column(Numeric(15, 2))
    interest_rate: Mapped[float] = mapped_column(Numeric(6, 4))  # e.g., 0.0725 = 7.25%
    monthly_payment: Mapped[float] = mapped_column(Numeric(12, 2))
    loan_term_months: Mapped[int] = mapped_column(Integer)
    start_date: Mapped[date] = mapped_column(Date)
    maturity_date: Mapped[date] = mapped_column(Date)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True)
    loan_type: Mapped[str] = mapped_column(
        String(50), default="fixed"
    )  # fixed, arm, interest_only
    notes: Mapped[str | None] = mapped_column(Text)

    # Link to Plaid for auto-sync of mortgage balance
    plaid_account_id: Mapped[str | None] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    property: Mapped["Property"] = relationship(back_populates="mortgages")


class PropertyValuation(Base):
    """Historical valuation records for properties."""

    __tablename__ = "property_valuations"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id"), index=True)
    value: Mapped[float] = mapped_column(Numeric(15, 2))
    noi: Mapped[float | None] = mapped_column(Numeric(12, 2))
    cap_rate_used: Mapped[float | None] = mapped_column(Numeric(5, 3))
    valuation_method: Mapped[str] = mapped_column(
        String(50)
    )  # cap_rate, manual, market_comp
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    notes: Mapped[str | None] = mapped_column(Text)

    property: Mapped["Property"] = relationship(back_populates="valuations")
