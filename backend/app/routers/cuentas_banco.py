from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import config
from ..database import obtener_sesion
from ..modelos.cuenta_banco import ConfiguracionApp, CuentaBanco
from ..schemas.cuenta_banco import (
    CompletarConexionRequest,
    CuentaBancoRespuesta,
    IniciarConexionRequest,
    IniciarConexionRespuesta,
    ProveedorRespuesta,
)

router = APIRouter()

_BASE_URL = "https://www.saltedge.com/api/v6"
_CLAVE_CUSTOMER = "salt_edge_customer_id"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _cabeceras() -> dict[str, str]:
    if not config.salt_edge_app_id or not config.salt_edge_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Salt Edge no configurado: falta SALT_EDGE_APP_ID o SALT_EDGE_SECRET",
        )
    return {
        "App-id": config.salt_edge_app_id,
        "Secret": config.salt_edge_secret,
        "Content-Type": "application/json",
    }


async def _obtener_o_crear_customer(db: AsyncSession) -> str:
    """Devuelve el customer_id de Salt Edge, creándolo si no existe."""
    fila = await db.get(ConfiguracionApp, _CLAVE_CUSTOMER)
    if fila and fila.valor:
        return fila.valor

    async with httpx.AsyncClient() as cliente:
        resp = await cliente.post(
            f"{_BASE_URL}/customers",
            json={"data": {"identifier": "contabilidad-personal"}},
            headers=_cabeceras(),
        )
        resp.raise_for_status()
        customer_id = str(resp.json()["data"]["id"])

    if fila:
        fila.valor = customer_id
    else:
        db.add(ConfiguracionApp(clave=_CLAVE_CUSTOMER, valor=customer_id))
    await db.commit()
    return customer_id


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/proveedores", response_model=list[ProveedorRespuesta])
async def listar_proveedores(query: str = "") -> list[ProveedorRespuesta]:
    async with httpx.AsyncClient() as cliente:
        resp = await cliente.get(
            f"{_BASE_URL}/providers",
            params={"country_code": "ES"},
            headers=_cabeceras(),
        )
        resp.raise_for_status()
        proveedores = resp.json().get("data", [])

    if query:
        q = query.lower()
        proveedores = [p for p in proveedores if q in p.get("name", "").lower()]

    return [
        ProveedorRespuesta(
            code=p["code"],
            name=p["name"],
            country_code=p.get("country_code", "ES"),
            logo_url=p.get("logo_url"),
        )
        for p in proveedores
    ]


@router.post("/iniciar", response_model=IniciarConexionRespuesta)
async def iniciar_conexion(
    datos: IniciarConexionRequest,
    db: AsyncSession = Depends(obtener_sesion),
) -> IniciarConexionRespuesta:
    customer_id = await _obtener_o_crear_customer(db)

    async with httpx.AsyncClient() as cliente:
        resp = await cliente.post(
            f"{_BASE_URL}/oauth_providers",
            json={
                "data": {
                    "customer_id": customer_id,
                    "country_code": "ES",
                    "provider_code": datos.provider_code,
                    "return_to": datos.redirect_url,
                    "fetch_scopes": ["transactions", "accounts"],
                }
            },
            headers=_cabeceras(),
        )
        resp.raise_for_status()
        resp_data = resp.json()["data"]

    return IniciarConexionRespuesta(
        connect_url=resp_data["connect_url"],
        connection_id=str(resp_data["connection_id"]),
    )


@router.post("/completar", response_model=CuentaBancoRespuesta)
async def completar_conexion(
    datos: CompletarConexionRequest,
    db: AsyncSession = Depends(obtener_sesion),
) -> CuentaBancoRespuesta:
    async with httpx.AsyncClient() as cliente:
        resp = await cliente.get(
            f"{_BASE_URL}/connections/{datos.connection_id}",
            headers=_cabeceras(),
        )
        resp.raise_for_status()
        conn_data = resp.json()["data"]

    provider_code = conn_data.get("provider_code", "")
    provider_name = conn_data.get("provider_name") or provider_code
    conn_status = conn_data.get("status", "active")
    next_refresh = conn_data.get("next_refresh_possible_at")
    expires_at: datetime | None = None
    if next_refresh:
        try:
            expires_at = datetime.fromisoformat(next_refresh.replace("Z", "+00:00"))
        except ValueError:
            pass

    cuenta_existente = await db.scalar(
        select(CuentaBanco).where(CuentaBanco.connection_id == datos.connection_id)
    )
    if cuenta_existente:
        cuenta_existente.status = conn_status
        cuenta_existente.expires_at = expires_at
        await db.commit()
        return CuentaBancoRespuesta.model_validate(cuenta_existente)

    cuenta = CuentaBanco(
        connection_id=datos.connection_id,
        provider_code=provider_code,
        provider_name=provider_name,
        status=conn_status,
        expires_at=expires_at,
    )
    db.add(cuenta)
    await db.commit()
    await db.refresh(cuenta)
    return CuentaBancoRespuesta.model_validate(cuenta)


@router.post("/{cuenta_id}/reconectar", response_model=IniciarConexionRespuesta)
async def reconectar_cuenta(
    cuenta_id: int,
    datos: IniciarConexionRequest,
    db: AsyncSession = Depends(obtener_sesion),
) -> IniciarConexionRespuesta:
    cuenta = await db.get(CuentaBanco, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada")

    async with httpx.AsyncClient() as cliente:
        resp = await cliente.put(
            f"{_BASE_URL}/oauth_providers/{cuenta.connection_id}/reconnect",
            json={"data": {"return_to": datos.redirect_url}},
            headers=_cabeceras(),
        )
        resp.raise_for_status()
        resp_data = resp.json()["data"]

    return IniciarConexionRespuesta(
        connect_url=resp_data["connect_url"],
        connection_id=str(resp_data["connection_id"]),
    )


@router.get("/", response_model=list[CuentaBancoRespuesta])
async def listar_cuentas(
    db: AsyncSession = Depends(obtener_sesion),
) -> list[CuentaBancoRespuesta]:
    resultado = await db.execute(select(CuentaBanco).order_by(CuentaBanco.creado_en))
    return [CuentaBancoRespuesta.model_validate(c) for c in resultado.scalars().all()]


@router.delete("/{cuenta_id}", status_code=status.HTTP_204_NO_CONTENT)
async def desconectar_cuenta(
    cuenta_id: int,
    db: AsyncSession = Depends(obtener_sesion),
) -> None:
    cuenta = await db.get(CuentaBanco, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada")

    async with httpx.AsyncClient() as cliente:
        await cliente.delete(
            f"{_BASE_URL}/connections/{cuenta.connection_id}",
            headers=_cabeceras(),
        )

    await db.delete(cuenta)
    await db.commit()
