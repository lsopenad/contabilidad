from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.suscripcion import Suscripcion
from ..schemas.suscripcion import SuscripcionActualizar, SuscripcionCrear, SuscripcionRespuesta

router = APIRouter()


@router.get("/", response_model=list[SuscripcionRespuesta])
async def listar_suscripciones(
    db: AsyncSession = Depends(obtener_sesion),
) -> list[SuscripcionRespuesta]:
    resultado = await db.execute(
        select(Suscripcion).order_by(Suscripcion.activa.desc(), Suscripcion.nombre)
    )
    return resultado.scalars().all()


@router.post("/", response_model=SuscripcionRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_suscripcion(
    datos: SuscripcionCrear,
    db: AsyncSession = Depends(obtener_sesion),
) -> SuscripcionRespuesta:
    suscripcion = Suscripcion(**datos.model_dump())
    db.add(suscripcion)
    await db.commit()
    resultado = await db.execute(select(Suscripcion).where(Suscripcion.id == suscripcion.id))
    return resultado.scalar_one()


@router.patch("/{suscripcion_id}", response_model=SuscripcionRespuesta)
async def actualizar_suscripcion(
    suscripcion_id: int,
    datos: SuscripcionActualizar,
    db: AsyncSession = Depends(obtener_sesion),
) -> SuscripcionRespuesta:
    resultado = await db.execute(select(Suscripcion).where(Suscripcion.id == suscripcion_id))
    sus = resultado.scalar_one_or_none()
    if not sus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suscripción no encontrada")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(sus, campo, valor)
    await db.commit()
    resultado = await db.execute(select(Suscripcion).where(Suscripcion.id == suscripcion_id))
    return resultado.scalar_one()


@router.delete("/{suscripcion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_suscripcion(
    suscripcion_id: int,
    db: AsyncSession = Depends(obtener_sesion),
) -> None:
    sus = await db.get(Suscripcion, suscripcion_id)
    if not sus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suscripción no encontrada")
    await db.delete(sus)
    await db.commit()
