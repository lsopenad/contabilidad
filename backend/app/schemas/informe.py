from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class ResumenMes(BaseModel):
    mes: int
    anio: int
    total_ingresos: Decimal = Decimal("0")
    total_gastos: Decimal = Decimal("0")


class GastoCategoria(BaseModel):
    categoria_id: Optional[int] = None
    categoria_nombre: str
    total: Decimal


class InformeAnual(BaseModel):
    anio: int
    meses: list[ResumenMes]
    total_ingresos: Decimal
    total_gastos: Decimal
    balance: Decimal
