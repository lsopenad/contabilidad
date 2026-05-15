import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import obtener_sesion
from ..modelos.gasto import Gasto
from ..modelos.ingreso import Ingreso

router = APIRouter()

_CABECERA_FILL = PatternFill(start_color="1E1E2E", end_color="1E1E2E", fill_type="solid")
_CABECERA_FONT = Font(color="4EC9B0", bold=True)


def _cabecera(hoja, columnas: list[str]) -> None:
    for col, nombre in enumerate(columnas, 1):
        celda = hoja.cell(row=1, column=col, value=nombre)
        celda.font = _CABECERA_FONT
        celda.fill = _CABECERA_FILL


@router.get("/mes")
async def exportar_mes(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000),
    db: AsyncSession = Depends(obtener_sesion),
) -> StreamingResponse:
    ingresos = (await db.execute(
        select(Ingreso).where(
            extract("month", Ingreso.fecha) == mes,
            extract("year", Ingreso.fecha) == anio,
        ).order_by(Ingreso.fecha)
    )).scalars().all()

    gastos = (await db.execute(
        select(Gasto).where(
            extract("month", Gasto.fecha) == mes,
            extract("year", Gasto.fecha) == anio,
        ).order_by(Gasto.fecha)
    )).scalars().all()

    libro = Workbook()

    hoja_ingresos = libro.active
    hoja_ingresos.title = "Ingresos"
    _cabecera(hoja_ingresos, ["Fecha", "Importe (€)", "Categoría", "Descripción"])
    for fila, ing in enumerate(ingresos, 2):
        hoja_ingresos.cell(fila, 1, str(ing.fecha))
        hoja_ingresos.cell(fila, 2, float(ing.importe))
        hoja_ingresos.cell(fila, 3, ing.categoria.nombre if ing.categoria else "")
        hoja_ingresos.cell(fila, 4, ing.descripcion or "")

    hoja_gastos = libro.create_sheet("Gastos")
    _cabecera(hoja_gastos, ["Fecha", "Importe (€)", "Categoría", "Descripción"])
    for fila, gasto in enumerate(gastos, 2):
        hoja_gastos.cell(fila, 1, str(gasto.fecha))
        hoja_gastos.cell(fila, 2, float(gasto.importe))
        hoja_gastos.cell(fila, 3, gasto.categoria.nombre if gasto.categoria else "")
        hoja_gastos.cell(fila, 4, gasto.descripcion or "")

    buffer = io.BytesIO()
    libro.save(buffer)
    buffer.seek(0)

    nombre_fichero = f"contabilidad_{anio}_{mes:02d}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre_fichero}"'},
    )
