"""añadir transaction_id a ingresos y gastos para dedup de importación CSV

Revision ID: 0012
Revises: 0011
Create Date: 2026-05-19
"""
import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ingresos", sa.Column("transaction_id", sa.String(36), nullable=True))
    op.create_unique_constraint("uq_ingresos_transaction_id", "ingresos", ["transaction_id"])
    op.create_index("ix_ingresos_transaction_id", "ingresos", ["transaction_id"])

    op.add_column("gastos", sa.Column("transaction_id", sa.String(36), nullable=True))
    op.create_unique_constraint("uq_gastos_transaction_id", "gastos", ["transaction_id"])
    op.create_index("ix_gastos_transaction_id", "gastos", ["transaction_id"])


def downgrade() -> None:
    op.drop_index("ix_gastos_transaction_id", table_name="gastos")
    op.drop_constraint("uq_gastos_transaction_id", "gastos", type_="unique")
    op.drop_column("gastos", "transaction_id")

    op.drop_index("ix_ingresos_transaction_id", table_name="ingresos")
    op.drop_constraint("uq_ingresos_transaction_id", "ingresos", type_="unique")
    op.drop_column("ingresos", "transaction_id")
