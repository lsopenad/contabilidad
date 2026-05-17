"""eliminar categoria_id de suscripciones

Revision ID: 0011
Revises: 0010
Create Date: 2026-05-17
"""
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("suscripciones", "categoria_id")


def downgrade() -> None:
    import sqlalchemy as sa
    op.add_column("suscripciones", sa.Column("categoria_id", sa.Integer(), sa.ForeignKey("categorias.id"), nullable=True))
