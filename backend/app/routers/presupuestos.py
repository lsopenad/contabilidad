from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.presupuesto import Presupuesto
from ..schemas.presupuesto import PresupuestoCrear, PresupuestoRespuesta

router = APIRouter()


@router.get("/", response_model=list[PresupuestoRespuesta])
async def listar_presupuestos(
    mes: int | None = Query(None, ge=1, le=12),
    anio: int | None = Query(None, ge=2000),
    db: AsyncSession = Depends(obtener_sesion),
) -> list[PresupuestoRespuesta]:
    consulta = select(Presupuesto).order_by(Presupuesto.anio.desc(), Presupuesto.mes.desc())
    if mes is not None:
        consulta = consulta.where(Presupuesto.mes == mes)
    if anio is not None:
        consulta = consulta.where(Presupuesto.anio == anio)
    resultado = await db.execute(consulta)
    return resultado.scalars().all()


@router.put("/", response_model=PresupuestoRespuesta)
async def upsert_presupuesto(
    datos: PresupuestoCrear,
    db: AsyncSession = Depends(obtener_sesion),
) -> PresupuestoRespuesta:
    stmt = (
        insert(Presupuesto)
        .values(**datos.model_dump())
        .on_conflict_do_update(
            index_elements=["categoria_id", "mes", "anio"],
            set_={"importe": datos.importe},
        )
        .returning(Presupuesto.id)
    )
    resultado = await db.execute(stmt)
    presupuesto_id = resultado.scalar_one()
    await db.commit()
    resultado = await db.execute(select(Presupuesto).where(Presupuesto.id == presupuesto_id))
    return resultado.scalar_one()


@router.delete("/{presupuesto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_presupuesto(
    presupuesto_id: int,
    db: AsyncSession = Depends(obtener_sesion),
) -> None:
    presupuesto = await db.get(Presupuesto, presupuesto_id)
    if not presupuesto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presupuesto no encontrado")
    await db.delete(presupuesto)
    await db.commit()
