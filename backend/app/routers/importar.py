import asyncio
import csv
import io
import json
import re
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from groq import Groq
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import config
from ..database import obtener_sesion
from ..modelos.gasto import Gasto
from ..modelos.ingreso import Ingreso
from ..schemas.importar import (
    ConfirmarRequest,
    ConfirmarResponse,
    PreviewResponse,
    TransaccionConfirmar,
    TransaccionPreview,
)

router = APIRouter()

# ── Constantes ────────────────────────────────────────────────────────────────

_TIPOS_OMITIR = {"BUY", "SELL", "TAX_OPTIMIZATION", "BENEFITS_SAVEBACK"}

_KEYWORDS_SUSCRIPCION = [
    "APPLE.COM/BILL", "CLAUDE.AI", "SUBSCRIPTION", "NETFLIX", "SPOTIFY",
    "AMAZON PRIME", "DISNEY+", "HBO", "YOUTUBE", "GOOGLE ONE",
    "MICROSOFT", "DROPBOX", "ICLOUD", "PATREON",
]

# (patron_regex, categoria_id)
_REGLAS_CATEGORIA: list[tuple[str, int]] = [
    (r"FEGIME", 1),
    (r"INTER[EÉ]S|INTEREST|INTERESES|DIVIDENDO", 3),
    (r"RENFE|TUEBICI|BOLT|MPASS|CABIFY|UBER\s*\*?\s*(?!EAT)|BLABLACAR", 5),
    (r"UBER\s*\*?\s*EAT|JUST.?EAT|GLOVO|DELIVEROO|PAPA JOHNS", 13),
    (r"MERCADONA|CARREFOUR|LIDL|ALDI\b|DIA\b|ALCAMPO|EROSKI|CONSUM|SUPERCOR|FRUTOS SECOS", 4),
    (r"FUNDACI[OÓ]N|JUEGATERAPIA|DONACI[OÓ]N|ONG\b", 10),
    (r"MAPFRE|AXA|MUTUA|SEGUROS|ADESLAS", 8),
    (r"ZARA|H&M|MANGO\b|PRIMARK|BERSHKA|PULL.?BEAR|STRADIVARIUS|KLARNA|BIRKENSTOCK", 14),
    (r"REVOLUT", 10),
]

_IBAN_RE = re.compile(r"\s*\([A-Z]{2}\d{2}[A-Z0-9]{4,}\)\s*$")
_NULL_SUFFIX_RE = re.compile(r"null\s*$", re.IGNORECASE)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _limpiar_descripcion_raw(nombre: str, descripcion: str) -> str:
    texto = nombre.strip() if nombre.strip() else descripcion.strip()
    texto = _NULL_SUFFIX_RE.sub("", texto).strip()
    texto = _IBAN_RE.sub("", texto).strip()
    return texto


def _categoria_para(descripcion: str, importe: Decimal) -> Optional[int]:
    desc = descripcion.upper()
    if re.search(r"PISO GERMAN|GERMAN.*PISO", desc):
        return 7 if importe > 100 else 12
    for patron, cat_id in _REGLAS_CATEGORIA:
        if re.search(patron, desc):
            return cat_id
    return None


def _es_posible_suscripcion(descripcion: str) -> bool:
    desc = descripcion.upper()
    return any(kw in desc for kw in _KEYWORDS_SUSCRIPCION)


# ── Parser CSV Trade Republic ──────────────────────────────────────────────────

def _parsear_csv_trade_republic(contenido: bytes) -> list[dict]:
    texto = contenido.decode("utf-8-sig")
    lector = csv.DictReader(io.StringIO(texto))
    filas: list[dict] = []

    for fila in lector:
        tipo = fila.get("type", "").strip()
        categoria = fila.get("category", "").strip()

        if tipo in _TIPOS_OMITIR or categoria == "TRADING":
            continue

        amount_str = fila.get("amount", "").strip()
        if not amount_str:
            continue

        try:
            importe_raw = Decimal(amount_str)
        except Exception:
            continue

        if importe_raw == 0:
            continue

        fecha_str = fila.get("date", "").strip()
        try:
            fecha = date.fromisoformat(fecha_str)
        except ValueError:
            continue

        nombre = fila.get("name", "").strip()
        descripcion = fila.get("description", "").strip()
        descripcion_raw = _limpiar_descripcion_raw(nombre, descripcion)

        transaction_id = fila.get("transaction_id", "").strip() or None
        direccion = "ingreso" if importe_raw > 0 else "gasto"
        importe = abs(importe_raw)

        filas.append({
            "fecha": fecha,
            "tipo": tipo,
            "descripcion_raw": descripcion_raw,
            "importe": importe,
            "direccion": direccion,
            "transaction_id": transaction_id,
        })

    return filas


# ── Normalización con Groq ─────────────────────────────────────────────────────

_GROQ_MODEL = "llama-3.3-70b-versatile"
_GROQ_SYSTEM = (
    "Eres un asistente que normaliza descripciones de transacciones bancarias. "
    "Recibes un array JSON de objetos con dos campos: 'desc' (descripción original) y 'dir' ('ingreso' o 'gasto'). "
    "Devuelve ÚNICAMENTE un array JSON del mismo tamaño con los nombres normalizados en español (solo strings, sin objetos). "
    "Reglas: "
    "- Nombre corto sin verbo, sin IBAN, en español de España. "
    "- Mantén nombres de comercios y personas tal cual (solo corrige acentos si faltan). "
    "- Transferencias entrantes (dir='ingreso'): 'Incoming transfer from X' → 'Transferencia de X'. "
    "- Transferencias salientes (dir='gasto'): 'Outgoing transfer to/for X' → 'Transferencia a X'. "
    "- 'Interest payment' o similar → 'Intereses'. "
    "- 'Cash Dividend' o similar → 'Dividendo'. "
    "- Comercios y pagos con tarjeta: nombre limpio sin prefijo ('MERCADONA' → 'Mercadona', 'NETFLIX.COM' → 'Netflix'). "
    "Sin explicaciones, sin markdown, solo el array JSON de strings."
)
_CHUNK_SIZE = 50

_EntradaGroq = dict  # {"desc": str, "dir": "ingreso" | "gasto"}


def _normalizar_chunk_sync(cliente: Groq, chunk: list[_EntradaGroq]) -> list[str]:
    respuesta = cliente.chat.completions.create(
        model=_GROQ_MODEL,
        messages=[
            {"role": "system", "content": _GROQ_SYSTEM},
            {"role": "user", "content": json.dumps(chunk, ensure_ascii=False)},
        ],
        temperature=0,
        max_tokens=4096,
    )
    contenido = respuesta.choices[0].message.content or ""
    m = re.search(r"\[.*\]", contenido, re.DOTALL)
    if not m:
        raise ValueError(f"respuesta sin array JSON — {contenido[:200]}")
    normalizadas = json.loads(m.group())
    if not isinstance(normalizadas, list) or len(normalizadas) != len(chunk):
        raise ValueError(f"tamaño de array incorrecto ({len(normalizadas)} vs {len(chunk)})")
    return [str(n).strip() or e["desc"] for n, e in zip(normalizadas, chunk)]


async def _normalizar_con_groq(entradas: list[_EntradaGroq]) -> tuple[list[str], str | None]:
    if not config.groq_api_key or not entradas:
        return [e["desc"] for e in entradas], None

    chunks = [entradas[i:i + _CHUNK_SIZE] for i in range(0, len(entradas), _CHUNK_SIZE)]
    cliente = Groq(api_key=config.groq_api_key)
    loop = asyncio.get_event_loop()

    async def _procesar_chunk(chunk: list[_EntradaGroq]) -> tuple[list[str], str | None]:
        try:
            resultado = await loop.run_in_executor(None, _normalizar_chunk_sync, cliente, chunk)
            return resultado, None
        except Exception as e:
            return [e["desc"] for e in chunk], str(e)

    resultados = await asyncio.gather(*[_procesar_chunk(c) for c in chunks])

    normalizadas: list[str] = []
    errores: list[str] = []
    for datos, error in resultados:
        normalizadas.extend(datos)
        if error:
            errores.append(error)

    error_final = f"groq: {'; '.join(errores)}" if errores else None
    return normalizadas, error_final


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/previsualizar", response_model=PreviewResponse)
async def previsualizar(
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(obtener_sesion),
) -> PreviewResponse:
    contenido = await archivo.read()
    filas_raw = _parsear_csv_trade_republic(contenido)

    # Normalizar descripciones en batch con Groq
    entradas_groq = [{"desc": f["descripcion_raw"], "dir": f["direccion"]} for f in filas_raw]
    descripciones, groq_error = await _normalizar_con_groq(entradas_groq)

    # Cargar en batch todos los identificadores existentes para dedup en Python
    ids_ingresos_tx = set(
        (await db.execute(
            select(Ingreso.transaction_id).where(Ingreso.transaction_id.isnot(None))
        )).scalars().all()
    )
    ids_gastos_tx = set(
        (await db.execute(
            select(Gasto.transaction_id).where(Gasto.transaction_id.isnot(None))
        )).scalars().all()
    )
    # Para dedup sin transaction_id: tuples (fecha, importe, descripcion)
    claves_ingresos = set(
        (await db.execute(
            select(Ingreso.fecha, Ingreso.importe, Ingreso.descripcion)
        )).all()
    )
    claves_gastos = set(
        (await db.execute(
            select(Gasto.fecha, Gasto.importe, Gasto.descripcion)
        )).all()
    )

    transacciones: list[TransaccionPreview] = []
    omitidas = 0

    for indice, (fila, desc) in enumerate(zip(filas_raw, descripciones)):
        importe: Decimal = fila["importe"]
        if not importe or importe <= 0:
            omitidas += 1
            continue

        direccion: str = fila["direccion"]
        fecha: date = fila["fecha"]
        transaction_id: Optional[str] = fila["transaction_id"]
        cat_id = _categoria_para(desc, importe)

        # Dedup en Python usando los sets cargados en batch
        if transaction_id:
            if direccion == "ingreso":
                duplicado = 1 if transaction_id in ids_ingresos_tx else 0
            else:
                duplicado = 1 if transaction_id in ids_gastos_tx else 0
        else:
            clave = (fecha, importe, desc if desc else None)
            if direccion == "ingreso":
                duplicado = 1 if clave in claves_ingresos else 0
            else:
                duplicado = 1 if clave in claves_gastos else 0

        transacciones.append(TransaccionPreview(
            indice=indice,
            fecha=fecha,
            descripcion=desc,
            importe=importe,
            tipo=direccion,
            categoria_id=cat_id,
            es_duplicado=duplicado > 0,
            es_posible_suscripcion=_es_posible_suscripcion(desc),
            transaction_id=transaction_id,
        ))

    return PreviewResponse(transacciones=transacciones, omitidas=omitidas, groq_error=groq_error)


@router.post("/confirmar", response_model=ConfirmarResponse)
async def confirmar(
    datos: ConfirmarRequest,
    db: AsyncSession = Depends(obtener_sesion),
) -> ConfirmarResponse:
    ingresos_n = 0
    gastos_n = 0

    for t in datos.transacciones:
        if t.tipo == "ingreso":
            db.add(Ingreso(
                fecha=t.fecha,
                importe=t.importe,
                descripcion=t.descripcion or None,
                categoria_id=t.categoria_id,
                transaction_id=t.transaction_id,
            ))
            ingresos_n += 1
        else:
            db.add(Gasto(
                fecha=t.fecha,
                importe=t.importe,
                descripcion=t.descripcion or None,
                categoria_id=t.categoria_id,
                transaction_id=t.transaction_id,
            ))
            gastos_n += 1

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Una o más transacciones ya existen (transaction_id duplicado). "
                   "Revisar la previsualización para desmarcar los duplicados antes de confirmar.",
        )
    return ConfirmarResponse(ingresos_creados=ingresos_n, gastos_creados=gastos_n)
