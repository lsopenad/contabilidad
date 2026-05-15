"""repeticion_mensual

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-15
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0005"
down_revision: Union[str, Sequence[str], None] = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE ingresos ADD COLUMN IF NOT EXISTS repeticion_id VARCHAR(36)")
    op.execute("ALTER TABLE gastos ADD COLUMN IF NOT EXISTS repeticion_id VARCHAR(36)")
    op.execute("ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS repeticion_id VARCHAR(36)")
    op.execute("ALTER TABLE grupos_presupuesto ADD COLUMN IF NOT EXISTS repeticion_id VARCHAR(36)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ingresos_repeticion_id ON ingresos(repeticion_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_gastos_repeticion_id ON gastos(repeticion_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_presupuestos_repeticion_id ON presupuestos(repeticion_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_grupos_presupuesto_repeticion_id ON grupos_presupuesto(repeticion_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_ingresos_repeticion_id")
    op.execute("DROP INDEX IF EXISTS ix_gastos_repeticion_id")
    op.execute("DROP INDEX IF EXISTS ix_presupuestos_repeticion_id")
    op.execute("DROP INDEX IF EXISTS ix_grupos_presupuesto_repeticion_id")
    op.execute("ALTER TABLE ingresos DROP COLUMN IF EXISTS repeticion_id")
    op.execute("ALTER TABLE gastos DROP COLUMN IF EXISTS repeticion_id")
    op.execute("ALTER TABLE presupuestos DROP COLUMN IF EXISTS repeticion_id")
    op.execute("ALTER TABLE grupos_presupuesto DROP COLUMN IF EXISTS repeticion_id")
