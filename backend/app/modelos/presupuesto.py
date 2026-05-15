from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Presupuesto(Base):
    __tablename__ = "presupuestos"
    __table_args__ = (UniqueConstraint("categoria_id", "mes", "anio"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    categoria_id: Mapped[int] = mapped_column(ForeignKey("categorias.id"), nullable=False)
    importe: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    anio: Mapped[int] = mapped_column(Integer, nullable=False)
    creado_en: Mapped[Optional[datetime]] = mapped_column(server_default=func.now())
    repeticion_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)

    categoria: Mapped["Categoria"] = relationship("Categoria", lazy="joined")  # noqa: F821
