from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

FrecuenciaSuscripcion = Literal["mensual", "bimestral", "trimestral", "semestral", "anual"]


class SuscripcionCrear(BaseModel):
    nombre: str
    importe: Decimal
    dia_cobro: Optional[int] = None
    frecuencia: FrecuenciaSuscripcion = "mensual"
    fecha_inicio: Optional[date] = None
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
    dia_cobro: Optional[int] = None
    frecuencia: Optional[FrecuenciaSuscripcion] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    activa: Optional[bool] = None
    notas: Optional[str] = None

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v

    @field_validator("dia_cobro")
    @classmethod
    def dia_valido(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not 1 <= v <= 31:
            raise ValueError("El día debe estar entre 1 y 31")
        return v


class SuscripcionRespuesta(BaseModel):
    id: int
    nombre: str
    importe: Decimal
    dia_cobro: Optional[int] = None
    frecuencia: FrecuenciaSuscripcion = "mensual"
    fecha_inicio: Optional[date] = None
    activa: bool
    fecha_fin: Optional[date] = None
    notas: Optional[str] = None
    creado_en: Optional[datetime] = None

    model_config = {"from_attributes": True}
