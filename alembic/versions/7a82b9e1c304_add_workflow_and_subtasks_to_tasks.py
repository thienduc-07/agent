"""add_workflow_and_subtasks_to_tasks

Revision ID: 7a82b9e1c304
Revises: 63860d006311
Create Date: 2026-10-29 01:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = '7a82b9e1c304'
down_revision: Union[str, Sequence[str], None] = '63860d006311'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to support Multi-Agent Workflows and Subtasks."""
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('parent_task_id', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('task_type', sa.String(length=32), nullable=False, server_default='single'))
        batch_op.add_column(sa.Column('agent_type', sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column('dependencies_json', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('input_data_json', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('output_data_json', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('max_retries', sa.Integer(), nullable=False, server_default='2'))
        
        batch_op.create_index('ix_tasks_parent_task_id', ['parent_task_id'], unique=False)
        batch_op.create_index('ix_tasks_task_type', ['task_type'], unique=False)
        batch_op.create_foreign_key(
            'fk_tasks_parent_task_id',
            'tasks',
            ['parent_task_id'],
            ['id'],
            ondelete='CASCADE'
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_constraint('fk_tasks_parent_task_id', type_='foreignkey')
        batch_op.drop_index('ix_tasks_task_type')
        batch_op.drop_index('ix_tasks_parent_task_id')
        batch_op.drop_column('max_retries')
        batch_op.drop_column('retry_count')
        batch_op.drop_column('output_data_json')
        batch_op.drop_column('input_data_json')
        batch_op.drop_column('dependencies_json')
        batch_op.drop_column('agent_type')
        batch_op.drop_column('task_type')
        batch_op.drop_column('parent_task_id')
