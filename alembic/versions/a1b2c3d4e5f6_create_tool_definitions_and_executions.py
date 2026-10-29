"""create_tool_definitions_and_executions
 
Revision ID: a1b2c3d4e5f6
Revises: 9c2d1e4b8a7f
Create Date: 2026-10-29 01:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9c2d1e4b8a7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create tool_definitions table
    op.create_table(
        'tool_definitions',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('display_name', sa.String(length=128), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('version', sa.String(length=32), nullable=False, server_default='1.0.0'),
        sa.Column('category', sa.String(length=32), nullable=False),
        sa.Column('permission_level', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('side_effect_level', sa.String(length=32), nullable=False, server_default='read_only'),
        sa.Column('requires_approval', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('is_healthy', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('rate_limit', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('execution_timeout', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('max_output_size', sa.Integer(), nullable=False, server_default='100000'),
        sa.Column('input_schema', sa.JSON(), nullable=False),
        sa.Column('output_schema', sa.JSON(), nullable=False),
        sa.Column('config', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_tool_definitions_name', 'tool_definitions', ['name'], unique=True)
    op.create_index('ix_tool_definitions_category', 'tool_definitions', ['category'], unique=False)
    op.create_index('ix_tool_definitions_is_enabled', 'tool_definitions', ['is_enabled'], unique=False)
    op.create_index('ix_tool_defs_category_enabled', 'tool_definitions', ['category', 'is_enabled'], unique=False)

    # 2. Create tool_executions table
    op.create_table(
        'tool_executions',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tool_name', sa.String(length=64), nullable=False),
        sa.Column('task_id', sa.String(length=64), nullable=True),
        sa.Column('agent_id', sa.String(length=64), nullable=True),
        sa.Column('approval_id', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='succeeded'),
        sa.Column('arguments', sa.JSON(), nullable=False),
        sa.Column('output_summary', sa.Text(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('artifact_ids', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approval_id'], ['approvals.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_tool_executions_tool_name', 'tool_executions', ['tool_name'], unique=False)
    op.create_index('ix_tool_executions_task_id', 'tool_executions', ['task_id'], unique=False)
    op.create_index('ix_tool_executions_agent_id', 'tool_executions', ['agent_id'], unique=False)
    op.create_index('ix_tool_executions_status', 'tool_executions', ['status'], unique=False)
    op.create_index('ix_tool_executions_created_at', 'tool_executions', ['created_at'], unique=False)
    op.create_index('ix_tool_exec_task_created', 'tool_executions', ['task_id', 'created_at'], unique=False)
    op.create_index('ix_tool_exec_name_status', 'tool_executions', ['tool_name', 'status'], unique=False)


def downgrade() -> None:
    op.drop_table('tool_executions')
    op.drop_table('tool_definitions')
