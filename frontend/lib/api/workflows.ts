import { apiClient } from "./client";
import { Workflow, CreateWorkflowRequest, Subtask, AgentDefinitionItem } from "@/types/api";

export async function createWorkflow(data: CreateWorkflowRequest): Promise<Workflow> {
  return apiClient<Workflow>("/api/v1/workflows", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getWorkflow(workflowId: string): Promise<Workflow> {
  return apiClient<Workflow>(`/api/v1/workflows/${workflowId}`);
}

export async function listWorkflows(status?: string): Promise<Workflow[]> {
  return apiClient<Workflow[]>("/api/v1/workflows", {
    params: status ? { status } : undefined,
  });
}

export async function getWorkflowSubtasks(workflowId: string): Promise<Subtask[]> {
  return apiClient<Subtask[]>(`/api/v1/workflows/${workflowId}/subtasks`);
}

export async function cancelWorkflow(workflowId: string): Promise<Workflow> {
  return apiClient<Workflow>(`/api/v1/workflows/${workflowId}/cancel`, {
    method: "POST",
  });
}

export async function listAgentDefinitions(): Promise<AgentDefinitionItem[]> {
  return apiClient<AgentDefinitionItem[]>("/api/v1/agents/registry");
}
