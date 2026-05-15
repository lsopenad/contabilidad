import calendar
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, extract, func, select
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
    repeticion_id: str | None = Query(None),
    db: AsyncSession = Depends(obtener_sesion),
) -> list[IngresoRespuesta]:
    consulta = select(Ingreso).order_by(Ingreso.fecha.desc()).limit(limite)
    if mes is not None:
        consulta = consulta.where(extract("month", Ingreso.fecha) == mes)
    if anio is not None:
        consulta = consulta.where(extract("year", Ingreso.fecha) == anio)
    if repeticion_id is not None:
        consulta = consulta.where(Ingreso.repeticion_id == repeticion_id)
    resultado = await db.execute(consulta)
    return resultado.scalars().all()


@router.post("/", response_model=IngresoRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_ingreso(
    datos: IngresoCrear,
    db: AsyncSession = Depends(obtener_sesion),
) -> IngresoRespuesta:
    meses_extra = datos.meses_extra
    datos_dict = datos.model_dump(exclude={"meses_extra"})

    rep_id = str(uuid.uuid4()) if meses_extra else None
    ingreso = Ingreso(**datos_dict, repeticion_id=rep_id)
    db.add(ingreso)

    for mes in meses_extra:
        max_dia = calendar.monthrange(datos.fecha.year, mes)[1]
        fecha_copia = datos.fecha.replace(month=mes, day=min(datos.fecha.day, max_dia))
        db.add(Ingreso(
            importe=datos.importe,
            fecha=fecha_copia,
            categoria_id=datos.categoria_id,
            descripcion=datos.descripcion,
            repeticion_id=rep_id,
        ))

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

    datos_dict = datos.model_dump(exclude_unset=True)
    meses_extra = datos_dict.pop("meses_extra", [])
    meses_eliminar = datos_dict.pop("meses_eliminar", [])

    for campo, valor in datos_dict.items():
        setattr(ingreso, campo, valor)

    if meses_eliminar and ingreso.repeticion_id:
        for mes_elim in meses_eliminar:
            await db.execute(
                delete(Ingreso).where(
                    Ingreso.repeticion_id == ingreso.repeticion_id,
                    extract("month", Ingreso.fecha) == mes_elim,
                    Ingreso.id != ingreso_id,
                )
            )
        restantes = await db.scalar(
            select(func.count(Ingreso.id)).where(
                Ingreso.repeticion_id == ingreso.repeticion_id,
                Ingreso.id != ingreso_id,
            )
        )
        if restantes == 0:
            ingreso.repeticion_id = None

    if meses_extra:
        if not ingreso.repeticion_id:
            ingreso.repeticion_id = str(uuid.uuid4())
        for mes in meses_extra:
            max_dia = calendar.monthrange(ingreso.fecha.year, mes)[1]
            fecha_copia = ingreso.fecha.replace(month=mes, day=min(ingreso.fecha.day, max_dia))
            db.add(Ingreso(
                importe=ingreso.importe,
                fecha=fecha_copia,
                categoria_id=ingreso.categoria_id,
                descripcion=ingreso.descripcion,
                repeticion_id=ingreso.repeticion_id,
            ))

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
