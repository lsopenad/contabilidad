from typing import Optional
from .db import cursor_db


def listar_categorias(tipo: Optional[str] = None) -> list[dict]:
    sql = "SELECT id, nombre, tipo FROM categorias WHERE 1=1"
    params = []
    if tipo:
        sql += " AND tipo IN ('ambos', %s)"
        params.append(tipo)
    sql += " ORDER BY nombre"
    with cursor_db() as cur:
        cur.execute(sql, params)
        return [dict(f) for f in cur.fetchall()]


def crear_categoria(nombre: str, tipo: str) -> dict:
    with cursor_db() as cur:
        cur.execute(
            "INSERT INTO categorias (nombre, tipo) VALUES (%s, %s) RETURNING *",
            (nombre, tipo),
        )
        return dict(cur.fetchone())


def actualizar_categoria(id_cat: int, nombre: str, tipo: str) -> bool:
    with cursor_db() as cur:
        cur.execute(
            "UPDATE categorias SET nombre=%s, tipo=%s WHERE id=%s",
            (nombre, tipo, id_cat),
        )
        return cur.rowcount > 0


def eliminar_categoria(id_cat: int) -> bool:
    with cursor_db() as cur:
        cur.execute("DELETE FROM categorias WHERE id = %s", (id_cat,))
        return cur.rowcount > 0
