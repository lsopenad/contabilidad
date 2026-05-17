# Contabilidad — CLAUDE.md

Aplicación de contabilidad personal (autónomo). Uso personal, sin autenticación.

---

## Stack

**Backend**: FastAPI + SQLAlchemy async (asyncpg) + Alembic + Pydantic v2. Arrancar con `uvicorn app.main:app --reload` desde `backend/`.

**Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui (Radix). TanStack Query para estado servidor, react-hook-form + Zod para formularios, React Router para routing. Arrancar con `pnpm dev` desde `frontend/` → `localhost:4000`.

**Script combinado**: `./start.sh` lanza backend (`:8000`) y frontend (`:4000`). `./stop.sh` para ambos.

Versiones exactas: ver `backend/requirements.txt` y `frontend/package.json`.

---

## Arrancar por primera vez

```bash
cd backend
cp .env.example .env   # editar DATABASE_URL
alembic upgrade head
```

---

## Estructura

```text
backend/app/
  main.py       # FastAPI app, CORS, routers montados en /api/<entidad>
  config.py     # Settings vía pydantic-settings
  database.py   # async_engine, AsyncSession, obtener_sesion()
  modelos/      # SQLAlchemy ORM models
  schemas/      # Pydantic schemas: <Entidad>Crear / Actualizar / Respuesta
  routers/      # Un router por entidad
backend/alembic/versions/   # Migraciones — leer aquí para esquema BD exacto

frontend/src/
  App.tsx              # React Router routes
  pages/               # Una página por sección
  components/layout/   # Nav + Outlet
  components/ui/       # shadcn/ui
  components/selector-categoria.tsx  # Selector compartido de categorías (tipo: ingreso/gasto/ambos)
  lib/api.ts           # axios instance → /api (proxy Vite → :8000)
  lib/utils.ts         # cn(), formatearEuros(), formatearFecha(), MESES_ABREV, MESES_NOMBRE
  lib/mes-context.tsx  # MesProvider + SelectorMes + useMes
  lib/tabla.tsx        # ThSort + useSorte (ordenación de tablas)
  lib/tipos.ts         # Interfaces TypeScript del dominio (Ingreso, Gasto, Suscripcion, etc.)
  lib/crud.ts          # useDialogoCrud<T>() — estado compartido de diálogos CRUD
  lib/esquemas.ts      # esquemaImporte (Zod) compartido
  pages/importar.tsx   # Importación de extractos PDF (Trade Republic) con previsualización
```

---

## Dominio BD

Tablas activas — esquema exacto en `backend/alembic/versions/`.

| Tabla | Propósito |
| --- | --- |
| `categorias` | Categorías de ingresos/gastos (`tipo`: ingreso/gasto/ambos) |
| `ingresos` | Entradas de ingresos (`repeticion_id` UUID vincula copias mensuales) |
| `gastos` | Entradas de gastos, FK categoría (`repeticion_id` igual) |
| `presupuestos` | Presupuesto mensual por categoría, unique (categoria_id, mes, anio) |
| `suscripciones` | Suscripciones recurrentes (`dia_cobro` 1-31, `activa` bool, `frecuencia`: mensual/bimestral/trimestral/semestral/anual, `fecha_inicio` DATE, `fecha_fin` DATE nullable — al desactivar se fija a hoy, al reactivar `fecha_inicio` = hoy y se limpia) |
| `grupos_presupuesto` | Grupos de presupuesto mensual con categorías N:M (`repeticion_id` igual) |
| `grupo_categorias` | Tabla join N:M entre `grupos_presupuesto` y `categorias` |

Invariante global: `importe > 0` en ingresos, gastos, presupuestos, grupos y suscripciones.

**Patrón `repeticion_id`**: UUID que vincula copias del mismo registro en distintos meses. Al crear con `meses_extra`, se genera un UUID compartido. Al editar, `meses_eliminar` borra hermanos por mes; si no quedan hermanos, se limpia `repeticion_id`.

---

## Convenciones

- **Idioma**: variables, comentarios, logs y errores en **español de España**. Librerías y términos técnicos en inglés.
- **Backend**: routers usan `Depends(obtener_sesion)`. Sin estado global entre routers.
- **Schemas**: validador `importe_positivo` en `Crear` y `Actualizar`, no en `Respuesta`.
- **Frontend**: componentes funcionales, datos vía `useQuery` / `useMutation`.
- **Migraciones**: cambio de esquema → `alembic revision --autogenerate` → `alembic upgrade head`. Nunca editar migraciones ya aplicadas.
- **Dependencias**: actualizar `requirements.txt` (backend) o `package.json` (frontend) al añadir paquetes.
- **Paleta UI**: color primario neutro `#5C8097`. Semánticos: `#00ED64` ingreso, `#FF6B35` gasto/peligro. No añadir acentos por sección.

---

## Variables de entorno

| Variable               | Uso                                                          |
| ---------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`         | PostgreSQL asyncpg: `postgresql+asyncpg://user:pass@host/db` |
| `ALEMBIC_DATABASE_URL` | Solo si la URL de migraciones difiere                        |

**Nunca** hardcodear credenciales. **Nunca** commitear `.env`.

---

## Tests

No hay suite. Tests nuevos en `backend/tests/` con pytest + httpx AsyncClient contra BD de test real (sin mocks de SQLAlchemy).
