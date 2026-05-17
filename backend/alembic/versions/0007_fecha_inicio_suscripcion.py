"""fecha inicio suscripcion

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-17
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS fecha_inicio DATE")

def downgrade() -> None:
    op.execute("ALTER TABLE suscripciones DROP COLUMN IF EXISTS fecha_inicio")
