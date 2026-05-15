"""agregar_grupos_presupuesto

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-15
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0004"
down_revision: Union[str, Sequence[str], None] = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS grupos_presupuesto (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            importe DECIMAL(10,2) NOT NULL CHECK (importe > 0),
            mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
            anio INTEGER NOT NULL,
            creado_en TIMESTAMP DEFAULT NOW(),
            UNIQUE(nombre, mes, anio)
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS grupo_categorias (
            grupo_id INTEGER REFERENCES grupos_presupuesto(id) ON DELETE CASCADE,
            categoria_id INTEGER REFERENCES categorias(id) ON DELETE CASCADE,
            PRIMARY KEY (grupo_id, categoria_id)
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS grupo_categorias")
    op.execute("DROP TABLE IF EXISTS grupos_presupuesto")
