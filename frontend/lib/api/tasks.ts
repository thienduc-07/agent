import { apiClient } from "./client";
import { ApiTask, CreateTaskRequest, TaskCancelResponse, ApiTaskStep, ApiEvent } from "@/types/api";

export interface ListTasksParams {
  status?: string;
  agent_id?: string;
  limit?: number;
  offset?: number;
}

export async function createTask(data: CreateTaskRequest): Promise<ApiTask> {
  return apiClient<ApiTask>("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTasks(params?: ListTasksParams): Promise<ApiTask[]> {
  return apiClient<ApiTask[]>("/api/v1/tasks", {
    params: params as Record<string, string | number | undefined>,
  });
}

export async function getTaskById(taskId: string): Promise<ApiTask> {
  return apiClient<ApiTask>(`/api/v1/tasks/${taskId}`);
}

export async function getTaskSteps(taskId: string): Promise<ApiTaskStep[]> {
  return apiClient<ApiTaskStep[]>(`/api/v1/tasks/${taskId}/steps`);
}

export async function cancelTask(taskId: string): Promise<TaskCancelResponse> {
  return apiClient<TaskCancelResponse>(`/api/v1/tasks/${taskId}/cancel`, {
    method: "POST",
  });
}

export async function getTaskEvents(taskId: string): Promise<ApiEvent[]> {
  return apiClient<ApiEvent[]>(`/api/v1/tasks/${taskId}/events`);
}
