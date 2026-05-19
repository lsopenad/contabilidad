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
    meses_extra: list[int] = []

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
    meses_extra: list[int] = []
    meses_eliminar: list[int] = []

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
    repeticion_id: Optional[str] = None

    model_config = {"from_attributes": True}


class GastoBulkEliminar(BaseModel):
    ids: list[int]


class GastoBulkCategoria(BaseModel):
    ids: list[int]
    categoria_id: Optional[int] = None
