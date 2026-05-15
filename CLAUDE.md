# Contabilidad — CLAUDE.md

Aplicación de contabilidad personal (autónomo). Uso personal, sin autenticación.

---

## Stack

**Backend**: FastAPI + SQLAlchemy async (asyncpg) + Alembic + Pydantic v2. Arrancar con `uvicorn app.main:app --reload` desde `backend/`.

**Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui (Radix). TanStack Query para estado servidor, react-hook-form + Zod para formularios, React Router para routing. Arrancar con `pnpm dev` desde `frontend/` → `localhost:4000`.

**Script combinado**: `./run-dev.sh` lanza backend (`:8000`) y frontend (`:4000`).

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

```
backend/app/
  main.py       # FastAPI app, CORS, routers montados en /api/<entidad>
  config.py     # Settings vía pydantic-settings
  database.py   # async_engine, AsyncSession, obtener_sesion()
  modelos/      # SQLAlchemy ORM models
  schemas/      # Pydantic schemas: <Entidad>Crear / Actualizar / Respuesta
  routers/      # Un router por entidad
backend/alembic/versions/   # Migraciones — leer aquí para esquema BD exacto

frontend/src/
  App.tsx            # React Router routes
  pages/             # Una página por sección
  components/layout/ # Nav + Outlet
  components/ui/     # shadcn/ui
  lib/api.ts         # axios instance → /api (proxy Vite → :8000)
  lib/utils.ts       # cn(), formatearEuros(), formatearFecha()
```

---

## Dominio BD

Tablas activas — esquema exacto en `backend/alembic/versions/`.

| Tabla | Propósito |
|-------|-----------|
| `categorias` | Categorías de ingresos/gastos (`tipo`: ingreso/gasto/ambos) |
| `ingresos` | Entradas de ingresos |
| `gastos` | Entradas de gastos (FK categoría) |
| `presupuestos` | Presupuesto mensual por categoría |
| `suscripciones` | Suscripciones recurrentes (`dia_cobro` 1-31, `activa` bool) |

Invariante global: `importe > 0` en ingresos, gastos y suscripciones.

---

## Convenciones

- **Idioma**: variables, comentarios, logs y errores en **español de España**. Librerías y términos técnicos en inglés.
- **Backend**: routers usan `Depends(obtener_sesion)`. Sin estado global entre routers.
- **Schemas**: validador `importe_positivo` en `Crear` y `Actualizar`, no en `Respuesta`.
- **Frontend**: componentes funcionales, datos vía `useQuery` / `useMutation`.
- **Migraciones**: cambio de esquema → `alembic revision --autogenerate` → `alembic upgrade head`. Nunca editar migraciones ya aplicadas.
- **Dependencias**: actualizar `requirements.txt` (backend) o `package.json` (frontend) al añadir paquetes.

---

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL asyncpg: `postgresql+asyncpg://user:pass@host/db` |
| `ALEMBIC_DATABASE_URL` | Solo si la URL de migraciones difiere |

**Nunca** hardcodear credenciales. **Nunca** commitear `.env`.

---

## Tests

No hay suite. Tests nuevos en `backend/tests/` con pytest + httpx AsyncClient contra BD de test real (sin mocks de SQLAlchemy).
