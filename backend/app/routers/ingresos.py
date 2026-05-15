from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.ingreso import Ingreso
from ..schemas.ingreso import IngresoActualizar, IngresoCrear, IngresoRespuesta

router = APIRouter()


@router.get("/", response_model=list[IngresoRespuesta])
async def listar_ingresos(
    mes: int | None = Query(None, ge=1, le=12),
    anio: int | None = Query(None, ge=2000),
    limite: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(obtener_sesion),
) -> list[IngresoRespuesta]:
    consulta = select(Ingreso).order_by(Ingreso.fecha.desc()).limit(limite)
    if mes is not None:
        consulta = consulta.where(extract("month", Ingreso.fecha) == mes)
    if anio is not None:
        consulta = consulta.where(extract("year", Ingreso.fecha) == anio)

    resultado = await db.execute(consulta)
    return resultado.scalars().all()


@router.post("/", response_model=IngresoRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_ingreso(
    datos: IngresoCrear,
    db: AsyncSession = Depends(obtener_sesion),
) -> IngresoRespuesta:
    ingreso = Ingreso(**datos.model_dump())
    db.add(ingreso)
    await db.commit()
    resultado = await db.execute(select(Ingreso).where(Ingreso.id == ingreso.id))
    return resultado.scalar_one()


@router.patch("/{ingreso_id}", response_model=IngresoRespuesta)
async def actualizar_ingreso(
    ingreso_id: int,
    datos: IngresoActualizar,
    db: AsyncSession = Depends(obtener_sesion),
) -> IngresoRespuesta:
    resultado = await db.execute(select(Ingreso).where(Ingreso.id == ingreso_id))
    ingreso = resultado.scalar_one_or_none()
    if not ingreso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingreso no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(ingreso, campo, valor)
    await db.commit()
    resultado = await db.execute(select(Ingreso).where(Ingreso.id == ingreso_id))
    return resultado.scalar_one()


@router.delete("/{ingreso_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_ingreso(
    ingreso_id: int,
    db: AsyncSession = Depends(obtener_sesion),
) -> None:
    ingreso = await db.get(Ingreso, ingreso_id)
    if not ingreso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingreso no encontrado")
    await db.delete(ingreso)
    await db.commit()
