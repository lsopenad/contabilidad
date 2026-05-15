"""eliminar_tablas_huerfanas

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-15
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS facturas")
    op.execute("DROP TABLE IF EXISTS clientes")


def downgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS clientes (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(200) NOT NULL,
            nif VARCHAR(20),
            email VARCHAR(200),
            direccion TEXT,
            creado_en TIMESTAMP DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS facturas (
            id SERIAL PRIMARY KEY,
            numero VARCHAR(50) UNIQUE NOT NULL,
            cliente_id INTEGER REFERENCES clientes(id),
            importe_base DECIMAL(10,2) NOT NULL CHECK (importe_base > 0),
            iva_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 21.00,
            importe_total DECIMAL(10,2) NOT NULL,
            fecha DATE NOT NULL DEFAULT CURRENT_DATE,
            estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
            descripcion TEXT,
            creado_en TIMESTAMP DEFAULT NOW()
        )
    """)
