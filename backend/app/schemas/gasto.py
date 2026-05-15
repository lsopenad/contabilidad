from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from .categoria import CategoriaRespuesta


class GastoBase(BaseModel):
    importe: Decimal
    fecha: date
    categoria_id: Optional[int] = None
    descripcion: Optional[str] = None


class GastoCrear(GastoBase):
    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v


class GastoActualizar(BaseModel):
    importe: Optional[Decimal] = None
    fecha: Optional[date] = None
    categoria_id: Optional[int] = None
    descripcion: Optional[str] = None

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v


class GastoRespuesta(GastoBase):
    id: int
    creado_en: Optional[datetime] = None
    categoria: Optional[CategoriaRespuesta] = None

    model_config = {"from_attributes": True}
