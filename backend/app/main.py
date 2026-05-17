from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import categorias, ingresos, gastos, presupuestos, suscripciones, informes, excel, grupos_presupuesto, importar

app = FastAPI(title="Contabilidad API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categorias.router,    prefix="/api/categorias",    tags=["categorias"])
app.include_router(ingresos.router,      prefix="/api/ingresos",      tags=["ingresos"])
app.include_router(gastos.router,        prefix="/api/gastos",        tags=["gastos"])
app.include_router(presupuestos.router,  prefix="/api/presupuestos",  tags=["presupuestos"])
app.include_router(suscripciones.router, prefix="/api/suscripciones", tags=["suscripciones"])
app.include_router(informes.router,      prefix="/api/informes",      tags=["informes"])
app.include_router(excel.router,         prefix="/api/excel",         tags=["excel"])
app.include_router(grupos_presupuesto.router, prefix="/api/grupos-presupuesto", tags=["grupos-presupuesto"])
app.include_router(importar.router,          prefix="/api/importar",          tags=["importar"])


@app.get("/api/health")
async def health():
    return {"estado": "ok"}
