import calendar
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, extract, func, select
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
    repeticion_id: str | None = Query(None),
    db: AsyncSession = Depends(obtener_sesion),
) -> list[GastoRespuesta]:
    consulta = select(Gasto).order_by(Gasto.fecha.desc()).limit(limite)
    if mes is not None:
        consulta = consulta.where(extract("month", Gasto.fecha) == mes)
    if anio is not None:
        consulta = consulta.where(extract("year", Gasto.fecha) == anio)
    if repeticion_id is not None:
        consulta = consulta.where(Gasto.repeticion_id == repeticion_id)
    resultado = await db.execute(consulta)
    return resultado.scalars().all()


@router.post("/", response_model=GastoRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_gasto(
    datos: GastoCrear,
    db: AsyncSession = Depends(obtener_sesion),
) -> GastoRespuesta:
    meses_extra = datos.meses_extra
    datos_dict = datos.model_dump(exclude={"meses_extra"})

    rep_id = str(uuid.uuid4()) if meses_extra else None
    gasto = Gasto(**datos_dict, repeticion_id=rep_id)
    db.add(gasto)

    for mes in meses_extra:
        max_dia = calendar.monthrange(datos.fecha.year, mes)[1]
        fecha_copia = datos.fecha.replace(month=mes, day=min(datos.fecha.day, max_dia))
        db.add(Gasto(
            importe=datos.importe,
            fecha=fecha_copia,
            categoria_id=datos.categoria_id,
            descripcion=datos.descripcion,
            repeticion_id=rep_id,
        ))

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

    datos_dict = datos.model_dump(exclude_unset=True)
    meses_extra = datos_dict.pop("meses_extra", [])
    meses_eliminar = datos_dict.pop("meses_eliminar", [])

    for campo, valor in datos_dict.items():
        setattr(gasto, campo, valor)

    if meses_eliminar and gasto.repeticion_id:
        for mes_elim in meses_eliminar:
            await db.execute(
                delete(Gasto).where(
                    Gasto.repeticion_id == gasto.repeticion_id,
                    extract("month", Gasto.fecha) == mes_elim,
                    Gasto.id != gasto_id,
                )
            )
        restantes = await db.scalar(
            select(func.count(Gasto.id)).where(
                Gasto.repeticion_id == gasto.repeticion_id,
                Gasto.id != gasto_id,
            )
        )
        if restantes == 0:
            gasto.repeticion_id = None

    if meses_extra:
        if not gasto.repeticion_id:
            gasto.repeticion_id = str(uuid.uuid4())
        for mes in meses_extra:
            max_dia = calendar.monthrange(gasto.fecha.year, mes)[1]
            fecha_copia = gasto.fecha.replace(month=mes, day=min(gasto.fecha.day, max_dia))
            db.add(Gasto(
                importe=gasto.importe,
                fecha=fecha_copia,
                categoria_id=gasto.categoria_id,
                descripcion=gasto.descripcion,
                repeticion_id=gasto.repeticion_id,
            ))

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
