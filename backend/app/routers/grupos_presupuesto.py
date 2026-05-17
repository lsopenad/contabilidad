import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.categoria import Categoria
from ..modelos.gasto import Gasto
from ..modelos.grupo_presupuesto import GrupoPresupuesto
from ..schemas.grupo_presupuesto import (
    CategoriaResumen,
    GrupoPresupuestoActualizar,
    GrupoPresupuestoCrear,
    GrupoPresupuestoRespuesta,
)

router = APIRouter()


async def _total_gastado(grupo: GrupoPresupuesto, mes: int, anio: int, db: AsyncSession) -> Decimal:
    cat_ids = [c.id for c in grupo.categorias]
    if not cat_ids:
        return Decimal("0")
    total = await db.scalar(
        select(func.coalesce(func.sum(Gasto.importe), 0))
        .where(
            Gasto.categoria_id.in_(cat_ids),
            extract("month", Gasto.fecha) == mes,
            extract("year", Gasto.fecha) == anio,
        )
    )
    return Decimal(str(total))


async def _respuesta(grupo: GrupoPresupuesto, mes: int, anio: int, db: AsyncSession) -> GrupoPresupuestoRespuesta:
    return GrupoPresupuestoRespuesta(
        id=grupo.id,
        nombre=grupo.nombre,
        importe=grupo.importe,
        mes=grupo.mes,
        anio=grupo.anio,
        categorias=[CategoriaResumen(id=c.id, nombre=c.nombre) for c in grupo.categorias],
        total_gastado=await _total_gastado(grupo, mes, anio, db),
        repeticion_id=grupo.repeticion_id,
    )


@router.get("/", response_model=list[GrupoPresupuestoRespuesta])
async def listar_grupos(
    mes: int | None = Query(None, ge=1, le=12),
    anio: int | None = Query(None, ge=2000),
    repeticion_id: str | None = Query(None),
    db: AsyncSession = Depends(obtener_sesion),
) -> list[GrupoPresupuestoRespuesta]:
    consulta = select(GrupoPresupuesto).order_by(GrupoPresupuesto.nombre)
    if mes is not None:
        consulta = consulta.where(GrupoPresupuesto.mes == mes)
    if anio is not None:
        consulta = consulta.where(GrupoPresupuesto.anio == anio)
    if repeticion_id is not None:
        consulta = consulta.where(GrupoPresupuesto.repeticion_id == repeticion_id)
    grupos = (await db.execute(consulta)).scalars().all()
    return [await _respuesta(g, g.mes, g.anio, db) for g in grupos]


@router.post("/", response_model=GrupoPresupuestoRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_grupo(
    datos: GrupoPresupuestoCrear,
    db: AsyncSession = Depends(obtener_sesion),
) -> GrupoPresupuestoRespuesta:
    meses_extra = datos.meses_extra
    rep_id = str(uuid.uuid4()) if meses_extra else None

    cats: list[Categoria] = []
    if datos.categoria_ids:
        cats = list((await db.execute(select(Categoria).where(Categoria.id.in_(datos.categoria_ids)))).scalars().all())

    grupo = GrupoPresupuesto(
        nombre=datos.nombre,
        importe=datos.importe,
        mes=datos.mes,
        anio=datos.anio,
        repeticion_id=rep_id,
        categorias=cats,
    )
    db.add(grupo)

    for mes_copia in meses_extra:
        copia = GrupoPresupuesto(
            nombre=datos.nombre,
            importe=datos.importe,
            mes=mes_copia,
            anio=datos.anio,
            repeticion_id=rep_id,
            categorias=cats,
        )
        db.add(copia)

    await db.commit()
    await db.refresh(grupo)
    return await _respuesta(grupo, datos.mes, datos.anio, db)


@router.patch("/{grupo_id}", response_model=GrupoPresupuestoRespuesta)
async def actualizar_grupo(
    grupo_id: int,
    datos: GrupoPresupuestoActualizar,
    db: AsyncSession = Depends(obtener_sesion),
) -> GrupoPresupuestoRespuesta:
    grupo = await db.get(GrupoPresupuesto, grupo_id)
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    if datos.nombre is not None:
        grupo.nombre = datos.nombre
    if datos.importe is not None:
        grupo.importe = datos.importe
    if datos.categoria_ids is not None:
        cats = (await db.execute(select(Categoria).where(Categoria.id.in_(datos.categoria_ids)))).scalars().all()
        grupo.categorias = list(cats)
    if datos.meses_eliminar and grupo.repeticion_id:
        await db.execute(
            delete(GrupoPresupuesto).where(
                GrupoPresupuesto.repeticion_id == grupo.repeticion_id,
                GrupoPresupuesto.mes.in_(datos.meses_eliminar),
                GrupoPresupuesto.id != grupo_id,
            )
        )
        restantes = await db.scalar(
            select(func.count(GrupoPresupuesto.id)).where(
                GrupoPresupuesto.repeticion_id == grupo.repeticion_id,
                GrupoPresupuesto.id != grupo_id,
            )
        )
        if restantes == 0:
            grupo.repeticion_id = None

    if datos.meses_extra:
        if not grupo.repeticion_id:
            grupo.repeticion_id = str(uuid.uuid4())
        cats_actuales = list(grupo.categorias)
        for mes_copia in datos.meses_extra:
            copia = GrupoPresupuesto(
                nombre=grupo.nombre,
                importe=grupo.importe,
                mes=mes_copia,
                anio=grupo.anio,
                repeticion_id=grupo.repeticion_id,
                categorias=cats_actuales,
            )
            db.add(copia)

    await db.commit()
    await db.refresh(grupo)
    return await _respuesta(grupo, grupo.mes, grupo.anio, db)


@router.delete("/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_grupo(
    grupo_id: int,
    db: AsyncSession = Depends(obtener_sesion),
) -> None:
    grupo = await db.get(GrupoPresupuesto, grupo_id)
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    await db.delete(grupo)
    await db.commit()
