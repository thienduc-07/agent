"""create_memories_and_citations_tables

Revision ID: 9c2d1e4b8a7f
Revises: 7a82b9e1c304
Create Date: 2026-10-29 01:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '9c2d1e4b8a7f'
down_revision: Union[str, Sequence[str], None] = '7a82b9e1c304'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create memories table
    op.create_table(
        'memories',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('memory_type', sa.String(length=32), nullable=False, server_default='task'),
        sa.Column('scope_type', sa.String(length=32), nullable=False, server_default='shared'),
        sa.Column('scope_id', sa.String(length=64), nullable=True),
        sa.Column('owner_agent_id', sa.String(length=64), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('source_type', sa.String(length=64), nullable=False, server_default='task_execution'),
        sa.Column('source_id', sa.String(length=255), nullable=True),
        sa.Column('source_task_id', sa.String(length=36), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('verification_status', sa.String(length=32), nullable=False, server_default='unverified'),
        sa.Column('sensitivity_level', sa.String(length=32), nullable=False, server_default='normal'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='candidate'),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.Column('access_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['source_task_id'], ['tasks.id'], ondelete='SET NULL'),
    )

    op.create_index('ix_memories_status_scope', 'memories', ['status', 'scope_type', 'scope_id'])
    op.create_index('ix_memories_owner_status', 'memories', ['owner_agent_id', 'status'])
    op.create_index('ix_memories_type_status', 'memories', ['memory_type', 'status'])
    op.create_index('ix_memories_source_task', 'memories', ['source_task_id'])
    op.create_index('ix_memories_created_at', 'memories', ['created_at'])

    # 2. Create memory_citations table
    op.create_table(
        'memory_citations',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('memory_id', sa.String(length=36), nullable=False),
        sa.Column('task_id', sa.String(length=36), nullable=True),
        sa.Column('agent_id', sa.String(length=64), nullable=False),
        sa.Column('relevance_score', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['memory_id'], ['memories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='SET NULL'),
    )

    op.create_index('ix_memory_citations_memory_id', 'memory_citations', ['memory_id'])
    op.create_index('ix_memory_citations_task_id', 'memory_citations', ['task_id'])


def downgrade() -> None:
    op.drop_table('memory_citations')
    op.drop_table('memories')
