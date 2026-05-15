import logging
from datetime import date

from nicegui import ui

import contabilidad.categorias as mod_categorias
import contabilidad.ingresos as mod_ingresos
import contabilidad.gastos as mod_gastos
import contabilidad.facturas as mod_facturas
import contabilidad.presupuestos as mod_presupuestos
import contabilidad.informes as mod_informes

from .estado import estado, titulo_mes, MESES_NOMBRE

_logger = logging.getLogger('contabilidad')


def navegar_mes(delta: int):
    estado.mes += delta
    if estado.mes > 12:
        estado.mes = 1
        estado.anio += 1
    elif estado.mes < 1:
        estado.mes = 12
        estado.anio -= 1
    _logger.debug("nav → %s %d", MESES_NOMBRE[estado.mes], estado.anio)
    seccion_ingresos.refresh()
    seccion_gastos.refresh()
    seccion_presupuestos.refresh()
    seccion_informes.refresh()


def ir_mes_actual():
    hoy = date.today()
    estado.mes  = hoy.month
    estado.anio = hoy.year
    _logger.debug("nav → mes actual %s %d", MESES_NOMBRE[estado.mes], estado.anio)
    seccion_ingresos.refresh()
    seccion_gastos.refresh()
    seccion_presupuestos.refresh()
    seccion_informes.refresh()


def barra_mes(on_nuevo=None, label_nuevo: str = "", color_nuevo: str = "primary"):
    hoy = date.today()
    es_mes_actual = estado.mes == hoy.month and estado.anio == hoy.year
    with ui.row().classes("items-center gap-2 mb-4"):
        ui.button("<", on_click=lambda: navegar_mes(-1)).props("flat dense")
        ui.label(titulo_mes()).classes("text-subtitle2 font-bold min-w-44 text-center text-positive")
        ui.button(">", on_click=lambda: navegar_mes(1)).props("flat dense")
        if not es_mes_actual:
            ui.button("[hoy]", on_click=ir_mes_actual).props("flat dense size=sm color=grey-6")
        ui.space()
        if on_nuevo:
            ui.button(f"+ {label_nuevo}", on_click=on_nuevo).props(f"color={color_nuevo} outline size=sm")


@ui.refreshable
def seccion_ingresos():
    from . import formularios
    barra_mes(on_nuevo=formularios.formulario_ingreso, label_nuevo="nuevo ingreso", color_nuevo="positive")
    filas = mod_ingresos.listar_ingresos(mes=estado.mes, anio=estado.anio)
    _logger.debug("ingresos: %d filas cargadas", len(filas))

    columnas = [
        {"name": "fecha",       "label": "FECHA",       "field": "fecha",       "sortable": True},
        {"name": "importe",     "label": "IMPORTE",     "field": "importe",     "sortable": True},
        {"name": "categoria",   "label": "CATEGORÍA",   "field": "categoria",   "sortable": True},
        {"name": "descripcion", "label": "DESCRIPCIÓN", "field": "descripcion", "sortable": True},
    ]
    filas_tabla = [
        {"id": f["id"], "fecha": str(f["fecha"]),
         "importe": f"{float(f['importe']):.2f}",
         "categoria": f.get("categoria") or "-",
         "descripcion": f.get("descripcion") or "-",
         "categoria_id": f.get("categoria_id")}
        for f in filas
    ]
    tabla = ui.table(columns=columnas, rows=filas_tabla, row_key="id").classes("w-full").props("dense")
    tabla.add_slot("body-cell-importe", """
        <q-td key="importe" :props="props">
            <span style="color:#4ec9b0;font-weight:600">{{ props.value }} €</span>
        </q-td>
    """)
    tabla.on('rowClick', lambda e: formularios.formulario_editar_ingreso(e.args[1]))

    if not filas:
        ui.label("// sin registros este mes").classes("text-grey-6 w-full text-center mt-8 text-caption")


@ui.refreshable
def seccion_gastos():
    from . import formularios
    barra_mes(on_nuevo=formularios.formulario_gasto, label_nuevo="nuevo gasto", color_nuevo="negative")
    filas = mod_gastos.listar_gastos(mes=estado.mes, anio=estado.anio)
    _logger.debug("gastos: %d filas cargadas", len(filas))

    columnas = [
        {"name": "fecha",       "label": "FECHA",       "field": "fecha",       "sortable": True},
        {"name": "importe",     "label": "IMPORTE",     "field": "importe",     "sortable": True},
        {"name": "categoria",   "label": "CATEGORÍA",   "field": "categoria",   "sortable": True},
        {"name": "descripcion", "label": "DESCRIPCIÓN", "field": "descripcion", "sortable": True},
    ]
    filas_tabla = [
        {"id": f["id"], "fecha": str(f["fecha"]),
         "importe": f"{float(f['importe']):.2f}",
         "categoria": f.get("categoria") or "-",
         "descripcion": f.get("descripcion") or "-",
         "categoria_id": f.get("categoria_id")}
        for f in filas
    ]
    tabla = ui.table(columns=columnas, rows=filas_tabla, row_key="id").classes("w-full").props("dense")
    tabla.add_slot("body-cell-importe", """
        <q-td key="importe" :props="props">
            <span style="color:#f48771;font-weight:600">{{ props.value }} €</span>
        </q-td>
    """)
    tabla.on('rowClick', lambda e: formularios.formulario_editar_gasto(e.args[1]))

    if not filas:
        ui.label("// sin registros este mes").classes("text-grey-6 w-full text-center mt-8 text-caption")


@ui.refreshable
def seccion_facturas():
    from . import formularios
    with ui.row().classes("items-center gap-2 mb-4"):
        ui.label("facturas").classes("text-subtitle2 font-bold text-positive")
        ui.space()
        ui.button("+ nueva factura", on_click=formularios.formulario_factura).props("color=warning outline size=sm")

    filas = mod_facturas.listar_facturas()
    _logger.debug("facturas: %d filas cargadas", len(filas))

    columnas = [
        {"name": "numero",        "label": "Nº",     "field": "numero",        "sortable": True},
        {"name": "cliente",       "label": "CLIENTE", "field": "cliente",       "sortable": True},
        {"name": "importe_base",  "label": "BASE",    "field": "importe_base",  "sortable": True},
        {"name": "iva",           "label": "IVA",     "field": "iva",           "sortable": True},
        {"name": "importe_total", "label": "TOTAL",   "field": "importe_total", "sortable": True},
        {"name": "fecha",         "label": "FECHA",   "field": "fecha",         "sortable": True},
        {"name": "estado",        "label": "ESTADO",  "field": "estado",        "sortable": True},
    ]
    filas_tabla = [
        {"id": f["id"], "numero": f["numero"],
         "cliente": f.get("cliente") or "-",
         "cliente_id": f.get("cliente_id"),
         "importe_base": f"{float(f['importe_base']):.2f}",
         "iva": f"{float(f['iva_porcentaje']):.0f}%",
         "importe_total": f"{float(f['importe_total']):.2f}",
         "fecha": str(f["fecha"]), "estado": f["estado"],
         "descripcion": f.get("descripcion") or ""}
        for f in filas
    ]
    tabla = ui.table(columns=columnas, rows=filas_tabla, row_key="id").classes("w-full").props("dense")
    tabla.add_slot("body-cell-estado", """
        <q-td key="estado" :props="props">
            <q-badge
                :color="props.value==='pagada'?'positive':props.value==='cancelada'?'negative':'warning'"
                :label="props.value"
            />
        </q-td>
    """)
    tabla.on('rowClick', lambda e: formularios.formulario_editar_factura(e.args[1]))

    if not filas:
        ui.label("// sin facturas").classes("text-grey-6 w-full text-center mt-8 text-caption")


@ui.refreshable
def seccion_presupuestos():
    from . import formularios
    barra_mes(on_nuevo=formularios.formulario_presupuesto, label_nuevo="nuevo presupuesto", color_nuevo="primary")
    filas = mod_presupuestos.listar_presupuestos(mes=estado.mes, anio=estado.anio)
    _logger.debug("presupuestos: %d filas cargadas", len(filas))

    columnas = [
        {"name": "categoria",   "label": "CATEGORÍA",   "field": "categoria"},
        {"name": "presupuesto", "label": "PRESUPUESTO", "field": "presupuesto", "sortable": True},
        {"name": "gastado",     "label": "GASTADO",     "field": "gastado",     "sortable": True},
        {"name": "restante",    "label": "RESTANTE",    "field": "restante",    "sortable": True},
    ]
    filas_tabla = [
        {"id": f["id"],
         "categoria": f.get("categoria") or "-",
         "presupuesto": f"{float(f['presupuesto']):.2f}",
         "gastado": f"{float(f['gastado']):.2f}",
         "restante": f"{float(f['restante']):.2f}",
         "negativo": float(f["restante"]) < 0}
        for f in filas
    ]
    tabla = ui.table(columns=columnas, rows=filas_tabla, row_key="id").classes("w-full").props("dense")
    tabla.add_slot("body-cell-restante", """
        <q-td key="restante" :props="props">
            <span :style="props.row.negativo
                ? 'color:#f48771;font-weight:600'
                : 'color:#4ec9b0;font-weight:600'">
                {{ props.value }} €
            </span>
        </q-td>
    """)
    tabla.on('rowClick', lambda e: formularios.formulario_editar_presupuesto(e.args[1]))

    if not filas:
        ui.label("// sin presupuestos este mes").classes("text-grey-6 w-full text-center mt-8 text-caption")


@ui.refreshable
def seccion_categorias():
    from . import formularios
    with ui.row().classes("items-center gap-2 mb-4"):
        ui.label("categorías").classes("text-subtitle2 font-bold text-positive")
        ui.space()
        ui.button("+ nueva categoría", on_click=formularios.formulario_nueva_categoria).props("color=positive outline size=sm")

    cats = mod_categorias.listar_categorias()
    _logger.debug("categorías: %d cargadas", len(cats))

    columnas = [
        {"name": "nombre", "label": "NOMBRE", "field": "nombre", "sortable": True},
    ]
    grupos = [
        ("ingreso", "#4ec9b0"),
        ("gasto",   "#f48771"),
        ("ambos",   "#ce9178"),
    ]

    with ui.row().classes("w-full gap-4 items-start"):
        for tipo, color in grupos:
            filas_tipo = [c for c in cats if c["tipo"] == tipo]
            with ui.column().classes("flex-1 gap-2"):
                ui.label(tipo).style(
                    f"color:{color};font-size:0.7rem;letter-spacing:0.12em;"
                    "text-transform:uppercase;font-weight:700"
                )
                if filas_tipo:
                    t = ui.table(columns=columnas, rows=filas_tipo, row_key="id").classes("w-full").props("dense")
                    t.on('rowClick', lambda e: formularios.formulario_editar_categoria(e.args[1]))
                else:
                    ui.label("// vacío").classes("text-grey-6 text-caption")


@ui.refreshable
def seccion_informes():
    with ui.row().classes("items-center gap-2 mb-4"):
        ui.button("<", on_click=lambda: navegar_mes(-1)).props("flat dense")
        ui.label(titulo_mes()).classes("text-subtitle2 font-bold min-w-44 text-center text-positive")
        ui.button(">", on_click=lambda: navegar_mes(1)).props("flat dense")

    resumen = mod_informes.resumen_mes(estado.mes, estado.anio)
    balance = resumen.balance
    _logger.debug("informe %d/%d  ing=%.2f  gas=%.2f  bal=%.2f",
                  estado.mes, estado.anio,
                  float(resumen.total_ingresos),
                  float(resumen.total_gastos),
                  float(balance))

    color_bal = "#4ec9b0" if balance >= 0 else "#f48771"
    tarjetas = [
        ("ingresos",          f"{float(resumen.total_ingresos):.2f} €",          "#4ec9b0"),
        ("gastos",            f"{float(resumen.total_gastos):.2f} €",            "#f48771"),
        ("balance",           f"{float(balance):.2f} €",                          color_bal),
        ("facturas emitidas", f"{float(resumen.total_facturas_emitidas):.2f} €", "#ce9178"),
    ]
    with ui.row().classes("gap-3 w-full mb-6 flex-wrap"):
        for ttitulo, valor, color in tarjetas:
            with ui.card().tight().classes("flex-1 min-w-36 p-4"):
                ui.label(ttitulo).classes("text-grey-6 text-caption uppercase mb-1")
                ui.label(valor).style(f"color:{color};font-weight:700;font-size:1.05rem")

    ui.label(f"resumen {estado.anio}").classes("text-caption text-grey-6 uppercase mb-2")
    resumenes = mod_informes.resumen_anual(estado.anio)
    columnas = [
        {"name": "mes",      "label": "MES",      "field": "mes",      "sortable": True},
        {"name": "ingresos", "label": "INGRESOS", "field": "ingresos", "sortable": True},
        {"name": "gastos",   "label": "GASTOS",   "field": "gastos",   "sortable": True},
        {"name": "balance",  "label": "BALANCE",  "field": "balance",  "sortable": True},
    ]
    filas_tabla = [
        {"mes": MESES_NOMBRE[r.mes],
         "ingresos": f"{float(r.total_ingresos):.2f}",
         "gastos":   f"{float(r.total_gastos):.2f}",
         "balance":  f"{float(r.balance):.2f}",
         "negativo": r.balance < 0}
        for r in resumenes
    ]
    tabla = ui.table(columns=columnas, rows=filas_tabla, row_key="mes").classes("w-full").props("dense")
    tabla.add_slot("body-cell-balance", """
        <q-td key="balance" :props="props">
            <span :style="props.row.negativo
                ? 'color:#f48771;font-weight:600'
                : 'color:#4ec9b0;font-weight:600'">
                {{ props.value }} €
            </span>
        </q-td>
    """)


def seccion_exportar():
    from . import formularios
    with ui.column().classes("items-center justify-center gap-4 mt-20 w-full"):
        ui.label("[export]").style("font-size:1.5rem;color:#222;letter-spacing:0.2em")
        ui.label("exportar datos a excel").classes("text-h6 text-grey-6")
        ui.label("resumen anual / ingresos / gastos / facturas").classes("text-caption text-grey-6")
        ui.button("exportar excel...", on_click=formularios.formulario_exportar).props("color=positive outline")
