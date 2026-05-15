from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Suscripcion(Base):
    __tablename__ = "suscripciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    importe: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    categoria_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categorias.id"))
    dia_cobro: Mapped[Optional[int]] = mapped_column(Integer)
    frecuencia: Mapped[str] = mapped_column(String(20), nullable=False, server_default="mensual")
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    notas: Mapped[Optional[str]] = mapped_column(Text)
    creado_en: Mapped[Optional[datetime]] = mapped_column(server_default=func.now())

    categoria: Mapped[Optional["Categoria"]] = relationship("Categoria", lazy="joined")  # noqa: F821
