import { apiClient } from "./client";
import { Memory, MemorySearchResponse, MemoryOverviewStats } from "@/types/memory";

export interface SearchMemoriesParams {
  query?: string;
  scope_type?: string;
  scope_id?: string;
  owner_agent_id?: string;
  memory_type?: string;
  status?: string;
  caller_agent_id?: string;
  limit?: number;
  offset?: number;
}

export async function fetchMemoryOverviewStats(): Promise<MemoryOverviewStats> {
  return apiClient<MemoryOverviewStats>("/api/v1/memories/stats/overview");
}

export async function searchMemories(params?: SearchMemoriesParams): Promise<MemorySearchResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.query) queryParams.query = params.query;
  if (params?.scope_type) queryParams.scope_type = params.scope_type;
  if (params?.scope_id) queryParams.scope_id = params.scope_id;
  if (params?.owner_agent_id) queryParams.owner_agent_id = params.owner_agent_id;
  if (params?.memory_type) queryParams.memory_type = params.memory_type;
  if (params?.status) queryParams.status = params.status;
  if (params?.caller_agent_id) queryParams.caller_agent_id = params.caller_agent_id;
  if (params?.limit !== undefined) queryParams.limit = String(params.limit);
  if (params?.offset !== undefined) queryParams.offset = String(params.offset);

  return apiClient<MemorySearchResponse>("/api/v1/memories", {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });
}

export async function fetchMemoryById(memoryId: string): Promise<Memory> {
  return apiClient<Memory>(`/api/v1/memories/${memoryId}`);
}

export async function approveMemory(memoryId: string): Promise<Memory> {
  return apiClient<Memory>(`/api/v1/memories/${memoryId}/approve`, {
    method: "POST",
  });
}

export async function rejectMemory(memoryId: string, reason?: string): Promise<Memory> {
  return apiClient<Memory>(`/api/v1/memories/${memoryId}/reject`, {
    method: "POST",
    params: reason ? { reason } : undefined,
  });
}

export async function archiveMemory(memoryId: string, reason?: string): Promise<Memory> {
  return apiClient<Memory>(`/api/v1/memories/${memoryId}/archive`, {
    method: "POST",
    params: reason ? { reason } : undefined,
  });
}

export async function createMemory(payload: {
  title: string;
  content: string;
  summary?: string;
  memory_type?: string;
  scope_type?: string;
  confidence?: number;
}): Promise<Memory> {
  return apiClient<Memory>("/api/v1/memories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
