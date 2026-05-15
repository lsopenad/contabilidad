"""frecuencia suscripcion

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-15
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0006"
down_revision: Union[str, Sequence[str], None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS frecuencia VARCHAR(20) NOT NULL DEFAULT 'mensual'"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE suscripciones DROP COLUMN IF EXISTS frecuencia")
