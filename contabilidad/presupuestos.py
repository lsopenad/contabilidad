from decimal import Decimal
from .db import cursor_db
from .modelos import Presupuesto


def crear_o_actualizar_presupuesto(categoria_id: int, importe: Decimal, mes: int, anio: int) -> Presupuesto:
    with cursor_db() as cur:
        cur.execute(
            """INSERT INTO presupuestos (categoria_id, importe, mes, anio)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (categoria_id, mes, anio)
               DO UPDATE SET importe = EXCLUDED.importe
               RETURNING *""",
            (categoria_id, importe, mes, anio),
        )
        fila = cur.fetchone()
    return Presupuesto(**fila)


def listar_presupuestos(mes: int, anio: int) -> list[dict]:
    with cursor_db() as cur:
        cur.execute(
            """
            SELECT p.id, c.nombre AS categoria, p.importe AS presupuesto,
                   COALESCE(SUM(g.importe), 0) AS gastado,
                   p.importe - COALESCE(SUM(g.importe), 0) AS restante
            FROM presupuestos p
            JOIN categorias c ON c.id = p.categoria_id
            LEFT JOIN gastos g ON g.categoria_id = p.categoria_id
                AND EXTRACT(MONTH FROM g.fecha) = p.mes
                AND EXTRACT(YEAR FROM g.fecha) = p.anio
            WHERE p.mes = %s AND p.anio = %s
            GROUP BY p.id, c.nombre, p.importe
            ORDER BY c.nombre
            """,
            (mes, anio),
        )
        return [dict(f) for f in cur.fetchall()]


def actualizar_presupuesto(id_presupuesto: int, importe: Decimal) -> bool:
    with cursor_db() as cur:
        cur.execute("UPDATE presupuestos SET importe=%s WHERE id=%s", (importe, id_presupuesto))
        return cur.rowcount > 0


def eliminar_presupuesto(id_presupuesto: int) -> bool:
    with cursor_db() as cur:
        cur.execute("DELETE FROM presupuestos WHERE id = %s", (id_presupuesto,))
        return cur.rowcount > 0


