from datetime import date
from decimal import Decimal
from typing import Optional
from .db import cursor_db
from .modelos import Factura



def _siguiente_numero(anio: int) -> str:
    with cursor_db() as cur:
        cur.execute(
            "SELECT COUNT(*) AS total FROM facturas WHERE EXTRACT(YEAR FROM fecha) = %s",
            (anio,),
        )
        total = cur.fetchone()["total"]
    return f"FAC-{anio}-{total + 1:04d}"


def crear_factura(
    cliente_id: Optional[int],
    importe_base: Decimal,
    iva_porcentaje: Decimal,
    fecha: date,
    descripcion: Optional[str],
) -> Factura:
    importe_total = importe_base * (1 + iva_porcentaje / 100)
    numero = _siguiente_numero(fecha.year)
    with cursor_db() as cur:
        cur.execute(
            """INSERT INTO facturas (numero, cliente_id, importe_base, iva_porcentaje, importe_total, fecha, descripcion)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (numero, cliente_id, importe_base, iva_porcentaje, importe_total, fecha, descripcion),
        )
        fila = cur.fetchone()
    return Factura(**fila)


def listar_facturas(estado: Optional[str] = None, limite: int = 100) -> list[dict]:
    sql = """
        SELECT f.id, f.numero, f.cliente_id, cl.nombre AS cliente, f.importe_base, f.iva_porcentaje,
               f.importe_total, f.fecha, f.estado, f.descripcion
        FROM facturas f
        LEFT JOIN clientes cl ON cl.id = f.cliente_id
        WHERE 1=1
    """
    params = []
    if estado:
        sql += " AND f.estado = %s"
        params.append(estado)
    sql += " ORDER BY f.fecha DESC LIMIT %s"
    params.append(limite)

    with cursor_db() as cur:
        cur.execute(sql, params)
        return [dict(f) for f in cur.fetchall()]


def actualizar_factura(id_factura: int, cliente_id: Optional[int], importe_base: Decimal,
                       iva_porcentaje: Decimal, fecha: date, descripcion: Optional[str]) -> bool:
    importe_total = importe_base * (1 + iva_porcentaje / 100)
    with cursor_db() as cur:
        cur.execute(
            """UPDATE facturas SET cliente_id=%s, importe_base=%s, iva_porcentaje=%s,
               importe_total=%s, fecha=%s, descripcion=%s WHERE id=%s""",
            (cliente_id, importe_base, iva_porcentaje, importe_total, fecha, descripcion, id_factura),
        )
        return cur.rowcount > 0


def eliminar_factura(id_factura: int) -> bool:
    with cursor_db() as cur:
        cur.execute("DELETE FROM facturas WHERE id = %s", (id_factura,))
        return cur.rowcount > 0


def cambiar_estado(id_factura: int, nuevo_estado: str) -> bool:
    with cursor_db() as cur:
        cur.execute("UPDATE facturas SET estado = %s WHERE id = %s", (nuevo_estado, id_factura))
        return cur.rowcount > 0


