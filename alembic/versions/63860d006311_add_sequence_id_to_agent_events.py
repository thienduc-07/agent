"""add_sequence_id_to_agent_events

Revision ID: 63860d006311
Revises: 8eefbf89f222
Create Date: 2026-10-29 00:16:17.539314

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63860d006311'
down_revision: Union[str, Sequence[str], None] = '8eefbf89f222'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('agent_events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sequence_id', sa.Integer(), nullable=True))
        batch_op.create_index('ix_agent_events_sequence_id', ['sequence_id'], unique=False)
    
    # Backfill existing events with their rowid so historical events have sequence_id
    op.execute("UPDATE agent_events SET sequence_id = rowid WHERE sequence_id IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('agent_events', schema=None) as batch_op:
        batch_op.drop_index('ix_agent_events_sequence_id')
        batch_op.drop_column('sequence_id')
