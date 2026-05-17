from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Date, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Suscripcion(Base):
    __tablename__ = "suscripciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    importe: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    dia_cobro: Mapped[Optional[int]] = mapped_column(Integer)
    frecuencia: Mapped[str] = mapped_column(String(20), nullable=False, server_default="mensual")
    fecha_inicio: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    fecha_fin: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notas: Mapped[Optional[str]] = mapped_column(Text)
    creado_en: Mapped[Optional[datetime]] = mapped_column(server_default=func.now())
