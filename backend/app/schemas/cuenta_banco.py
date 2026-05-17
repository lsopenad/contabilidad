from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProveedorRespuesta(BaseModel):
    code: str
    name: str
    country_code: str
    logo_url: Optional[str] = None


class IniciarConexionRequest(BaseModel):
    provider_code: str
    redirect_url: str


class IniciarConexionRespuesta(BaseModel):
    connect_url: str
    connection_id: str


class CompletarConexionRequest(BaseModel):
    connection_id: str


class CuentaBancoRespuesta(BaseModel):
    id: int
    connection_id: str
    provider_code: str
    provider_name: str
    status: str
    expires_at: Optional[datetime] = None
    creado_en: Optional[datetime] = None

    model_config = {"from_attributes": True}
