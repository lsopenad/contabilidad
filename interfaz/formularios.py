import logging
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

from nicegui import ui

import contabilidad.categorias as mod_categorias
import contabilidad.clientes as mod_clientes
import contabilidad.ingresos as mod_ingresos
import contabilidad.gastos as mod_gastos
import contabilidad.facturas as mod_facturas
import contabilidad.presupuestos as mod_presupuestos
import contabilidad.informes as mod_informes
import contabilidad.excel as mod_excel

from .estado import estado, titulo_mes
from .helpers import campo_fecha, confirmar_eliminar, val_decimal, dialogo_seleccionar_carpeta

_logger = logging.getLogger('contabilidad')

_TIPOS_CATEGORIA = {'ingreso': 'ingreso', 'gasto': 'gasto', 'ambos': 'ambos'}


def formulario_ingreso():
    from . import secciones
    cats = mod_categorias.listar_categorias(tipo="ingreso")
    opciones_cat = {str(c["id"]): c["nombre"] for c in cats}

    with ui.dialog() as dlg, ui.card().classes("w-96 gap-4"):
        ui.label("nuevo ingreso").classes("text-subtitle1 text-positive")
        importe_i = ui.input("importe (€)", placeholder="0.00",
                             validation={"importe inválido": val_decimal}).classes("w-full")
        fecha_i   = campo_fecha()
        cat_s     = ui.select(opciones_cat, label="categoría", clearable=True).classes("w-full")
        desc_i    = ui.input("descripción").classes("w-full")

        def _guardar():
            try:
                importe   = Decimal(importe_i.value.replace(",", "."))
                fecha_obj = date.fromisoformat(fecha_i.value or str(date.today()))
                cat_id    = int(cat_s.value) if cat_s.value else None
                desc      = desc_i.value.strip() or None
            except (InvalidOperation, ValueError) as e:
                ui.notify(f"error: {e}", type="negative")
                _logger.error("ingreso — validación: %s", e)
                return
            try:
                mod_ingresos.crear_ingreso(importe, fecha_obj, cat_id, desc)
                _logger.info("ingreso +%.2f€  %s  cat=%s", importe, fecha_obj, cat_id)
                ui.notify("ingreso guardado [OK]", type="positive")
                dlg.close()
                secciones.seccion_ingresos.refresh()
                secciones.seccion_informes.refresh()
            except Exception as e:
                _logger.exception("crear_ingreso falló")
                ui.notify(f"error: {e}", type="negative")

        with ui.row().classes("justify-end w-full gap-2"):
            ui.button("cancelar", on_click=dlg.close).props("flat")
            ui.button("guardar",  on_click=_guardar).props("color=positive")
    dlg.open()


def formulario_gasto():
    from . import secciones
    cats = mod_categorias.listar_categorias(tipo="gasto")
    opciones_cat = {str(c["id"]): c["nombre"] for c in cats}

    with ui.dialog() as dlg, ui.card().classes("w-96 gap-4"):
        ui.label("nuevo gasto").classes("text-subtitle1 text-negative")
        importe_i = ui.input("importe (€)", placeholder="0.00",
                             validation={"importe inválido": val_decimal}).classes("w-full")
        fecha_i   = campo_fecha()
        cat_s     = ui.select(opciones_cat, label="categoría", clearable=True).classes("w-full")
        desc_i    = ui.input("descripción").classes("w-full")

        def _guardar():
            try:
                importe   = Decimal(importe_i.value.replace(",", "."))
                fecha_obj = date.fromisoformat(fecha_i.value or str(date.today()))
                cat_id    = int(cat_s.value) if cat_s.value else None
                desc      = desc_i.value.strip() or None
            except (InvalidOperation, ValueError) as e:
                ui.notify(f"error: {e}", type="negative")
                _logger.error("gasto — validación: %s", e)
                return
            try:
                mod_gastos.crear_gasto(importe, fecha_obj, cat_id, desc)
                _logger.info("gasto -%.2f€  %s  cat=%s", importe, fecha_obj, cat_id)
                ui.notify("gasto guardado [OK]", type="positive")
                dlg.close()
                secciones.seccion_gastos.refresh()
                secciones.seccion_presupuestos.refresh()
                secciones.seccion_informes.refresh()
            except Exception as e:
                _logger.exception("crear_gasto falló")
                ui.notify(f"error: {e}", type="negative")

        with ui.row().classes("justify-end w-full gap-2"):
            ui.button("cancelar", on_click=dlg.close).props("flat")
            ui.button("guardar",  on_click=_guardar).props("color=negative")
    dlg.open()


def formulario_factura():
    from . import secciones
    clientes     = mod_clientes.listar_clientes()
    opciones_cli = {str(c["id"]): c["nombre"] for c in clientes}

    with ui.dialog() as dlg, ui.card().classes("w-96 gap-4"):
        ui.label("nueva factura").classes("text-subtitle1 text-warning")
        cli_s  = ui.select(opciones_cli, label="cliente", clearable=True).classes("w-full")
        base_i = ui.input("importe base (€)", placeholder="0.00",
                          validation={"importe inválido": val_decimal}).classes("w-full")
        iva_i  = ui.input("iva (%)", value="21",
                          validation={"IVA inválido": val_decimal}).classes("w-full")
        fecha_i = campo_fecha()
        desc_i  = ui.input("descripción").classes("w-full")

        def _guardar():
            try:
                base      = Decimal(base_i.value.replace(",", "."))
                iva       = Decimal(iva_i.value.replace(",", "."))
                fecha_obj = date.fromisoformat(fecha_i.value or str(date.today()))
                cli_id    = int(cli_s.value) if cli_s.value else None
                desc      = desc_i.value.strip() or None
            except (InvalidOperation, ValueError) as e:
                ui.notify(f"error: {e}", type="negative")
                _logger.error("factura — validación: %s", e)
                return
            try:
                fac = mod_facturas.crear_factura(cli_id, base, iva, fecha_obj, desc)
                _logger.info("factura %s  total=%.2f€  cli=%s", fac.numero, fac.importe_total, cli_id)
                ui.notify("factura creada [OK]", type="positive")
                dlg.close()
                secciones.seccion_facturas.refresh()
                secciones.seccion_informes.refresh()
            except Exception as e:
                _logger.exception("crear_factura falló")
                ui.notify(f"error: {e}", type="negative")

        with ui.row().classes("justify-end w-full gap-2"):
            ui.button("cancelar", on_click=dlg.close).props("flat")
            ui.button("guardar",  on_click=_guardar).props("color=warning")
    dlg.open()


def formulario_presupuesto():
    from . import secciones
    cats = mod_categorias.listar_categorias(tipo="gasto")
    opciones_cat = {str(c["id"]): c["nombre"] for c in cats}

    with ui.dialog() as dlg, ui.card().classes("w-96 gap-4"):
        ui.label(f"presupuesto / {titulo_mes()}").classes("text-subtitle1")
        cat_s     = ui.select(opciones_cat, label="categoría").classes("w-full")
        importe_i = ui.input("importe (€)", placeholder="0.00",
                             validation={"importe inválido": val_decimal}).classes("w-full")

        def _guardar():
            if not cat_s.value:
                ui.notify("selecciona categoría", type="warning")
                return
            try:
                importe = Decimal(importe_i.value.replace(",", "."))
            except InvalidOperation as e:
                ui.notify(f"error: {e}", type="negative")
                return
            try:
                mod_presupuestos.crear_o_actualizar_presupuesto(
                    int(cat_s.value), importe, estado.mes, estado.anio)
                _logger.info("presupuesto cat=%s  %.2f€  %d/%d",
                             cat_s.value, importe, estado.mes, estado.anio)
                ui.notify("presupuesto guardado [OK]", type="positive")
                dlg.close()
                secciones.seccion_presupuestos.refresh()
            except Exception as e:
                _logger.exception("crear_o_actualizar_presupuesto falló")
                ui.notify(f"error: {e}", type="negative")

        with ui.row().classes("justify-end w-full gap-2"):
            ui.button("cancelar", on_click=dlg.close).props("flat")
            ui.button("guardar",  on_click=_guardar).props("color=primary")
    dlg.open()


def formulario_editar_ingreso(fila: dict):
    from . import secciones
    cats = mod_categorias.listar_categorias(tipo="ingreso")
    opciones_cat = {str(c["id"]): c["nombre"] for c in cats}
    id_reg = fila["id"]

    with ui.dialog() as dlg, ui.card().classes("w-96 gap-4"):
        ui.label(f"ingreso #{id_reg}").classes("text-subtitle1 text-positive")
        importe_i = ui.input("importe (€)", value=fila["importe"],
                             validation={"importe inválido": val_decimal}).classes("w-full")
        fecha_i   = campo_fecha(fila["fecha"])
        cat_s     = ui.select(opciones_cat, label="categoría", clearable=True,
                              value=str(fila["categoria_id"]) if fila.get("categoria_id") else None
                              ).classes("w-full")
        desc_i    = ui.input("descripción", value=fila.get("descripcion") or "").classes("w-full")

        def _actualizar():
            try:
                importe   = Decimal(importe_i.value.replace(",", "."))
                fecha_obj = date.fromisoformat(fecha_i.value)
                cat_id    = int(cat_s.value) if cat_s.value else None
                desc      = desc_i.value.strip() or None
            except (InvalidOperation, ValueError) as e:
                ui.notify(f"error: {e}", type="negative")
                return
            try:
                mod_ingresos.actualizar_ingreso(id_reg, importe, fecha_obj, cat_id, desc)
                _logger.info("ingreso %d actualizado", id_reg)
                ui.notify("ingreso actualizado [OK]", type="positive")
                dlg.close()
                secciones.seccion_ingresos.refresh()
                secciones.seccion_informes.refresh()
            except Exception as e:
                _logger.exception("actualizar_ingreso(%d) falló", id_reg)
                ui.notify(f"error: {e}", type="negative")

        def _eliminar():
            def _hacer():
                try:
                    mod_ingresos.eliminar_ingreso(id_reg)
                    _logger.info("ingreso %d eliminado", id_reg)
                    ui.notify("ingreso eliminado [OK]", type="positive")
                    dlg.close()
                    secciones.seccion_ingresos.refresh()
                    secciones.seccion_informes.refresh()
                except Exception as e:
                    _logger.exception("eliminar_ingreso(%d) falló", id_reg)
                    ui.notify(f"error: {e}", type="negative")
            confirmar_eliminar(f"¿eliminar ingreso #{id_reg}?", _hacer)

        with ui.row().classes("justify-between w-full gap-2"):
            ui.button("eliminar", on_click=_eliminar).props("color=negative flat")
            with ui.row().classes("gap-2"):
                ui.button("cancelar", on_click=dlg.close).props("flat")
                ui.button("actualizar", on_click=_actualizar).props("color=positive")
    dlg.open()


def formulario_editar_gasto(fila: dict):
    from . import secciones
    cats = mod_categorias.listar_categorias(tipo="gasto")
    opciones_cat = {str(c["id"]): c["nombre"] for c in cats}
    id_reg = fila["id"]

    with ui.dialog() as dlg, ui.card().classes("w-96 gap-4"):
        ui.label(f"gasto #{id_reg}").classes("text-subtitle1 text-negative")
        importe_i = ui.input("importe (€)", value=fila["importe"],
                             validation={"importe inválido": val_decimal}).classes("w-full")
        fecha_i   = campo_fecha(fila["fecha"])
        cat_s     = ui.select(opciones_cat, label="categoría", clearable=True,
                              value=str(fila["categoria_id"]) if fila.get("categoria_id") else None
                              ).classes("w-full")
        desc_i    = ui.input("descripción", value=fila.get("descripcion") or "").classes("w-full")

        def _actualizar():
            try:
                importe   = Decimal(importe_i.value.replace(",", "."))
                fecha_obj = date.fromisoformat(fecha_i.value)
                cat_id    = int(cat_s.value) if cat_s.value else None
                desc      = desc_i.value.strip() or None
            except (InvalidOperation, ValueError) as e:
                ui.notify(f"error: {e}", type="negative")
                return
            try:
                mod_gastos.actualizar_gasto(id_reg, importe, fecha_obj, cat_id, desc)
                _logger.info("gasto %d actualizado", id_reg)
                ui.notify("gasto actualizado [OK]", type="positive")
                dlg.close()
                secciones.seccion_gastos.refresh()
                secciones.seccion_presupuestos.refresh()
                secciones.seccion_informes.refresh()
            except Exception as e:
                _logger.exception("actualizar_gasto(%d) falló", id_reg)
                ui.notify(f"error: {e}", type="negative")

        def _eliminar():
            def _hacer():
                try:
                    mod_gastos.eliminar_gasto(id_reg)
                    _logger.info("gasto %d eliminado", id_reg)
                    ui.notify("gasto eliminado [OK]", type="positive")
                    dlg.close()
                    secciones.seccion_gastos.refresh()
                    secciones.seccion_presupuestos.refresh()
                    secciones.seccion_informes.refresh()
                except Exception as e:
                    _logger.exception("eliminar_gasto(%d) falló", id_reg)
                    ui.notify(f"error: {e}", type="negative")
            confirmar_eliminar(f"¿eliminar gasto #{id_reg}?", _hacer)

        with ui.row().classes("justify-between w-full gap-2"):
            ui.button("eliminar", on_click=_eliminar).props("color=negative flat")
            with ui.row().classes("gap-2"):
                ui.button("cancelar", on_click=dlg.close).props("flat")
                ui.button("actualizar", on_click=_actualizar).props("color=negative")
    dlg.open()


def formulario_editar_factura(fila: dict):
    from . import secciones
    clientes     = mod_clientes.listar_clientes()
    opciones_cli = {str(c["id"]): c["nombre"] for c in clientes}
    id_fac       = fila["id"]

    with ui.dialog() as dlg, ui.card().classes("w-96 gap-4"):
        ui.label(f"factura {fila['numero']}").classes("text-subtitle1 text-warning")
        cli_s   = ui.select(opciones_cli, label="cliente", clearable=True,
                            value=str(fila["cliente_id"]) if fila.get("cliente_id") else None
                            ).classes("w-full")
        base_i  = ui.input("importe base (€)", value=fila["importe_base"],
                           validation={"importe inválido": val_decimal}).classes("w-full")
        iva_i   = ui.input("iva (%)", value=fila["iva"].rstrip("%"),
                           validation={"IVA inválido": val_decimal}).classes("w-full")
        fecha_i = campo_fecha(fila["fecha"])
        desc_i  = ui.input("descripción", value=fila.get("descripcion") or "").classes("w-full")

        def _actualizar():
            try:
                base      = Decimal(base_i.value.replace(",", "."))
                iva       = Decimal(iva_i.value.replace(",", "."))
                fecha_obj = date.fromisoformat(fecha_i.value)
                cli_id    = int(cli_s.value) if cli_s.value else None
                desc      = desc_i.value.strip() or None
            except (InvalidOperation, ValueError) as e:
                ui.notify(f"error: {e}", type="negative")
                return
            try:
                mod_facturas.actualizar_factura(id_fac, cli_id, base, iva, fecha_obj, desc)
                _logger.info("factura %d actualizada", id_fac)
                ui.notify("factura actualizada [OK]", type="positive")
                dlg.close()
                secciones.seccion_facturas.refresh()
                secciones.seccion_informes.refresh()
            except Exception as e:
                _logger.exception("actualizar_factura(%d) falló", id_fac)
                ui.notify(f"error: {e}", type="negative")

        def _eliminar():
            def _hacer():
                try:
                    mod_facturas.eliminar_factura(id_fac)
                    _logger.info("factura %d eliminada", id_fac)
                    ui.notify(f"factura {fila['numero']} eliminada [OK]", type="positive")
                    dlg.close()
                    secciones.seccion_facturas.refresh()
                    secciones.seccion_informes.refresh()
                except Exception as e:
                    _logger.exception("eliminar_factura(%d) falló", id_fac)
                    ui.notify(f"error: {e}", type="negative")
            confirmar_eliminar(f"¿eliminar factura {fila['numero']}?", _hacer)

        with ui.row().classes("justify-between w-full gap-2"):
            ui.button("eliminar", on_click=_eliminar).props("color=negative flat")
            with ui.row().classes("gap-2"):
                ui.button("cancelar", on_click=dlg.close).props("flat")
                ui.button("actualizar", on_click=_actualizar).props("color=warning")
    dlg.open()


def formulario_editar_presupuesto(fila: dict):
    from . import secciones
    id_reg = fila["id"]

    with ui.dialog() as dlg, ui.card().classes("w-96 gap-4"):
        ui.label(f"presupuesto — {fila['categoria']}").classes("text-subtitle1")
        ui.label(fila["categoria"]).classes("text-caption text-grey-6")
        importe_i = ui.input("importe (€)", value=fila["presupuesto"],
                             validation={"importe inválido": val_decimal}).classes("w-full")

        def _actualizar():
            try:
                importe = Decimal(importe_i.value.replace(",", "."))
            except InvalidOperation as e:
                ui.notify(f"error: {e}", type="negative")
                return
            try:
                mod_presupuestos.actualizar_presupuesto(id_reg, importe)
                _logger.info("presupuesto %d actualizado", id_reg)
                ui.notify("presupuesto actualizado [OK]", type="positive")
                dlg.close()
                secciones.seccion_presupuestos.refresh()
            except Exception as e:
                _logger.exception("actualizar_presupuesto(%d) falló", id_reg)
                ui.notify(f"error: {e}", type="negative")

        def _eliminar():
            def _hacer():
                try:
                    mod_presupuestos.eliminar_presupuesto(id_reg)
                    _logger.info("presupuesto %d eliminado", id_reg)
                    ui.notify(f"presupuesto '{fila['categoria']}' eliminado [OK]", type="positive")
                    dlg.close()
                    secciones.seccion_presupuestos.refresh()
                except Exception as e:
                    _logger.exception("eliminar_presupuesto(%d) falló", id_reg)
                    ui.notify(f"error: {e}", type="negative")
            confirmar_eliminar(f"¿eliminar presupuesto '{fila['categoria']}'?", _hacer)

        with ui.row().classes("justify-between w-full gap-2"):
            ui.button("eliminar", on_click=_eliminar).props("color=negative flat")
            with ui.row().classes("gap-2"):
                ui.button("cancelar", on_click=dlg.close).props("flat")
                ui.button("actualizar", on_click=_actualizar).props("color=primary")
    dlg.open()


def formulario_nueva_categoria():
    from . import secciones

    with ui.dialog() as dlg, ui.card().classes("w-80 gap-4"):
        ui.label("nueva categoría").classes("text-subtitle1")
        nombre_i = ui.input("nombre").classes("w-full")
        tipo_s   = ui.select(_TIPOS_CATEGORIA, label="tipo", value="gasto").classes("w-full")

        def _guardar():
            nombre = nombre_i.value.strip()
            if not nombre:
                ui.notify("nombre requerido", type="warning")
                return
            try:
                mod_categorias.crear_categoria(nombre, tipo_s.value)
                _logger.info("categoría '%s' (%s) creada", nombre, tipo_s.value)
                ui.notify(f"categoría '{nombre}' creada [OK]", type="positive")
                dlg.close()
                secciones.seccion_categorias.refresh()
            except Exception as e:
                _logger.exception("crear_categoria falló")
                ui.notify(f"error: {e}", type="negative")

        with ui.row().classes("justify-end w-full gap-2"):
            ui.button("cancelar", on_click=dlg.close).props("flat")
            ui.button("guardar", on_click=_guardar).props("color=positive")
    dlg.open()


def formulario_editar_categoria(fila: dict):
    from . import secciones
    id_cat = fila["id"]

    with ui.dialog() as dlg, ui.card().classes("w-80 gap-4"):
        ui.label(f"categoría #{id_cat}").classes("text-subtitle1")
        nombre_i = ui.input("nombre", value=fila["nombre"]).classes("w-full")
        tipo_s   = ui.select(_TIPOS_CATEGORIA, label="tipo", value=fila["tipo"]).classes("w-full")

        def _actualizar():
            nombre = nombre_i.value.strip()
            if not nombre:
                ui.notify("nombre requerido", type="warning")
                return
            try:
                mod_categorias.actualizar_categoria(id_cat, nombre, tipo_s.value)
                _logger.info("categoría %d actualizada → '%s' (%s)", id_cat, nombre, tipo_s.value)
                ui.notify("categoría actualizada [OK]", type="positive")
                dlg.close()
                secciones.seccion_categorias.refresh()
            except Exception as e:
                _logger.exception("actualizar_categoria(%d) falló", id_cat)
                ui.notify(f"error: {e}", type="negative")

        def _eliminar():
            def _hacer():
                try:
                    mod_categorias.eliminar_categoria(id_cat)
                    _logger.info("categoría %d eliminada", id_cat)
                    ui.notify("categoría eliminada [OK]", type="positive")
                    dlg.close()
                    secciones.seccion_categorias.refresh()
                except Exception as e:
                    _logger.exception("eliminar_categoria(%d) falló", id_cat)
                    ui.notify(f"error: {e}", type="negative")
            confirmar_eliminar(f"¿eliminar categoría '{fila['nombre']}'?", _hacer)

        with ui.row().classes("justify-between w-full gap-2"):
            ui.button("eliminar", on_click=_eliminar).props("color=negative flat")
            with ui.row().classes("gap-2"):
                ui.button("cancelar", on_click=dlg.close).props("flat")
                ui.button("actualizar", on_click=_actualizar).props("color=positive")
    dlg.open()


def formulario_exportar():
    anios = mod_informes.anios_con_datos()
    if not anios:
        ui.notify("no hay datos para exportar", type="warning")
        return

    ruta_defecto  = str(Path.home() / "contabilidad.xlsx")
    ruta_actual   = [ruta_defecto]
    opciones_anio = {str(a): str(a) for a in anios}

    with ui.dialog() as dlg, ui.card().classes("w-96 gap-4"):
        ui.label("exportar a excel").classes("text-subtitle1")
        with ui.column().classes("w-full gap-1"):
            ui.label("ruta del fichero").classes("text-caption text-grey-6")
            with ui.row().classes("w-full gap-2 items-center"):
                ruta_label = ui.label(ruta_defecto).classes(
                    "flex-1 text-caption font-mono"
                ).style("color:#aaa;word-break:break-all")

                async def _seleccionar():
                    ruta = await dialogo_seleccionar_carpeta()
                    _logger.debug("carpeta dialog → %r", ruta)
                    if ruta:
                        ruta_actual[0] = ruta
                        ruta_label.set_text(ruta)

                ui.button("[...]", on_click=_seleccionar).props("outline size=sm")

        anio_s = ui.select(opciones_anio, label="año", value=str(anios[0])).classes("w-full")

        def _exportar():
            anio = int(anio_s.value)
            ruta = ruta_actual[0].strip()
            _logger.debug("exportando a: %s", ruta)
            try:
                ruta_final = mod_excel.exportar(ruta, anio)
                _logger.info("excel exportado → %s  año=%d", ruta_final, anio)
                ui.notify(f"exportado: {ruta_final} [OK]", type="positive")
                dlg.close()
            except Exception as e:
                _logger.exception("exportar falló")
                ui.notify(f"error: {e}", type="negative")

        with ui.row().classes("justify-end w-full gap-2"):
            ui.button("cancelar", on_click=dlg.close).props("flat")
            ui.button("exportar", on_click=_exportar).props("color=positive")
    dlg.open()
