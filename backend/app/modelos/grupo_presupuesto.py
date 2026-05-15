from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, ForeignKey, Integer, Numeric, String, Table, UniqueConstraint, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .categoria import Categoria

tabla_grupo_categorias = Table(
    "grupo_categorias",
    Base.metadata,
    Column("grupo_id", Integer, ForeignKey("grupos_presupuesto.id", ondelete="CASCADE"), primary_key=True),
    Column("categoria_id", Integer, ForeignKey("categorias.id", ondelete="CASCADE"), primary_key=True),
)


class GrupoPresupuesto(Base):
    __tablename__ = "grupos_presupuesto"
    __table_args__ = (UniqueConstraint("nombre", "mes", "anio"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    importe: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    anio: Mapped[int] = mapped_column(Integer, nullable=False)
    creado_en: Mapped[Optional[datetime]] = mapped_column(server_default=func.now())
    repeticion_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)

    categorias: Mapped[list["Categoria"]] = relationship(
        "Categoria", secondary=tabla_grupo_categorias, lazy="selectin"
    )
