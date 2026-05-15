import os
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()


def obtener_conexion():
    url = os.getenv("DATABASE_URL", "")
    parsed = urlparse(url)
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        dbname=parsed.path.lstrip("/"),
        user=parsed.username,
        password=parsed.password,
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


@contextmanager
def cursor_db():
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cur:
            yield cur
        conexion.commit()
    except Exception:
        conexion.rollback()
        raise
    finally:
        conexion.close()
