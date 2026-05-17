from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Ingreso(Base):
    __tablename__ = "ingresos"

    id: Mapped[int] = mapped_column(primary_key=True)
    importe: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    categoria_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categorias.id"))
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    creado_en: Mapped[Optional[datetime]] = mapped_column(server_default=func.now())
    repeticion_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, unique=True)

    categoria: Mapped[Optional["Categoria"]] = relationship("Categoria", lazy="joined")  # noqa: F821
