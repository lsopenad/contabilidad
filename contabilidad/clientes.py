from typing import Optional
from .db import cursor_db


def listar_clientes() -> list[dict]:
    with cursor_db() as cur:
        cur.execute("SELECT id, nombre, nif, email FROM clientes ORDER BY nombre")
        return [dict(f) for f in cur.fetchall()]


def crear_cliente(nombre: str, nif: Optional[str], email: Optional[str], direccion: Optional[str]) -> dict:
    with cursor_db() as cur:
        cur.execute(
            "INSERT INTO clientes (nombre, nif, email, direccion) VALUES (%s, %s, %s, %s) RETURNING *",
            (nombre, nif, email, direccion),
        )
        return dict(cur.fetchone())
