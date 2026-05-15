from decimal import Decimal
from .db import cursor_db
from .modelos import ResumenMes


def resumen_mes(mes: int, anio: int) -> ResumenMes:
    resumen = ResumenMes(mes=mes, anio=anio)

    with cursor_db() as cur:
        cur.execute(
            "SELECT COALESCE(SUM(importe), 0) FROM ingresos WHERE EXTRACT(MONTH FROM fecha) = %s AND EXTRACT(YEAR FROM fecha) = %s",
            (mes, anio),
        )
        resumen.total_ingresos = Decimal(str(cur.fetchone()["coalesce"]))

        cur.execute(
            "SELECT COALESCE(SUM(importe), 0) FROM gastos WHERE EXTRACT(MONTH FROM fecha) = %s AND EXTRACT(YEAR FROM fecha) = %s",
            (mes, anio),
        )
        resumen.total_gastos = Decimal(str(cur.fetchone()["coalesce"]))

        cur.execute(
            "SELECT COALESCE(SUM(importe_total), 0) FROM facturas WHERE EXTRACT(MONTH FROM fecha) = %s AND EXTRACT(YEAR FROM fecha) = %s",
            (mes, anio),
        )
        resumen.total_facturas_emitidas = Decimal(str(cur.fetchone()["coalesce"]))

        cur.execute(
            "SELECT COUNT(*) FROM facturas WHERE estado = 'pendiente' AND EXTRACT(MONTH FROM fecha) = %s AND EXTRACT(YEAR FROM fecha) = %s",
            (mes, anio),
        )
        resumen.facturas_pendientes = cur.fetchone()["count"]

    return resumen


def anios_con_datos() -> list[int]:
    with cursor_db() as cur:
        cur.execute("""
            SELECT DISTINCT EXTRACT(YEAR FROM fecha)::int AS anio
            FROM (
                SELECT fecha FROM ingresos
                UNION ALL
                SELECT fecha FROM gastos
                UNION ALL
                SELECT fecha FROM facturas
            ) t
            ORDER BY anio DESC
        """)
        return [f["anio"] for f in cur.fetchall()]


def resumen_anual(anio: int) -> list[ResumenMes]:
    resumenes = []
    with cursor_db() as cur:
        cur.execute(
            """
            SELECT mes, COALESCE(SUM(importe), 0) AS total
            FROM (
                SELECT EXTRACT(MONTH FROM fecha)::int AS mes, importe FROM ingresos WHERE EXTRACT(YEAR FROM fecha) = %s
            ) sub
            GROUP BY mes
            """,
            (anio,),
        )
        ingresos_por_mes = {f["mes"]: Decimal(str(f["total"])) for f in cur.fetchall()}

        cur.execute(
            """
            SELECT mes, COALESCE(SUM(importe), 0) AS total
            FROM (
                SELECT EXTRACT(MONTH FROM fecha)::int AS mes, importe FROM gastos WHERE EXTRACT(YEAR FROM fecha) = %s
            ) sub
            GROUP BY mes
            """,
            (anio,),
        )
        gastos_por_mes = {f["mes"]: Decimal(str(f["total"])) for f in cur.fetchall()}

    for mes in range(1, 13):
        resumenes.append(ResumenMes(
            mes=mes,
            anio=anio,
            total_ingresos=ingresos_por_mes.get(mes, Decimal("0")),
            total_gastos=gastos_por_mes.get(mes, Decimal("0")),
        ))
    return resumenes
