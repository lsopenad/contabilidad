from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.gasto import Gasto
from ..schemas.gasto import GastoActualizar, GastoCrear, GastoRespuesta

router = APIRouter()


@router.get("/", response_model=list[GastoRespuesta])
async def listar_gastos(
    mes: int | None = Query(None, ge=1, le=12),
    anio: int | None = Query(None, ge=2000),
    limite: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(obtener_sesion),
) -> list[GastoRespuesta]:
    consulta = select(Gasto).order_by(Gasto.fecha.desc()).limit(limite)
    if mes is not None:
        consulta = consulta.where(extract("month", Gasto.fecha) == mes)
    if anio is not None:
        consulta = consulta.where(extract("year", Gasto.fecha) == anio)
    resultado = await db.execute(consulta)
    return resultado.scalars().all()


@router.post("/", response_model=GastoRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_gasto(
    datos: GastoCrear,
    db: AsyncSession = Depends(obtener_sesion),
) -> GastoRespuesta:
    gasto = Gasto(**datos.model_dump())
    db.add(gasto)
    await db.commit()
    resultado = await db.execute(select(Gasto).where(Gasto.id == gasto.id))
    return resultado.scalar_one()


@router.patch("/{gasto_id}", response_model=GastoRespuesta)
async def actualizar_gasto(
    gasto_id: int,
    datos: GastoActualizar,
    db: AsyncSession = Depends(obtener_sesion),
) -> GastoRespuesta:
    resultado = await db.execute(select(Gasto).where(Gasto.id == gasto_id))
    gasto = resultado.scalar_one_or_none()
    if not gasto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gasto no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(gasto, campo, valor)
    await db.commit()
    resultado = await db.execute(select(Gasto).where(Gasto.id == gasto_id))
    return resultado.scalar_one()


@router.delete("/{gasto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_gasto(
    gasto_id: int,
    db: AsyncSession = Depends(obtener_sesion),
) -> None:
    gasto = await db.get(Gasto, gasto_id)
    if not gasto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gasto no encontrado")
    await db.delete(gasto)
    await db.commit()
