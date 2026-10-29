export type ToolCategory = 'workspace' | 'artifact' | 'data' | 'web' | 'api' | 'memory';

export type ToolPermissionLevel = 0 | 1 | 2;

export interface ToolDefinition {
  name: string;
  display_name: string;
  description: string;
  version: string;
  category: ToolCategory;
  permission_level: ToolPermissionLevel;
  side_effect_level: string;
  requires_approval: boolean;
  is_enabled: boolean;
  is_healthy: boolean;
  rate_limit: number;
  execution_timeout: number;
  max_output_size: number;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ToolExecutionRecord {
  id: string;
  tool_name: string;
  task_id?: string | null;
  agent_id?: string | null;
  approval_id?: string | null;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'timed_out' | 'cancelled' | 'awaiting_approval' | 'denied';
  arguments: Record<string, any>;
  output_summary?: string | null;
  error?: string | null;
  duration_ms: number;
  artifact_ids: string[];
  created_at: string;
}

export interface ToolTestResult {
  success: boolean;
  output: string;
  data?: Record<string, any>;
  error?: string | null;
  duration_ms: number;
  artifact_ids: string[];
}
