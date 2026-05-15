import asyncio
import calendar
import logging
import subprocess
from datetime import date
from decimal import Decimal
from pathlib import Path

from nicegui import ui

from .estado import estado

_logger = logging.getLogger('contabilidad')


def val_decimal(v: str) -> bool:
    if not v.strip():
        return True
    try:
        Decimal(v.replace(',', '.'))
        return True
    except Exception:
        return False


def val_fecha(v: str) -> bool:
    if not v.strip():
        return True
    try:
        date.fromisoformat(v)
        return True
    except Exception:
        return False


def val_entero(v: str) -> bool:
    if not v.strip():
        return True
    try:
        int(v)
        return True
    except Exception:
        return False


def campo_fecha(valor: str = "") -> 'ui.input':
    anio, mes = estado.anio, estado.mes
    ultimo    = calendar.monthrange(anio, mes)[1]
    anio_mes  = f"{anio}/{mes:02d}"
    min_fecha = f"{anio}/{mes:02d}/01"
    max_fecha = f"{anio}/{mes:02d}/{ultimo:02d}"

    if not valor:
        hoy = date.today()
        valor = str(hoy) if (hoy.year == anio and hoy.month == mes) else f"{anio}-{mes:02d}-01"
    else:
        try:
            d = date.fromisoformat(valor)
            if d.year != anio or d.month != mes:
                valor = f"{anio}-{mes:02d}-01"
        except ValueError:
            valor = f"{anio}-{mes:02d}-01"

    with ui.input("fecha", value=valor).props("readonly").classes("w-full") as inp:
        with inp.add_slot("append"):
            ui.button("[cal]", on_click=lambda: _menu.open()).props("flat dense size=xs color=grey-6")
        with ui.menu() as _menu:
            dp = ui.date(mask="YYYY-MM-DD")
            dp.props(
                f'navigation-min-year-month="{anio_mes}" '
                f'navigation-max-year-month="{anio_mes}"'
            )
            dp._props[':options'] = f"(d) => d >= '{min_fecha}' && d <= '{max_fecha}'"
            dp.bind_value(inp)
    return inp


def confirmar_eliminar(mensaje: str, on_confirmar):
    with ui.dialog() as dlg, ui.card().classes("gap-4"):
        ui.label(mensaje).classes("text-subtitle2")
        with ui.row().classes("justify-end w-full gap-2"):
            ui.button("cancelar", on_click=dlg.close).props("flat")
            ui.button("eliminar", on_click=lambda: (on_confirmar(), dlg.close())).props("color=negative")
    dlg.open()


def _seleccionar_carpeta_sync() -> str:
    res = subprocess.run(
        ['osascript', '-e',
         'tell application "Finder"\n'
         '  set c to choose folder with prompt "Seleccionar carpeta de exportación"\n'
         '  return POSIX path of c\n'
         'end tell'],
        capture_output=True, text=True, timeout=120,
    )
    _logger.debug("osascript rc=%d  stdout=%r  stderr=%r",
                  res.returncode, res.stdout.strip(), res.stderr.strip())
    if res.returncode == 0:
        return res.stdout.strip().rstrip('/')
    return ''


async def dialogo_seleccionar_carpeta() -> str:
    carpeta = await asyncio.get_event_loop().run_in_executor(None, _seleccionar_carpeta_sync)
    if not carpeta:
        return ''
    ruta = str(Path(carpeta) / 'contabilidad.xlsx')
    _logger.debug("ruta excel: %r", ruta)
    return ruta
