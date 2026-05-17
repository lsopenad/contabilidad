from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class CuentaBanco(Base):
    __tablename__ = "cuentas_banco"

    id: Mapped[int] = mapped_column(primary_key=True)
    connection_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    provider_code: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[Optional[datetime]] = mapped_column(server_default=func.now())


class ConfiguracionApp(Base):
    __tablename__ = "configuracion_app"

    clave: Mapped[str] = mapped_column(String(100), primary_key=True)
    valor: Mapped[Optional[str]]
