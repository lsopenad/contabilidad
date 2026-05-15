import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
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
    repeticion_id: str | None = Query(None),
    db: AsyncSession = Depends(obtener_sesion),
) -> list[PresupuestoRespuesta]:
    consulta = select(Presupuesto).order_by(Presupuesto.anio.desc(), Presupuesto.mes.desc())
    if mes is not None:
        consulta = consulta.where(Presupuesto.mes == mes)
    if anio is not None:
        consulta = consulta.where(Presupuesto.anio == anio)
    if repeticion_id is not None:
        consulta = consulta.where(Presupuesto.repeticion_id == repeticion_id)
    resultado = await db.execute(consulta)
    return resultado.scalars().all()


@router.put("/", response_model=PresupuestoRespuesta)
async def upsert_presupuesto(
    datos: PresupuestoCrear,
    db: AsyncSession = Depends(obtener_sesion),
) -> PresupuestoRespuesta:
    meses_extra = datos.meses_extra
    meses_eliminar = datos.meses_eliminar
    datos_dict = datos.model_dump(exclude={"meses_extra", "meses_eliminar"})

    stmt = (
        insert(Presupuesto)
        .values(**datos_dict)
        .on_conflict_do_update(
            index_elements=["categoria_id", "mes", "anio"],
            set_={"importe": datos.importe},
        )
        .returning(Presupuesto.id)
    )
    resultado = await db.execute(stmt)
    presupuesto_id = resultado.scalar_one()

    if meses_extra:
        rep_id = str(uuid.uuid4())
        await db.execute(
            Presupuesto.__table__.update()
            .where(Presupuesto.id == presupuesto_id)
            .values(repeticion_id=rep_id)
        )
        for mes_copia in meses_extra:
            stmt_copia = (
                insert(Presupuesto)
                .values(
                    categoria_id=datos.categoria_id,
                    importe=datos.importe,
                    mes=mes_copia,
                    anio=datos.anio,
                    repeticion_id=rep_id,
                )
                .on_conflict_do_nothing(index_elements=["categoria_id", "mes", "anio"])
            )
            await db.execute(stmt_copia)

    if meses_eliminar:
        rep_id_actual = await db.scalar(
            select(Presupuesto.repeticion_id).where(Presupuesto.id == presupuesto_id)
        )
        if rep_id_actual:
            await db.execute(
                delete(Presupuesto).where(
                    Presupuesto.repeticion_id == rep_id_actual,
                    Presupuesto.mes.in_(meses_eliminar),
                )
            )
            restantes = await db.scalar(
                select(func.count(Presupuesto.id)).where(
                    Presupuesto.repeticion_id == rep_id_actual,
                    Presupuesto.id != presupuesto_id,
                )
            )
            if restantes == 0:
                await db.execute(
                    Presupuesto.__table__.update()
                    .where(Presupuesto.id == presupuesto_id)
                    .values(repeticion_id=None)
                )

    await db.commit()
    resultado = await db.execute(select(Presupuesto).where(Presupuesto.id == presupuesto_id))
    return resultado.scalar_one()


@router.delete("/repeticion/{repeticion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancelar_repeticion_presupuesto(
    repeticion_id: str,
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000),
    db: AsyncSession = Depends(obtener_sesion),
) -> None:
    await db.execute(
        delete(Presupuesto).where(
            Presupuesto.repeticion_id == repeticion_id,
            (Presupuesto.anio > anio) | ((Presupuesto.anio == anio) & (Presupuesto.mes > mes)),
        )
    )
    await db.execute(
        Presupuesto.__table__.update()
        .where(Presupuesto.repeticion_id == repeticion_id, Presupuesto.mes == mes, Presupuesto.anio == anio)
        .values(repeticion_id=None)
    )
    await db.commit()


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
