"""cuentas banco y external_id en ingresos gastos

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cuentas_banco",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("institution_id", sa.String(100), nullable=False),
        sa.Column("institution_name", sa.String(200), nullable=False),
        sa.Column("requisition_id", sa.String(100), nullable=False, unique=True),
        sa.Column("account_ids", sa.Text, nullable=False),
        sa.Column("access_token", sa.Text, nullable=True),
        sa.Column("refresh_token", sa.Text, nullable=True),
        sa.Column("access_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.execute("ALTER TABLE ingresos ADD COLUMN IF NOT EXISTS external_id VARCHAR(200) UNIQUE")
    op.execute("ALTER TABLE gastos ADD COLUMN IF NOT EXISTS external_id VARCHAR(200) UNIQUE")


def downgrade() -> None:
    op.execute("ALTER TABLE ingresos DROP COLUMN IF EXISTS external_id")
    op.execute("ALTER TABLE gastos DROP COLUMN IF EXISTS external_id")
    op.drop_table("cuentas_banco")
