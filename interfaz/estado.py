from datetime import date

MESES_NOMBRE = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}


class _Estado:
    mes: int = date.today().month
    anio: int = date.today().year


estado = _Estado()


def titulo_mes() -> str:
    return f"{MESES_NOMBRE[estado.mes]} {estado.anio}"
