from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel


class TransaccionPreview(BaseModel):
    indice: int
    fecha: date
    descripcion: str
    importe: Decimal
    tipo: Literal["ingreso", "gasto"]
    categoria_id: Optional[int] = None
    es_duplicado: bool = False
    es_posible_suscripcion: bool = False


class PreviewResponse(BaseModel):
    transacciones: list[TransaccionPreview]
    omitidas: int


class TransaccionConfirmar(BaseModel):
    fecha: date
    descripcion: str
    importe: Decimal
    tipo: Literal["ingreso", "gasto"]
    categoria_id: Optional[int] = None


class ConfirmarRequest(BaseModel):
    transacciones: list[TransaccionConfirmar]


class ConfirmarResponse(BaseModel):
    ingresos_creados: int
    gastos_creados: int
