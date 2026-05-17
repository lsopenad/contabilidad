"""añadir fecha_fin a suscripciones para historial al desactivar

Revision ID: 0010
Revises: 0007
Create Date: 2026-05-17
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("suscripciones", sa.Column("fecha_fin", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("suscripciones", "fecha_fin")
