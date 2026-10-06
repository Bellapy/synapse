"""create query_history

Revision ID: 0001
Revises:
Create Date: 2026-10-06
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "query_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("query", sa.String(), nullable=False),
        sa.Column("expansion_type", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_query_history_id", "query_history", ["id"])
    op.create_index("ix_query_history_query", "query_history", ["query"])


def downgrade() -> None:
    op.drop_index("ix_query_history_query", table_name="query_history")
    op.drop_index("ix_query_history_id", table_name="query_history")
    op.drop_table("query_history")
