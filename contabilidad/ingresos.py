from datetime import date
from decimal import Decimal
from typing import Optional
from .db import cursor_db
from .modelos import Ingreso


def crear_ingreso(importe: Decimal, fecha: date, categoria_id: Optional[int], descripcion: Optional[str]) -> Ingreso:
    with cursor_db() as cur:
        cur.execute(
            "INSERT INTO ingresos (importe, fecha, categoria_id, descripcion) VALUES (%s, %s, %s, %s) RETURNING *",
            (importe, fecha, categoria_id, descripcion),
        )
        fila = cur.fetchone()
    return Ingreso(**fila)


def listar_ingresos(mes: Optional[int] = None, anio: Optional[int] = None, limite: int = 100) -> list[dict]:
    sql = """
        SELECT i.id, i.importe, i.fecha, i.descripcion, i.categoria_id, c.nombre AS categoria
        FROM ingresos i
        LEFT JOIN categorias c ON c.id = i.categoria_id
        WHERE 1=1
    """
    params = []
    if mes:
        sql += " AND EXTRACT(MONTH FROM i.fecha) = %s"
        params.append(mes)
    if anio:
        sql += " AND EXTRACT(YEAR FROM i.fecha) = %s"
        params.append(anio)
    sql += " ORDER BY i.fecha DESC LIMIT %s"
    params.append(limite)

    with cursor_db() as cur:
        cur.execute(sql, params)
        return [dict(f) for f in cur.fetchall()]


def actualizar_ingreso(id_ingreso: int, importe: Decimal, fecha: date,
                       categoria_id: Optional[int], descripcion: Optional[str]) -> bool:
    with cursor_db() as cur:
        cur.execute(
            "UPDATE ingresos SET importe=%s, fecha=%s, categoria_id=%s, descripcion=%s WHERE id=%s",
            (importe, fecha, categoria_id, descripcion, id_ingreso),
        )
        return cur.rowcount > 0


def eliminar_ingreso(id_ingreso: int) -> bool:
    with cursor_db() as cur:
        cur.execute("DELETE FROM ingresos WHERE id = %s", (id_ingreso,))
        return cur.rowcount > 0


def total_mes(mes: int, anio: int) -> Decimal:
    with cursor_db() as cur:
        cur.execute(
            "SELECT COALESCE(SUM(importe), 0) FROM ingresos WHERE EXTRACT(MONTH FROM fecha) = %s AND EXTRACT(YEAR FROM fecha) = %s",
            (mes, anio),
        )
        return Decimal(str(cur.fetchone()["coalesce"]))
