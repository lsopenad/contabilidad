"""salt edge: reemplazar gocardless en cuentas_banco + tabla configuracion_app

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-17
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "configuracion_app",
        sa.Column("clave", sa.String(100), primary_key=True),
        sa.Column("valor", sa.Text, nullable=True),
    )
    op.drop_table("cuentas_banco")
    op.create_table(
        "cuentas_banco",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("connection_id", sa.String(100), nullable=False, unique=True),
        sa.Column("provider_code", sa.String(100), nullable=False),
        sa.Column("provider_name", sa.String(200), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("cuentas_banco")
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
    op.drop_table("configuracion_app")
