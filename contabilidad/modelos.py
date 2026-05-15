from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


@dataclass
class Categoria:
    id: int
    nombre: str
    tipo: str  # 'ingreso' | 'gasto' | 'ambos'
    creado_en: Optional[datetime] = None


@dataclass
class Cliente:
    id: int
    nombre: str
    nif: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    creado_en: Optional[datetime] = None


@dataclass
class Ingreso:
    importe: Decimal
    fecha: date
    id: Optional[int] = None
    categoria_id: Optional[int] = None
    descripcion: Optional[str] = None
    creado_en: Optional[datetime] = None


@dataclass
class Gasto:
    importe: Decimal
    fecha: date
    id: Optional[int] = None
    categoria_id: Optional[int] = None
    descripcion: Optional[str] = None
    creado_en: Optional[datetime] = None


@dataclass
class Factura:
    numero: str
    importe_base: Decimal
    importe_total: Decimal
    fecha: date
    id: Optional[int] = None
    cliente_id: Optional[int] = None
    iva_porcentaje: Decimal = Decimal("21.00")
    estado: str = "pendiente"
    descripcion: Optional[str] = None
    creado_en: Optional[datetime] = None


@dataclass
class Presupuesto:
    categoria_id: int
    importe: Decimal
    mes: int
    anio: int
    id: Optional[int] = None
    creado_en: Optional[datetime] = None


@dataclass
class ResumenMes:
    mes: int
    anio: int
    total_ingresos: Decimal = Decimal("0")
    total_gastos: Decimal = Decimal("0")
    total_facturas_emitidas: Decimal = Decimal("0")
    facturas_pendientes: int = 0

    @property
    def balance(self) -> Decimal:
        return self.total_ingresos - self.total_gastos
