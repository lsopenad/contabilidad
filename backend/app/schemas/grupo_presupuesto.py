from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator


class CategoriaResumen(BaseModel):
    id: int
    nombre: str
    model_config = {"from_attributes": True}


class GrupoPresupuestoCrear(BaseModel):
    nombre: str
    importe: Decimal
    mes: int
    anio: int
    categoria_ids: list[int] = []

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


class GrupoPresupuestoActualizar(BaseModel):
    nombre: Optional[str] = None
    importe: Optional[Decimal] = None
    categoria_ids: Optional[list[int]] = None

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v


class GrupoPresupuestoRespuesta(BaseModel):
    id: int
    nombre: str
    importe: Decimal
    mes: int
    anio: int
    categorias: list[CategoriaResumen]
    total_gastado: Decimal
