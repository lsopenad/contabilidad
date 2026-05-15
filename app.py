#!/usr/bin/env python3
"""Aplicación de contabilidad — interfaz web local (NiceGUI)."""

import subprocess
import sys
import logging
from pathlib import Path

from nicegui import ui

from interfaz import estilos, secciones

_DEBUG = '--debug' in sys.argv or '--dev' in sys.argv
_DEV   = '--dev' in sys.argv

# ---------------------------------------------------------------------------
# Logging → panel debug
# ---------------------------------------------------------------------------

_log_ui_ref: 'ui.log | None' = None
_log_lines: list[str] = []
_logger = logging.getLogger('contabilidad')


class _UILogHandler(logging.Handler):
    def emit(self, record):
        msg = self.format(record)
        _log_lines.append(msg)
        if _log_ui_ref is not None:
            try:
                _log_ui_ref.push(msg)
            except Exception:
                pass


_ui_handler = _UILogHandler()
_ui_handler.setFormatter(logging.Formatter(
    '%(asctime)s [%(levelname).3s] %(message)s', datefmt='%H:%M:%S'))
_logger.setLevel(logging.DEBUG)
_logger.addHandler(_ui_handler)
_logger.propagate = False

if _DEBUG:
    _root_log = logging.getLogger()
    _root_log.addHandler(_ui_handler)


# ---------------------------------------------------------------------------
# Página principal
# ---------------------------------------------------------------------------

@ui.page("/")
def pagina_principal():
    global _log_ui_ref

    ui.dark_mode(value=True)
    ui.add_css(estilos.CSS)

    _logger.info("arrancando — modo %s", "dev" if _DEV else "debug" if _DEBUG else "release")

    with ui.header().classes("items-center h-11 px-4 gap-3"):
        ui.label("contabilidad").classes("text-subtitle2 font-bold text-positive tracking-widest")
        if _DEV:
            ui.badge("dev",   color="warning").classes("text-xs")
        elif _DEBUG:
            ui.badge("debug", color="negative").classes("text-xs")
        ui.space()
        if _DEBUG:
            ui.button("[dbg]", on_click=lambda: _drawer[0].toggle()
                      ).props("flat dense color=warning size=sm")

    _drawer: list = [None]
    if _DEBUG:
        def _copiar_log():
            texto = '\n'.join(_log_lines)
            if not texto:
                ui.notify('log vacío', type='warning')
                return
            try:
                res = subprocess.run(['pbcopy'], input=texto, text=True,
                                     timeout=5, capture_output=True)
                if res.returncode == 0:
                    ui.notify(f'log copiado ({len(_log_lines)} líneas) [OK]', type='positive')
                else:
                    ui.notify(f'pbcopy error: {res.stderr.strip() or "código "+str(res.returncode)}',
                              type='negative')
            except Exception as exc:
                ui.notify(f'error al copiar: {exc}', type='negative')

        with ui.right_drawer(value=True, fixed=False, bordered=True) as drw:
            _drawer[0] = drw
            with ui.row().classes("items-center gap-1 px-2 pt-2 pb-1"):
                ui.label("debug log").classes("text-caption text-warning uppercase font-bold flex-1")
                ui.button("[cpy]", on_click=_copiar_log).props("flat dense size=xs color=grey-7")
                ui.button("[cls]", on_click=lambda: (
                    _log_ui_ref.clear() if _log_ui_ref else None,
                    _log_lines.clear(),
                )).props("flat dense size=xs color=grey-7")
            _log_ui_ref = ui.log(max_lines=500).classes("w-full").style(
                "height:calc(100vh - 56px);font-size:0.67rem;")
            _logger.debug("debug panel activo")

    with ui.tabs().classes("w-full") as tabs:
        t_ing = ui.tab("ingresos")
        t_gas = ui.tab("gastos")
        t_fac = ui.tab("facturas")
        t_pre = ui.tab("presupuestos")
        t_cat = ui.tab("categorías")
        t_inf = ui.tab("informes")
        t_exp = ui.tab("exportar")

    with ui.tab_panels(tabs, value=t_ing).classes("w-full"):
        with ui.tab_panel(t_ing).classes("p-4"):
            secciones.seccion_ingresos()
        with ui.tab_panel(t_gas).classes("p-4"):
            secciones.seccion_gastos()
        with ui.tab_panel(t_fac).classes("p-4"):
            secciones.seccion_facturas()
        with ui.tab_panel(t_pre).classes("p-4"):
            secciones.seccion_presupuestos()
        with ui.tab_panel(t_cat).classes("p-4"):
            secciones.seccion_categorias()
        with ui.tab_panel(t_inf).classes("p-4"):
            secciones.seccion_informes()
        with ui.tab_panel(t_exp).classes("p-4"):
            secciones.seccion_exportar()


# ---------------------------------------------------------------------------
# Arranque
# ---------------------------------------------------------------------------

if __name__ in {"__main__", "__mp_main__"}:
    if "--init" in sys.argv:
        from alembic.config import Config
        from alembic import command as alembic_cmd
        cfg = Config(str(Path(__file__).parent / "alembic.ini"))
        alembic_cmd.upgrade(cfg, "head")
        print("[OK] base de datos inicializada")
        sys.exit(0)

    titulo = "contabilidad"
    if _DEV:
        titulo += " [dev]"
    elif _DEBUG:
        titulo += " [debug]"

    ui.run(
        title=titulo,
        native=True,
        window_size=(1440 if _DEBUG else 1280, 800),
        reload=_DEV,
        favicon=None,
    )
