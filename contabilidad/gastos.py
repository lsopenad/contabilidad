from datetime import date
from decimal import Decimal
from typing import Optional
from .db import cursor_db
from .modelos import Gasto


def crear_gasto(importe: Decimal, fecha: date, categoria_id: Optional[int], descripcion: Optional[str]) -> Gasto:
    with cursor_db() as cur:
        cur.execute(
            "INSERT INTO gastos (importe, fecha, categoria_id, descripcion) VALUES (%s, %s, %s, %s) RETURNING *",
            (importe, fecha, categoria_id, descripcion),
        )
        fila = cur.fetchone()
    return Gasto(**fila)


def listar_gastos(mes: Optional[int] = None, anio: Optional[int] = None, limite: int = 100) -> list[dict]:
    sql = """
        SELECT g.id, g.importe, g.fecha, g.descripcion, g.categoria_id, c.nombre AS categoria
        FROM gastos g
        LEFT JOIN categorias c ON c.id = g.categoria_id
        WHERE 1=1
    """
    params = []
    if mes:
        sql += " AND EXTRACT(MONTH FROM g.fecha) = %s"
        params.append(mes)
    if anio:
        sql += " AND EXTRACT(YEAR FROM g.fecha) = %s"
        params.append(anio)
    sql += " ORDER BY g.fecha DESC LIMIT %s"
    params.append(limite)

    with cursor_db() as cur:
        cur.execute(sql, params)
        return [dict(f) for f in cur.fetchall()]


def actualizar_gasto(id_gasto: int, importe: Decimal, fecha: date,
                     categoria_id: Optional[int], descripcion: Optional[str]) -> bool:
    with cursor_db() as cur:
        cur.execute(
            "UPDATE gastos SET importe=%s, fecha=%s, categoria_id=%s, descripcion=%s WHERE id=%s",
            (importe, fecha, categoria_id, descripcion, id_gasto),
        )
        return cur.rowcount > 0


def eliminar_gasto(id_gasto: int) -> bool:
    with cursor_db() as cur:
        cur.execute("DELETE FROM gastos WHERE id = %s", (id_gasto,))
        return cur.rowcount > 0


def total_mes(mes: int, anio: int) -> Decimal:
    with cursor_db() as cur:
        cur.execute(
            "SELECT COALESCE(SUM(importe), 0) FROM gastos WHERE EXTRACT(MONTH FROM fecha) = %s AND EXTRACT(YEAR FROM fecha) = %s",
            (mes, anio),
        )
        return Decimal(str(cur.fetchone()["coalesce"]))


def gastos_por_categoria(mes: int, anio: int) -> list[dict]:
    with cursor_db() as cur:
        cur.execute(
            """
            SELECT c.nombre AS categoria, SUM(g.importe) AS total
            FROM gastos g
            LEFT JOIN categorias c ON c.id = g.categoria_id
            WHERE EXTRACT(MONTH FROM g.fecha) = %s AND EXTRACT(YEAR FROM g.fecha) = %s
            GROUP BY c.nombre
            ORDER BY total DESC
            """,
            (mes, anio),
        )
        return [dict(f) for f in cur.fetchall()]
