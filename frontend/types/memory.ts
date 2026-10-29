export interface Memory {
  id: string;
  memory_type: 'working' | 'task' | 'agent' | 'shared';
  scope_type: 'working' | 'task' | 'agent' | 'shared' | 'workspace';
  scope_id?: string | null;
  owner_agent_id?: string | null;
  title: string;
  content: string;
  summary?: string | null;
  source_type: string;
  source_id?: string | null;
  source_task_id?: string | null;
  confidence: number;
  verification_status: 'unverified' | 'verified' | 'rejected' | string;
  sensitivity_level?: string;
  status: 'candidate' | 'active' | 'archived' | 'expired' | 'rejected' | 'deleted' | string;
  expires_at?: string | null;
  last_accessed_at?: string | null;
  access_count: number;
  metadata?: Record<string, any>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MemorySearchResultItem {
  memory: Memory;
  relevance_score: number;
}

export interface MemorySearchResponse {
  total: number;
  items: MemorySearchResultItem[];
}

export interface MemoryOverviewStats {
  total_active: number;
  total_candidate: number;
  total_archived: number;
  total_expired: number;
  by_scope: Record<string, number>;
  by_type: Record<string, number>;
  recent_memories: Memory[];
}
