# Contabilidad — CLAUDE.md

Aplicación de contabilidad para autónomos/pymes. NiceGUI (pywebview nativo) + PostgreSQL.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | NiceGUI 3.x (pywebview nativo, `native=True`) |
| Lógica | Python 3.13+ |
| Base de datos | PostgreSQL vía psycopg2 (RealDictCursor) |
| ORM/Migraciones | SQLAlchemy + Alembic |
| Exportación | openpyxl |
| Config | python-dotenv |

---

## Arrancar

```bash
# Instalar dependencias
pip3 install -r requirements.txt

# Copiar env y configurar DATABASE_URL
cp .env.example .env

# Inicializar BD (primera vez o tras nueva migración)
python3 app.py --init

# Lanzar app (abre ventana nativa)
python3 app.py

# Modo debug (panel lateral de logs)
python3 app.py --debug

# Modo dev (hot reload)
python3 app.py --dev
```

---

## Estructura

```
app.py                   # Entry point: logging, pagina_principal(), ui.run()
interfaz/
  estilos.py             # CSS global (terminal oscuro, ASCII icons)
  estado.py              # _Estado, estado singleton, titulo_mes(), MESES_NOMBRE
  helpers.py             # val_decimal/fecha/entero, campo_fecha, confirmar_eliminar, osascript
  formularios.py         # Todos los formularios UI (crear/editar por entidad)
  secciones.py           # @ui.refreshable secciones + navegar_mes, barra_mes
contabilidad/
  db.py                  # cursor_db() context manager
  modelos.py             # Dataclasses: Ingreso, Gasto, Factura, Presupuesto, ResumenMes
  ingresos.py            # CRUD ingresos
  gastos.py              # CRUD gastos + analítica
  facturas.py            # CRUD facturas
  clientes.py            # CRUD clientes
  presupuestos.py        # CRUD presupuestos
  categorias.py          # CRUD categorías
  informes.py            # Resúmenes mensuales y anuales
  excel.py               # Exportación workbook Excel
alembic/versions/        # Migraciones de esquema
migraciones/             # SQL alternativo (referencia)
```

---

## Imports entre módulos UI

`formularios.py` y `secciones.py` tienen dependencia circular (se llaman mutuamente).
Se resuelve con **lazy imports dentro de función**:

```python
# En formularios.py — al guardar, refrescar sección
def formulario_ingreso():
    from . import secciones
    ...
    secciones.seccion_ingresos.refresh()

# En secciones.py — al click en fila, abrir formulario
@ui.refreshable
def seccion_ingresos():
    from . import formularios
    tabla.on('rowClick', lambda e: formularios.formulario_editar_ingreso(e.args[1]))
```

---

## Dominio BD

Seis tablas core — inferir estructura actual leyendo la migración más reciente en `alembic/versions/`.

| Tabla | Propósito |
|-------|-----------|
| `categorias` | Categorías de ingresos/gastos |
| `clientes` | Clientes facturables |
| `ingresos` | Entradas de ingresos |
| `gastos` | Entradas de gastos |
| `facturas` | Facturas con IVA, estado, cliente |
| `presupuestos` | Presupuestos mensuales por categoría |

Invariantes clave: `importe > 0`, estado facturas en `('pendiente','pagada','cancelada')`.

---

## Convenciones de código

- **Idioma**: variables, comentarios, logs y mensajes de error en **español de España**. Librerías y términos técnicos en inglés.
- **Patrón módulo**: cada módulo de dominio expone funciones puras que usan `cursor_db()`. Sin estado global.
- **Conexión BD**: usar `cursor_db()` de `db.py`. No abrir conexiones directas en otros módulos.
- **Migraciones**: cualquier cambio de esquema va a un archivo nuevo en `alembic/versions/` vía `alembic revision --autogenerate`. Nunca editar migraciones ya aplicadas.
- **Modelos**: cambios en `modelos.py` deben reflejarse en la migración correspondiente.

---

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Conexión principal PostgreSQL |
| `ALEMBIC_DATABASE_URL` | Conexión para migraciones (fallback a `DATABASE_URL`) |

**Nunca** hardcodear credenciales. **Nunca** commitear `.env`.

---

## Qué NO hacer

- No añadir ORM completo (SQLAlchemy models) sin migrar primero el acceso existente en psycopg2 — mezclar capas rompe la coherencia.
- No crear estado compartido entre módulos de dominio.
- No modificar datos directamente en BD de producción sin migración versionada.
- No añadir dependencias sin actualizar `requirements.txt`.

---

## Tests

No hay suite de tests. Al añadir funcionalidad nueva, crear tests en `tests/` usando pytest. Priorizar tests de integración contra BD de test real (no mocks de psycopg2).

---

## Migraciones — flujo

```bash
# Generar migración tras cambiar modelos o esquema
alembic revision --autogenerate -m "descripcion_corta"

# Aplicar migraciones pendientes
alembic upgrade head

# Ver estado actual
alembic current
```

---

## Cómo leer el código sin perderse

1. Empezar en `app.py` — monta los tabs, cada tab llama a una función de `interfaz/secciones.py`.
2. Las secciones usan `mod_*.listar_*()` para cargar datos y llaman a `formularios.*` al hacer click.
3. Los formularios validan, llaman a `mod_*.crear/actualizar/eliminar()`, y refrescan las secciones.
4. Los módulos de dominio (`contabilidad/`) usan `cursor_db()` y ejecutan SQL raw con RealDictCursor.
5. Los resultados se mapean a dataclasses de `modelos.py` cuando aplica.
