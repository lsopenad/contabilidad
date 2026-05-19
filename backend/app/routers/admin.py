from fastapi import APIRouter, Depends, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.gasto import Gasto
from ..modelos.ingreso import Ingreso

router = APIRouter()


@router.get("/conteo")
async def obtener_conteo(db: AsyncSession = Depends(obtener_sesion)):
    total_gastos = await db.scalar(select(func.count()).select_from(Gasto))
    total_ingresos = await db.scalar(select(func.count()).select_from(Ingreso))
    return {"gastos": total_gastos, "ingresos": total_ingresos}


@router.delete("/datos", status_code=status.HTTP_204_NO_CONTENT)
async def borrar_todos_los_datos(db: AsyncSession = Depends(obtener_sesion)):
    await db.execute(delete(Gasto))
    await db.execute(delete(Ingreso))
    await db.commit()
