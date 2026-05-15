from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from .categoria import CategoriaRespuesta


class PresupuestoCrear(BaseModel):
    categoria_id: int
    importe: Decimal
    mes: int
    anio: int

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v

    @field_validator("mes")
    @classmethod
    def mes_valido(cls, v: int) -> int:
        if not 1 <= v <= 12:
            raise ValueError("El mes debe estar entre 1 y 12")
        return v


class PresupuestoRespuesta(BaseModel):
    id: int
    categoria_id: int
    importe: Decimal
    mes: int
    anio: int
    creado_en: Optional[datetime] = None
    categoria: Optional[CategoriaRespuesta] = None

    model_config = {"from_attributes": True}
