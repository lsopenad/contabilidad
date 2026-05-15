from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

FrecuenciaSuscripcion = Literal["mensual", "bimestral", "trimestral", "semestral", "anual"]

from .categoria import CategoriaRespuesta


class SuscripcionCrear(BaseModel):
    nombre: str
    importe: Decimal
    categoria_id: Optional[int] = None
    dia_cobro: Optional[int] = None
    frecuencia: FrecuenciaSuscripcion = "mensual"
    activa: bool = True
    notas: Optional[str] = None

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v

    @field_validator("dia_cobro")
    @classmethod
    def dia_valido(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not 1 <= v <= 31:
            raise ValueError("El día debe estar entre 1 y 31")
        return v


class SuscripcionActualizar(BaseModel):
    nombre: Optional[str] = None
    importe: Optional[Decimal] = None
    categoria_id: Optional[int] = None
    dia_cobro: Optional[int] = None
    frecuencia: Optional[FrecuenciaSuscripcion] = None
    activa: Optional[bool] = None
    notas: Optional[str] = None

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v


class SuscripcionRespuesta(BaseModel):
    id: int
    nombre: str
    importe: Decimal
    categoria_id: Optional[int] = None
    dia_cobro: Optional[int] = None
    frecuencia: FrecuenciaSuscripcion = "mensual"
    activa: bool
    notas: Optional[str] = None
    creado_en: Optional[datetime] = None
    categoria: Optional[CategoriaRespuesta] = None

    model_config = {"from_attributes": True}
