CSS = """
* {
  font-family: 'SF Mono', 'Menlo', 'Monaco', ui-monospace, 'Cascadia Mono',
               'Courier New', monospace !important;
}
body.body--dark { background: #0c0c0c !important; }

.q-header {
  background: #0f0f0f !important;
  border-bottom: 1px solid #222 !important;
  box-shadow: none !important;
}
.q-tabs {
  background: #0f0f0f !important;
  border-bottom: 1px solid #222 !important;
}
.q-tab { color: #444 !important; font-size: 0.75rem !important; letter-spacing: 0.08em; }
.q-tab--active { color: #4ec9b0 !important; }
.q-tab--active .q-tab__indicator { background: #4ec9b0 !important; }

.q-tab-panels, .q-tab-panel { background: #0c0c0c !important; }

.q-table { background: #0c0c0c !important; border: 1px solid #1a1a1a; }
.q-table thead th {
  background: #111 !important;
  color: #444 !important;
  font-size: 0.65rem !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
  border-bottom: 1px solid #222 !important;
}
.q-table tbody td {
  color: #aaa !important;
  border-bottom: 1px solid #141414 !important;
  font-size: 0.8rem !important;
  padding: 4px 12px !important;
}
.q-table tbody tr:hover td { background: #111 !important; }
.q-table tbody tr { cursor: pointer; }

.q-btn {
  border-radius: 1px !important;
  letter-spacing: 0.06em !important;
  font-size: 0.75rem !important;
}
.q-btn--outline { border-color: currentColor !important; }

.q-card {
  background: #111 !important;
  border: 1px solid #1e1e1e !important;
  border-radius: 1px !important;
  box-shadow: none !important;
}
.q-dialog .q-card {
  background: #111 !important;
  border: 1px solid #2a2a2a !important;
  border-radius: 1px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,.9) !important;
}

.q-field__native, .q-field__input { color: #ccc !important; font-size: 0.82rem !important; }
.q-field__label { color: #555 !important; font-size: 0.78rem !important; }
.q-field--outlined .q-field__control { border-color: #222 !important; }
.q-field--outlined:hover .q-field__control { border-color: #3a3a3a !important; }
.q-field--focused .q-field__control { border-color: #4ec9b0 !important; }

/* ── Material Icons no carga en pywebview — todo via CSS ASCII ───── */
/* silenciar todos los iconos (texto del ligature aparece si la fuente no carga) */
.q-icon {
  font-size: 0 !important;
  line-height: 0 !important;
  width: auto !important;
}

/* select: botón limpiar (clearable) — (0,2,0) */
[class*="clearable"] .q-icon::after,
.q-field__append .q-icon::after {
  content: 'x';
  font-size: 0.65rem;
  color: #444;
  font-family: 'SF Mono', monospace !important;
}
/* select: flecha desplegable — misma especificidad (0,2,0), aparece después → gana */
.q-field__append .q-select__dropdown-icon::after {
  content: 'v';
  font-size: 0.65rem;
  color: #444;
  font-family: 'SF Mono', monospace !important;
  line-height: 1;
}

/* tabla: flechas de ordenación ASCII */
.q-table th.sortable .q-table__sort-icon {
  display: inline-flex !important;
  align-items: center !important;
  opacity: 1 !important;
  line-height: 1 !important;
}
.q-table th.sortable .q-table__sort-icon::after {
  content: '-';
  font-size: 0.6rem !important;
  line-height: 1 !important;
  display: inline-block !important;
  color: #333;
  font-family: 'SF Mono', monospace !important;
}
/* columna activa: ^ (Quasar añade .sorted + rota 180deg en .sort-desc → v) */
.q-table th.sorted .q-table__sort-icon::after {
  content: '^' !important;
  color: #4ec9b0 !important;
}

/* tabla: selección (radio button en facturas) */
.q-radio__bg { border: 1px solid #333 !important; border-radius: 50% !important; }
.q-radio__check { background: #4ec9b0 !important; }
.q-radio__icon { display: none !important; }
/* fila seleccionada — borde izquierdo visual */
.q-table tbody tr.selected td { border-left: 2px solid #4ec9b0 !important; }

.q-menu {
  background: #161616 !important;
  border: 1px solid #2a2a2a !important;
  border-radius: 1px !important;
  box-shadow: 0 4px 20px rgba(0,0,0,.7) !important;
}
.q-item { color: #aaa !important; font-size: 0.82rem !important; }
.q-item:hover { background: #1a1a1a !important; }
.q-item--active { color: #4ec9b0 !important; background: #0d2420 !important; }

.q-drawer {
  background: #080808 !important;
  border-left: 1px solid #1e1e1e !important;
}

.q-badge { border-radius: 1px !important; font-size: 0.68rem !important; letter-spacing: 0.04em; }

.text-positive { color: #4ec9b0 !important; }
.text-negative { color: #f48771 !important; }
.text-warning  { color: #ce9178 !important; }
.text-grey-4   { color: #333 !important; }
.text-grey-5   { color: #3a3a3a !important; }
.text-grey-6   { color: #555 !important; }
.bg-positive   { background: #0d3028 !important; }
.bg-negative   { background: #3b1010 !important; }
.bg-warning    { background: #38260e !important; }

.q-date {
  background: #111 !important;
  border: 1px solid #2a2a2a !important;
  border-radius: 1px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,.9) !important;
}
.q-date__header { background: #0d2420 !important; color: #4ec9b0 !important; }
.q-date__header-title, .q-date__header-subtitle { color: #4ec9b0 !important; }
.q-date__main { color: #aaa !important; }
.q-date__calendar-weekdays > div { color: #333 !important; font-size: 0.65rem !important; }
.q-date__today .q-btn { color: #4ec9b0 !important; font-weight: 700 !important; }
.q-date__calendar-item--active .q-btn { background: #4ec9b0 !important; color: #000 !important; border-radius: 1px !important; }
.q-date__arrow--left  .q-icon::after { content: '<'; font-size: 0.8rem !important; color: #aaa; font-family: 'SF Mono', monospace !important; }
.q-date__arrow--right .q-icon::after { content: '>'; font-size: 0.8rem !important; color: #aaa; font-family: 'SF Mono', monospace !important; }
.q-date__navigation .q-btn { color: #aaa !important; }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: #0a0a0a; }
::-webkit-scrollbar-thumb { background: #222; border-radius: 0; }
::-webkit-scrollbar-thumb:hover { background: #333; }

.nicegui-log {
  background: #060606 !important;
  font-size: 0.68rem !important;
  line-height: 1.6 !important;
  border: 1px solid #161616 !important;
  border-radius: 0 !important;
}
.nicegui-log .line { color: #3a3a3a; }
.nicegui-log .line:last-child { color: #666; }
"""
