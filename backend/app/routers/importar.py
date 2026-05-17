import io
import re
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

import httpx
import pdfplumber
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import config
from ..database import obtener_sesion
from ..modelos.cuenta_banco import CuentaBanco
from ..modelos.gasto import Gasto
from ..modelos.ingreso import Ingreso
from ..routers.cuentas_banco import _BASE_URL, _cabeceras
from ..schemas.importar import (
    ConfirmarRequest,
    ConfirmarResponse,
    PreviewResponse,
    TransaccionConfirmar,
    TransaccionPreview,
)

router = APIRouter()

# ── Constantes ────────────────────────────────────────────────────────────────

_TIPOS_OMITIR = {"operar", "impuestos"}

_KEYWORDS_SUSCRIPCION = [
    "APPLE.COM/BILL", "CLAUDE.AI", "SUBSCRIPTION", "NETFLIX", "SPOTIFY",
    "AMAZON PRIME", "DISNEY+", "HBO", "YOUTUBE PREMIUM", "GOOGLE ONE",
    "MICROSOFT", "DROPBOX", "ICLOUD",
]

_MESES_ES = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12,
}

# (patron_regex, categoria_id)
_REGLAS_CATEGORIA: list[tuple[str, int]] = [
    (r"FEGIME", 1),
    (r"INTER[EÉ]S|INTEREST|BONIFICACI[OÓ]N|CASH REWARD|RENTABILIDAD", 3),
    (r"RENFE|TUEBICI|BOLT\.EU|MPASS|CABIFY|UBER\s*\*?\s*(?!EAT)", 5),
    (r"UBER\s*\*?\s*EAT|JUST.?EAT|GLOVO|DELIVEROO", 13),
    (r"MERCADONA|CARREFOUR|LIDL|ALDI\b|DIA\b|ALCAMPO|EROSKI|CONSUM", 4),
    (r"FUNDACI[OÓ]N|JUEGATERAPIA|DONACI[OÓ]N|ONG\b", 10),
    (r"MAPFRE|AXA|MUTUA|SEGUROS", 8),
    (r"ZARA|H&M|MANGO\b|PRIMARK|BERSHKA|PULL.?BEAR|STRADIVARIUS", 14),
    (r"REVOLUT", 10),
]

# ── Helpers de parseo ─────────────────────────────────────────────────────────

def _parsear_fecha(texto: str) -> Optional[date]:
    m = re.search(r"(\d{1,2})\s+(\w{3})\s+(\d{4})", texto)
    if not m:
        return None
    mes = _MESES_ES.get(m.group(2).lower())
    if not mes:
        return None
    try:
        return date(int(m.group(3)), mes, int(m.group(1)))
    except ValueError:
        return None


def _parsear_importe(texto: Optional[str]) -> Optional[Decimal]:
    if not texto or not texto.strip():
        return None
    texto = texto.replace("€", "").strip()
    # Formato europeo: 1.279,08 → 1279.08
    if re.search(r"\d\.\d{3}[,\s]", texto):
        texto = texto.replace(".", "")
    texto = texto.replace(",", ".")
    try:
        val = Decimal(re.sub(r"[^\d.]", "", texto))
        return val if val > 0 else None
    except Exception:
        return None


def _normalizar(texto: str) -> str:
    return re.sub(r"\s+", " ", texto).strip()


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


# ── Parser PDF Trade Republic ──────────────────────────────────────────────────

_DIA_MES_RE = re.compile(
    r"^\s*(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s*$",
    re.IGNORECASE,
)
_ANIO_RE = re.compile(r"^\s*(\d{4})\s*(.*)", re.DOTALL)
_IMPORTE_RE = re.compile(r"([\d]+(?:\.[\d]{3})*,[\d]{2})\s*€")
_SALTAR_LINEA_RE = re.compile(
    r"^(Trade Republic|C/\s*Vel|Creado en|P[áa]gina|NIF|www\.|Domicilio|Registrada|Director|Andreas|Gernot|Christian|Thomas|TRADE REPUBLIC)",
    re.IGNORECASE,
)
_TIPOS_CONOCIDOS = [
    "transacción con tarjeta", "recibos domiciliados",
    "bonificación", "transferencia", "impuestos", "interés", "operar",
]


def _importe_de_str(s: str) -> Decimal:
    return Decimal(s.replace(".", "").replace(",", "."))


def _extraer_tipo(texto: str) -> tuple[str, str]:
    tl = texto.lower()
    for t in sorted(_TIPOS_CONOCIDOS, key=len, reverse=True):
        if tl.startswith(t):
            return t, texto[len(t):].strip()
    return "", texto


def _parsear_pdf_trade_republic(contenido: bytes) -> list[dict]:
    """
    Parser de texto para extractos Trade Republic.
    Las transacciones se presentan con la fecha partida en dos líneas:
      "DD MMM"
      "YYYY [Tipo] [Descripción] [importe €] [balance €]"
    El tipo puede aparecer también en una línea extra ("Transacción" / "con tarjeta").
    Se usa delta de saldo para determinar dirección (ingreso/gasto).
    """
    lineas_raw: list[str] = []
    with pdfplumber.open(io.BytesIO(contenido)) as pdf:
        for pagina in pdf.pages:
            texto = pagina.extract_text() or ""
            lineas_raw.extend(texto.split("\n"))

    filas: list[dict] = []
    saldo_anterior: Optional[Decimal] = None

    # Estado de la máquina
    dia: Optional[int] = None
    mes: Optional[int] = None
    fecha_pendiente: Optional[date] = None
    acum: str = ""  # Acumulador de tipo+desc antes de encontrar importes

    def _emitir(texto_con_importes: str) -> None:
        nonlocal saldo_anterior, fecha_pendiente, acum
        if fecha_pendiente is None:
            return
        importes_str = _IMPORTE_RE.findall(texto_con_importes)
        if len(importes_str) < 2:
            return
        importes = [_importe_de_str(s) for s in importes_str]
        nuevo_saldo = importes[-1]
        pago = importes[-2]
        texto_limpio = _normalizar(_IMPORTE_RE.sub("", texto_con_importes))
        tipo, desc = _extraer_tipo(texto_limpio)
        if saldo_anterior is not None:
            direccion = "ingreso" if nuevo_saldo > saldo_anterior else "gasto"
        else:
            direccion = "gasto"
        saldo_anterior = nuevo_saldo
        filas.append({
            "fecha": fecha_pendiente,
            "tipo": tipo,
            "descripcion": desc,
            "importe": pago,
            "direccion": direccion,
        })
        fecha_pendiente = None
        acum = ""

    for linea in lineas_raw:
        s = linea.strip()
        if not s or _SALTAR_LINEA_RE.match(s):
            continue

        # ¿Línea "DD MMM"?
        m_dia = _DIA_MES_RE.match(s)
        if m_dia:
            # Emitir la transacción pendiente si la teníamos acumulada
            if fecha_pendiente and acum and _IMPORTE_RE.search(acum):
                _emitir(acum)
            dia = int(m_dia.group(1))
            mes = _MESES_ES.get(m_dia.group(2).lower())
            fecha_pendiente = None
            acum = ""
            continue

        # ¿Línea "YYYY [resto]"?
        if dia is not None and mes is not None:
            m_anio = _ANIO_RE.match(s)
            if m_anio:
                try:
                    fecha_pendiente = date(int(m_anio.group(1)), mes, dia)
                except ValueError:
                    fecha_pendiente = None
                dia = mes = None
                acum = m_anio.group(2).strip()
                if _IMPORTE_RE.search(acum):
                    _emitir(acum)
                continue

        # ¿Línea de continuación para la transacción pendiente?
        if fecha_pendiente is not None:
            if _IMPORTE_RE.search(s):
                _emitir(acum + " " + s)
            else:
                acum = (acum + " " + s).strip()

    # Emitir última pendiente
    if fecha_pendiente and acum and _IMPORTE_RE.search(acum):
        _emitir(acum)

    return filas


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/previsualizar", response_model=PreviewResponse)
async def previsualizar(
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(obtener_sesion),
) -> PreviewResponse:
    contenido = await archivo.read()
    filas_raw = _parsear_pdf_trade_republic(contenido)

    transacciones: list[TransaccionPreview] = []
    omitidas = 0

    for indice, fila in enumerate(filas_raw):
        tipo_norm = fila["tipo"].lower()
        if any(omitir in tipo_norm for omitir in _TIPOS_OMITIR):
            omitidas += 1
            continue

        direccion: str = fila["direccion"]
        importe: Decimal = fila["importe"]

        if not importe or importe <= 0:
            omitidas += 1
            continue

        desc = fila["descripcion"]
        fecha: date = fila["fecha"]
        cat_id = _categoria_para(desc, importe)

        if direccion == "ingreso":
            duplicado = await db.scalar(
                select(func.count(Ingreso.id)).where(
                    Ingreso.fecha == fecha,
                    Ingreso.importe == importe,
                    Ingreso.descripcion == desc,
                )
            ) or 0
        else:
            duplicado = await db.scalar(
                select(func.count(Gasto.id)).where(
                    Gasto.fecha == fecha,
                    Gasto.importe == importe,
                    Gasto.descripcion == desc,
                )
            ) or 0

        transacciones.append(TransaccionPreview(
            indice=indice,
            fecha=fecha,
            descripcion=desc,
            importe=importe,
            tipo=direccion,
            categoria_id=cat_id,
            es_duplicado=duplicado > 0,
            es_posible_suscripcion=_es_posible_suscripcion(desc),
        ))

    return PreviewResponse(transacciones=transacciones, omitidas=omitidas)


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
                external_id=t.external_id or None,
            ))
            ingresos_n += 1
        else:
            db.add(Gasto(
                fecha=t.fecha,
                importe=t.importe,
                descripcion=t.descripcion or None,
                categoria_id=t.categoria_id,
                external_id=t.external_id or None,
            ))
            gastos_n += 1

    await db.commit()
    return ConfirmarResponse(ingresos_creados=ingresos_n, gastos_creados=gastos_n)


@router.post("/sincronizar/{cuenta_id}", response_model=PreviewResponse)
async def sincronizar_banco(
    cuenta_id: int,
    db: AsyncSession = Depends(obtener_sesion),
) -> PreviewResponse:
    cuenta = await db.get(CuentaBanco, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada")

    if cuenta.status == "expired":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conexión expirada. Reconecta el banco desde la interfaz.",
        )

    fecha_desde = (date.today() - timedelta(days=90)).isoformat()
    transacciones: list[TransaccionPreview] = []
    omitidas = 0
    indice = 0
    siguiente_id: str | None = None

    # Salt Edge pagina con next_id
    while True:
        params: dict[str, str] = {
            "connection_id": cuenta.connection_id,
            "date_from": fecha_desde,
        }
        if siguiente_id:
            params["from_id"] = siguiente_id

        async with httpx.AsyncClient() as cliente:
            resp = await cliente.get(
                f"{_BASE_URL}/transactions",
                params=params,
                headers=_cabeceras(),
            )

        if not resp.is_success:
            break

        payload = resp.json()
        movimientos = payload.get("data", [])
        meta = payload.get("meta", {})

        for mov in movimientos:
            external_id = str(mov.get("id", "")) or None
            try:
                importe = Decimal(str(mov.get("amount", "0")))
            except Exception:
                omitidas += 1
                continue

            if importe == 0:
                omitidas += 1
                continue

            direccion = "ingreso" if importe > 0 else "gasto"
            importe_abs = abs(importe)

            fecha_str = mov.get("made_on", "")
            try:
                fecha = date.fromisoformat(fecha_str)
            except ValueError:
                omitidas += 1
                continue

            desc = (
                mov.get("extra", {}).get("payee")
                or mov.get("description")
                or ""
            ).strip()

            if external_id:
                ya_existe_ingreso = await db.scalar(
                    select(func.count(Ingreso.id)).where(Ingreso.external_id == external_id)
                ) or 0
                ya_existe_gasto = await db.scalar(
                    select(func.count(Gasto.id)).where(Gasto.external_id == external_id)
                ) or 0
                es_duplicado = (ya_existe_ingreso + ya_existe_gasto) > 0
            else:
                if direccion == "ingreso":
                    es_duplicado = (await db.scalar(
                        select(func.count(Ingreso.id)).where(
                            Ingreso.fecha == fecha,
                            Ingreso.importe == importe_abs,
                            Ingreso.descripcion == desc,
                        )
                    ) or 0) > 0
                else:
                    es_duplicado = (await db.scalar(
                        select(func.count(Gasto.id)).where(
                            Gasto.fecha == fecha,
                            Gasto.importe == importe_abs,
                            Gasto.descripcion == desc,
                        )
                    ) or 0) > 0

            cat_id = _categoria_para(desc, importe_abs)

            transacciones.append(TransaccionPreview(
                indice=indice,
                fecha=fecha,
                descripcion=desc,
                importe=importe_abs,
                tipo=direccion,
                categoria_id=cat_id,
                es_duplicado=es_duplicado,
                es_posible_suscripcion=_es_posible_suscripcion(desc),
                external_id=external_id,
            ))
            indice += 1

        siguiente_id = meta.get("next_id")
        if not siguiente_id:
            break

    return PreviewResponse(transacciones=transacciones, omitidas=omitidas)
