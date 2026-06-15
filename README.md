# Contabilidad

Aplicación de contabilidad personal para autónomos. Registra ingresos, gastos, suscripciones recurrentes y presupuestos mensuales, con informes de balance mensual y anual.

Uso personal, sin autenticación.

---

## Stack

| Capa | Tecnología |
| ---- | ---------- |
| Backend | FastAPI · SQLAlchemy async · Alembic · Pydantic v2 |
| Base de datos | PostgreSQL (asyncpg) |
| Frontend | React · Vite · TypeScript · Tailwind CSS · shadcn/ui |
| Estado servidor | TanStack Query |
| Formularios | react-hook-form + Zod |
| Exportación | openpyxl (Excel) |
| IA (importación) | Groq — normalización de descripciones CSV |

Versiones exactas: `backend/requirements.txt` y `frontend/package.json`.

---

## Requisitos

- Python 3.11+
- Node.js 20+ con [pnpm](https://pnpm.io)
- PostgreSQL 15+

---

## Instalación

```bash
# 1. Clonar
git clone https://github.com/lsopenad/contabilidad.git
cd contabilidad

# 2. Configurar base de datos
cd backend
cp .env.example .env
# Editar .env → DATABASE_URL=postgresql+asyncpg://usuario:contraseña@host/nombre_bd

# 3. Aplicar migraciones
pip install -r requirements.txt
alembic upgrade head
```

---

## Arrancar

```bash
# Desde la raíz del proyecto — lanza backend (:8000) y frontend (:4000)
./start.sh

# Parar
./stop.sh
```

O por separado:

```bash
# Backend
cd backend
uvicorn app.main:app --reload

# Frontend
cd frontend
pnpm install
pnpm dev
```

- Backend API: `http://localhost:8000`
- Frontend: `http://localhost:4000`
- Documentación API interactiva: `http://localhost:8000/docs`

---

## Funcionalidades

- **Ingresos y gastos** — registro mensual con categorías y descripción. Soporte de repetición automática en múltiples meses. Operaciones en masa: borrado múltiple y cambio de categoría en bloque.
- **Suscripciones** — seguimiento de pagos recurrentes con frecuencia configurable (mensual, bimestral, trimestral, semestral, anual). Al desactivar se registra la fecha de baja (`fecha_fin`) y el historial se preserva en los informes. Al reactivar, empieza a contar desde la fecha de reactivación.
- **Presupuestos** — límite mensual por categoría o por grupos de categorías.
- **Dashboard** — KPIs mensuales (ingresos, gastos, suscripciones, balance) y balance total histórico acumulado.
- **Informes** — balance mensual (ingresos − gastos − suscripciones) e informe anual mes a mes.
- **Exportación Excel** — descarga de datos mensuales en formato `.xlsx`.
- **Importación de extractos** — sube un CSV de Trade Republic, normaliza descripciones con Groq, previsualiza transacciones (deduplicación por `transaction_id`, detección de posibles suscripciones), excluye las que no quieras y confirma.
- **Administración** — borrado masivo de gastos e ingresos (con confirmación).

---

## Variables de entorno

| Variable | Descripción |
| -------- | ----------- |
| `DATABASE_URL` | Conexión PostgreSQL asyncpg: `postgresql+asyncpg://user:pass@host/db` |
| `ALEMBIC_DATABASE_URL` | Solo si la URL de migraciones difiere de `DATABASE_URL` |
| `GROQ_API_KEY` | API key de Groq para normalizar descripciones en la importación CSV |

**Nunca** commitear el fichero `.env`.

---

## Migraciones

```bash
cd backend

# Aplicar todas las pendientes
alembic upgrade head

# Crear nueva migración tras cambiar un modelo
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
```

---

## Estructura del proyecto

```text
backend/
  app/
    main.py          # FastAPI app, CORS, montaje de routers
    modelos/         # Modelos SQLAlchemy ORM
    schemas/         # Schemas Pydantic (Crear / Actualizar / Respuesta)
    routers/         # Un router por entidad
  alembic/versions/  # Historial de migraciones

frontend/
  src/
    pages/           # Una página por sección
    components/      # Componentes compartidos (shadcn/ui + propios)
    lib/             # Utilidades, tipos, contextos, hooks
```
