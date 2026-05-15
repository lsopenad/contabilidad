from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.categoria import Categoria
from ..modelos.gasto import Gasto
from ..modelos.grupo_presupuesto import GrupoPresupuesto, tabla_grupo_categorias
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
    )


@router.get("/", response_model=list[GrupoPresupuestoRespuesta])
async def listar_grupos(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000),
    db: AsyncSession = Depends(obtener_sesion),
) -> list[GrupoPresupuestoRespuesta]:
    grupos = (await db.execute(
        select(GrupoPresupuesto)
        .where(GrupoPresupuesto.mes == mes, GrupoPresupuesto.anio == anio)
        .order_by(GrupoPresupuesto.nombre)
    )).scalars().all()
    return [await _respuesta(g, mes, anio, db) for g in grupos]


@router.post("/", response_model=GrupoPresupuestoRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_grupo(
    datos: GrupoPresupuestoCrear,
    db: AsyncSession = Depends(obtener_sesion),
) -> GrupoPresupuestoRespuesta:
    grupo = GrupoPresupuesto(
        nombre=datos.nombre,
        importe=datos.importe,
        mes=datos.mes,
        anio=datos.anio,
    )
    if datos.categoria_ids:
        cats = (await db.execute(select(Categoria).where(Categoria.id.in_(datos.categoria_ids)))).scalars().all()
        grupo.categorias = list(cats)
    db.add(grupo)
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
