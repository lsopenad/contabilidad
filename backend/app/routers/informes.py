from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.categoria import Categoria
from ..modelos.gasto import Gasto
from ..modelos.ingreso import Ingreso
from ..modelos.suscripcion import Suscripcion
from ..schemas.informe import GastoCategoria, InformeAnual, ResumenMes

_FACTOR_MENSUAL: dict[str, int] = {
    "mensual": 1, "bimestral": 2, "trimestral": 3, "semestral": 6, "anual": 12,
}


async def _total_mensual_suscripciones(db: AsyncSession) -> Decimal:
    subs = (await db.execute(select(Suscripcion).where(Suscripcion.activa.is_(True)))).scalars().all()
    return sum(
        Decimal(str(s.importe)) / Decimal(_FACTOR_MENSUAL.get(s.frecuencia or "mensual", 1))
        for s in subs
    ) or Decimal("0")

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
    total_suscripciones = await _total_mensual_suscripciones(db)
    return ResumenMes(
        mes=mes,
        anio=anio,
        total_ingresos=Decimal(str(total_ingresos)),
        total_gastos=Decimal(str(total_gastos)),
        total_suscripciones=total_suscripciones,
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
    filas_ingresos = (await db.execute(
        select(
            extract("month", Ingreso.fecha).label("mes"),
            func.sum(Ingreso.importe).label("total"),
        )
        .where(extract("year", Ingreso.fecha) == anio)
        .group_by(extract("month", Ingreso.fecha))
    )).all()

    filas_gastos = (await db.execute(
        select(
            extract("month", Gasto.fecha).label("mes"),
            func.sum(Gasto.importe).label("total"),
        )
        .where(extract("year", Gasto.fecha) == anio)
        .group_by(extract("month", Gasto.fecha))
    )).all()

    ingresos_por_mes = {int(f.mes): Decimal(str(f.total)) for f in filas_ingresos}
    gastos_por_mes = {int(f.mes): Decimal(str(f.total)) for f in filas_gastos}
    sus_mensual = await _total_mensual_suscripciones(db)

    meses = [
        ResumenMes(
            mes=m,
            anio=anio,
            total_ingresos=ingresos_por_mes.get(m, Decimal("0")),
            total_gastos=gastos_por_mes.get(m, Decimal("0")),
            total_suscripciones=sus_mensual,
        )
        for m in range(1, 13)
    ]
    total_ingresos = sum(r.total_ingresos for r in meses)
    total_gastos = sum(r.total_gastos for r in meses)
    total_suscripciones = sus_mensual * 12
    return InformeAnual(
        anio=anio,
        meses=meses,
        total_ingresos=total_ingresos,
        total_gastos=total_gastos,
        total_suscripciones=total_suscripciones,
        balance=total_ingresos - total_gastos - total_suscripciones,
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
