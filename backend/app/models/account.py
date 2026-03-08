import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Numeric, ForeignKey, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AccountType(str, enum.Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    BROKERAGE = "brokerage"
    RETIREMENT_401K = "401k"
    RETIREMENT_IRA = "ira"
    RETIREMENT_ROTH = "roth_ira"
    HSA = "hsa"
    LOAN = "loan"
    MORTGAGE = "mortgage"
    OTHER = "other"


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    institution_name: Mapped[str | None] = mapped_column(String(255))
    account_type: Mapped[AccountType] = mapped_column(Enum(AccountType))
    balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    is_liability: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="accounts")  # noqa: F821
    snapshots: Mapped[list["AccountSnapshot"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class AccountSnapshot(Base):
    """Historical balance snapshots for trend tracking."""

    __tablename__ = "account_snapshots"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    balance: Mapped[float] = mapped_column(Numeric(15, 2))
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    account: Mapped["Account"] = relationship(back_populates="snapshots")
