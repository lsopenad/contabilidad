"""agregar_suscripciones

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-15
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS suscripciones (
            id          SERIAL PRIMARY KEY,
            nombre      VARCHAR(100) NOT NULL,
            importe     DECIMAL(10,2) NOT NULL CHECK (importe > 0),
            categoria_id INTEGER REFERENCES categorias(id),
            dia_cobro   INTEGER CHECK (dia_cobro BETWEEN 1 AND 31),
            activa      BOOLEAN NOT NULL DEFAULT true,
            notas       TEXT,
            creado_en   TIMESTAMP DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS suscripciones")
