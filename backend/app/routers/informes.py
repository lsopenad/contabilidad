from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.categoria import Categoria
from ..modelos.gasto import Gasto
from ..modelos.ingreso import Ingreso
from ..schemas.informe import GastoCategoria, InformeAnual, ResumenMes

router = APIRouter()


async def _resumen_mes(db: AsyncSession, mes: int, anio: int) -> ResumenMes:
    total_ingresos = await db.scalar(
        select(func.coalesce(func.sum(Ingreso.importe), 0))
        .where(extract("month", Ingreso.fecha) == mes)
        .where(extract("year", Ingreso.fecha) == anio)
    )
    total_gastos = await db.scalar(
        select(func.coalesce(func.sum(Gasto.importe), 0))
        .where(extract("month", Gasto.fecha) == mes)
        .where(extract("year", Gasto.fecha) == anio)
    )
    return ResumenMes(
        mes=mes,
        anio=anio,
        total_ingresos=Decimal(str(total_ingresos)),
        total_gastos=Decimal(str(total_gastos)),
    )


@router.get("/mes", response_model=ResumenMes)
async def resumen_mes(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000),
    db: AsyncSession = Depends(obtener_sesion),
) -> ResumenMes:
    return await _resumen_mes(db, mes, anio)


@router.get("/anual/{anio}", response_model=InformeAnual)
async def informe_anual(
    anio: int,
    db: AsyncSession = Depends(obtener_sesion),
) -> InformeAnual:
    meses = [await _resumen_mes(db, mes, anio) for mes in range(1, 13)]
    total_ingresos = sum(m.total_ingresos for m in meses)
    total_gastos = sum(m.total_gastos for m in meses)
    return InformeAnual(
        anio=anio,
        meses=meses,
        total_ingresos=total_ingresos,
        total_gastos=total_gastos,
        balance=total_ingresos - total_gastos,
    )


@router.get("/gastos-por-categoria", response_model=list[GastoCategoria])
async def gastos_por_categoria(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000),
    db: AsyncSession = Depends(obtener_sesion),
) -> list[GastoCategoria]:
    resultado = await db.execute(
        select(
            Categoria.id,
            Categoria.nombre,
            func.coalesce(func.sum(Gasto.importe), 0).label("total"),
        )
        .join(
            Gasto,
            and_(
                Gasto.categoria_id == Categoria.id,
                extract("month", Gasto.fecha) == mes,
                extract("year", Gasto.fecha) == anio,
            ),
            isouter=True,
        )
        .where(Categoria.tipo.in_(["gasto", "ambos"]))
        .group_by(Categoria.id, Categoria.nombre)
        .having(func.coalesce(func.sum(Gasto.importe), 0) > 0)
        .order_by(func.sum(Gasto.importe).desc())
    )
    filas = resultado.all()
    return [
        GastoCategoria(categoria_id=f.id, categoria_nombre=f.nombre, total=Decimal(str(f.total)))
        for f in filas
    ]
